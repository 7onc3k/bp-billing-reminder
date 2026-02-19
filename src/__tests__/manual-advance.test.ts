import { describe, it, expect } from "vitest";
import { createInstance, process } from "../index.js";
import type { DunningState } from "../index.js";

function tick(state: DunningState, now: Date) {
  return process(state, { type: "tick" }, now);
}

function advance(state: DunningState, now: Date) {
  return process(state, { type: "manual_advance" }, now);
}

const dueDate = new Date("2025-03-12");

describe("Manual advance", () => {
  it("manual advance from ISSUED → DUE_SOON with action", () => {
    const instance = createInstance(dueDate);
    const result = advance(instance, new Date("2025-03-01"));

    expect(result.state.status).toBe("DUE_SOON");
    expect(result.actions).toEqual([
      { type: "send_email", template: "due_soon_reminder" },
    ]);
  });

  it("manual advance from DUE_SOON → OVERDUE", () => {
    const dueSoon = tick(createInstance(dueDate), new Date("2025-03-03")).state;
    const result = advance(dueSoon, new Date("2025-03-05"));

    expect(result.state.status).toBe("OVERDUE");
  });

  it("manual advance from OVERDUE → GRACE", () => {
    const dueSoon = tick(createInstance(dueDate), new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;
    const result = advance(overdue, new Date("2025-03-13"));

    expect(result.state.status).toBe("GRACE");
  });

  it("manual advance from SUSPENDED → WRITTEN_OFF with action", () => {
    const dueSoon = tick(createInstance(dueDate), new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;
    // OVERDUE → GRACE → REM1 → REM2 → FINAL → SUSPENDED → WRITTEN_OFF
    const r1 = advance(overdue, new Date("2025-03-13"));  // GRACE
    const r2 = advance(r1.state, new Date("2025-03-14")); // REMINDER_1
    const r3 = advance(r2.state, new Date("2025-03-15")); // REMINDER_2
    const r4 = advance(r3.state, new Date("2025-03-16")); // FINAL_NOTICE
    const r5 = advance(r4.state, new Date("2025-03-17")); // SUSPENDED
    const r6 = advance(r5.state, new Date("2025-03-18")); // WRITTEN_OFF

    expect(r5.state.status).toBe("SUSPENDED");
    expect(r6.state.status).toBe("WRITTEN_OFF");
    expect(r6.actions).toEqual([
      { type: "send_email", template: "written_off_notice" },
    ]);
  });
});
