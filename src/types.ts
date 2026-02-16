// ── States ──────────────────────────────────────────────────────────

export type DunningState =
  | "ISSUED"
  | "DUE_SOON"
  | "OVERDUE"
  | "GRACE"
  | "REMINDER_1"
  | "REMINDER_2"
  | "FINAL_NOTICE"
  | "SUSPENDED"
  | "WRITTEN_OFF"
  | "PAID"
  | "PAUSED"
  | "CANCELLED";

// ── Events ──────────────────────────────────────────────────────────

export type DunningEventType =
  | "DAY_PASSED"
  | "PAYMENT_RECEIVED"
  | "INVOICE_CANCELLED"
  | "DUNNING_PAUSED"
  | "DUNNING_RESUMED"
  | "MANUAL_ADVANCE";

export interface DunningEvent {
  type: DunningEventType;
  timestamp: Date;
}

// ── Actions ─────────────────────────────────────────────────────────

export type ActionType = "SEND_EMAIL" | "SUSPEND_SERVICE" | "RESUME_SERVICE";

export interface ActionDescriptor {
  type: ActionType;
  template?: string;
}

// ── Configuration ───────────────────────────────────────────────────

export interface DunningConfig {
  timeouts: Partial<Record<DunningState, number>>;
  holidays: Date[];
}

// ── Dunning Instance ────────────────────────────────────────────────

export interface DunningInstance {
  invoiceId: string;
  dueDate: Date;
  state: DunningState;
  stateEnteredAt: Date;
  config: DunningConfig;
  pausedFrom?: DunningState;
  pausedElapsed?: number;
}

// ── Transition Result ───────────────────────────────────────────────

export interface TransitionResult {
  newState: DunningState;
  actions: ActionDescriptor[];
}
