import type {
  DunningState,
  DunningStatus,
  DunningEvent,
  ProcessResult,
  ActionDescriptor,
} from "./types.js";
import { countBusinessDays, subtractBusinessDays } from "./business-days.js";

// Escalation sequence — the "happy path" order
const ESCALATION: DunningStatus[] = [
  "ISSUED",
  "DUE_SOON",
  "OVERDUE",
  "GRACE",
  "REMINDER_1",
  "REMINDER_2",
  "FINAL_NOTICE",
  "SUSPENDED",
  "WRITTEN_OFF",
];

// Terminal states — no transitions allowed
const TERMINAL: Set<DunningStatus> = new Set([
  "PAID",
  "WRITTEN_OFF",
  "CANCELLED",
]);

// States that can be paused (active dunning states)
const PAUSABLE: Set<DunningStatus> = new Set([
  "OVERDUE",
  "GRACE",
  "REMINDER_1",
  "REMINDER_2",
  "FINAL_NOTICE",
  "SUSPENDED",
]);

// Default timeouts in business days for each state
const DEFAULT_TIMEOUTS: Partial<Record<DunningStatus, number>> = {
  OVERDUE: 3, // OVERDUE → GRACE
  GRACE: 7, // GRACE → REMINDER_1
  REMINDER_1: 14, // REMINDER_1 → REMINDER_2
  REMINDER_2: 14, // REMINDER_2 → FINAL_NOTICE
  FINAL_NOTICE: 7, // FINAL_NOTICE → SUSPENDED
  SUSPENDED: 30, // SUSPENDED → WRITTEN_OFF
};

// Actions to emit when entering a state
function actionsForTransition(
  from: DunningStatus,
  to: DunningStatus,
): ActionDescriptor[] {
  switch (to) {
    case "DUE_SOON":
      return [{ type: "send_email", template: "due_soon_reminder" }];
    case "REMINDER_1":
      return [{ type: "send_email", template: "first_reminder" }];
    case "REMINDER_2":
      return [{ type: "send_email", template: "second_reminder" }];
    case "FINAL_NOTICE":
      return [{ type: "send_email", template: "final_warning" }];
    case "SUSPENDED":
      return [
        { type: "suspend_service" },
        { type: "send_email", template: "service_suspended" },
      ];
    case "WRITTEN_OFF":
      return [{ type: "send_email", template: "written_off_notice" }];
    default:
      return [];
  }
}

function noChange(state: DunningState): ProcessResult {
  return { state, actions: [] };
}

function transitionTo(
  state: DunningState,
  newStatus: DunningStatus,
  now: Date,
  extraActions: ActionDescriptor[] = [],
): ProcessResult {
  const actions = [
    ...extraActions,
    ...actionsForTransition(state.status, newStatus),
  ];
  return {
    state: {
      ...state,
      status: newStatus,
      stateEnteredAt: now,
      pausedFrom: undefined,
      pausedElapsed: undefined,
    },
    actions,
  };
}

function getTimeout(state: DunningState): number | undefined {
  return (
    state.config.timeouts?.[state.status] ?? DEFAULT_TIMEOUTS[state.status]
  );
}

function nextInEscalation(status: DunningStatus): DunningStatus | undefined {
  const idx = ESCALATION.indexOf(status);
  if (idx === -1 || idx === ESCALATION.length - 1) return undefined;
  return ESCALATION[idx + 1];
}

// ── Main process function ───────────────────────────────────────────

export function process(
  state: DunningState,
  event: DunningEvent,
  now: Date,
): ProcessResult {
  // Terminal states ignore everything
  if (TERMINAL.has(state.status)) {
    return noChange(state);
  }

  switch (event.type) {
    case "payment_received": {
      const extra: ActionDescriptor[] =
        state.status === "SUSPENDED" ? [{ type: "resume_service" }] : [];
      return transitionTo(state, "PAID", now, extra);
    }

    case "invoice_cancelled": {
      const extra: ActionDescriptor[] =
        state.status === "SUSPENDED" ? [{ type: "resume_service" }] : [];
      return transitionTo(state, "CANCELLED", now, extra);
    }

    case "dunning_paused": {
      if (!PAUSABLE.has(state.status)) {
        return noChange(state);
      }
      const elapsed = countBusinessDays(
        state.stateEnteredAt,
        now,
        state.config.holidays,
      );
      return {
        state: {
          ...state,
          status: "PAUSED",
          stateEnteredAt: now,
          pausedFrom: state.status,
          pausedElapsed: elapsed,
        },
        actions: [],
      };
    }

    case "dunning_resumed": {
      if (state.status !== "PAUSED" || !state.pausedFrom) {
        return noChange(state);
      }
      return {
        state: {
          ...state,
          status: state.pausedFrom,
          stateEnteredAt: now,
          // pausedFrom and pausedElapsed stay — needed for timeout calc
        },
        actions: [],
      };
    }

    case "manual_advance": {
      if (state.status === "PAUSED") return noChange(state);
      const next = nextInEscalation(state.status);
      if (!next) return noChange(state);
      return transitionTo(state, next, now);
    }

    case "tick": {
      return handleTick(state, now);
    }
  }
}

// ── Tick handler — time-based transitions ───────────────────────────

function handleTick(state: DunningState, now: Date): ProcessResult {
  const { status } = state;

  // ISSUED → DUE_SOON: special case — based on due date, not elapsed time
  if (status === "ISSUED") {
    const dueSoonDate = subtractBusinessDays(
      state.dueDate,
      7,
      state.config.holidays,
    );
    if (now >= dueSoonDate) {
      return transitionTo(state, "DUE_SOON", now);
    }
    return noChange(state);
  }

  // DUE_SOON → OVERDUE: when due date is reached
  if (status === "DUE_SOON") {
    if (now >= state.dueDate) {
      return transitionTo(state, "OVERDUE", now);
    }
    return noChange(state);
  }

  // All other time-based transitions: elapsed >= timeout
  const timeout = getTimeout(state);
  if (!timeout) return noChange(state);

  const next = nextInEscalation(status);
  if (!next) return noChange(state);

  // Account for paused elapsed time
  const elapsed = countBusinessDays(
    state.stateEnteredAt,
    now,
    state.config.holidays,
  );
  const effectiveElapsed = elapsed + (state.pausedElapsed ?? 0);

  if (effectiveElapsed >= timeout) {
    return transitionTo(state, next, now);
  }

  return noChange(state);
}
