import { describe, it, expect } from "vitest";
import { createInstance, process } from "../index.js";
import type { DunningState } from "../index.js";

function businessDaysAfter(from: Date, days: number): Date {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

function tick(state: DunningState, now: Date) {
  return process(state, { type: "tick" }, now);
}

describe("Happy path escalation", () => {
  // Due date: Wednesday 2025-03-12
  const dueDate = new Date("2025-03-12");

  it("ISSUED → DUE_SOON: 7 business days before due date", () => {
    const instance = createInstance(dueDate);
    expect(instance.status).toBe("ISSUED");

    // 7 business days before 2025-03-12 = 2025-03-03 (Monday)
    const sevenBdBefore = new Date("2025-03-03");
    const result = tick(instance, sevenBdBefore);

    expect(result.state.status).toBe("DUE_SOON");
    expect(result.actions).toEqual([
      { type: "send_email", template: "due_soon_reminder" },
    ]);
  });

  it("DUE_SOON → OVERDUE: due date reached", () => {
    const instance = createInstance(dueDate);
    // Advance to DUE_SOON first
    const dueSoon = tick(instance, new Date("2025-03-03")).state;

    const result = tick(dueSoon, dueDate);

    expect(result.state.status).toBe("OVERDUE");
    expect(result.actions).toEqual([]);
  });

  it("OVERDUE → GRACE: 3 business days elapsed", () => {
    const instance = createInstance(dueDate);
    const dueSoon = tick(instance, new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;

    const threeBdAfterDue = businessDaysAfter(dueDate, 3);
    const result = tick(overdue, threeBdAfterDue);

    expect(result.state.status).toBe("GRACE");
    expect(result.actions).toEqual([]);
  });

  it("GRACE → REMINDER_1: 7 business days elapsed", () => {
    const instance = createInstance(dueDate);
    const dueSoon = tick(instance, new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;
    const grace = tick(overdue, businessDaysAfter(dueDate, 3)).state;

    const sevenBdAfterGrace = businessDaysAfter(grace.stateEnteredAt, 7);
    const result = tick(grace, sevenBdAfterGrace);

    expect(result.state.status).toBe("REMINDER_1");
    expect(result.actions).toEqual([
      { type: "send_email", template: "first_reminder" },
    ]);
  });

  it("REMINDER_1 → REMINDER_2: 14 business days elapsed", () => {
    const instance = createInstance(dueDate);
    const dueSoon = tick(instance, new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;
    const grace = tick(overdue, businessDaysAfter(dueDate, 3)).state;
    const rem1 = tick(grace, businessDaysAfter(grace.stateEnteredAt, 7)).state;

    const fourteenBd = businessDaysAfter(rem1.stateEnteredAt, 14);
    const result = tick(rem1, fourteenBd);

    expect(result.state.status).toBe("REMINDER_2");
    expect(result.actions).toEqual([
      { type: "send_email", template: "second_reminder" },
    ]);
  });

  it("REMINDER_2 → FINAL_NOTICE: 14 business days elapsed", () => {
    const instance = createInstance(dueDate);
    const dueSoon = tick(instance, new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;
    const grace = tick(overdue, businessDaysAfter(dueDate, 3)).state;
    const rem1 = tick(grace, businessDaysAfter(grace.stateEnteredAt, 7)).state;
    const rem2 = tick(rem1, businessDaysAfter(rem1.stateEnteredAt, 14)).state;

    const fourteenBd = businessDaysAfter(rem2.stateEnteredAt, 14);
    const result = tick(rem2, fourteenBd);

    expect(result.state.status).toBe("FINAL_NOTICE");
    expect(result.actions).toEqual([
      { type: "send_email", template: "final_warning" },
    ]);
  });

  it("FINAL_NOTICE → SUSPENDED: 7 business days elapsed", () => {
    const instance = createInstance(dueDate);
    const dueSoon = tick(instance, new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;
    const grace = tick(overdue, businessDaysAfter(dueDate, 3)).state;
    const rem1 = tick(grace, businessDaysAfter(grace.stateEnteredAt, 7)).state;
    const rem2 = tick(rem1, businessDaysAfter(rem1.stateEnteredAt, 14)).state;
    const finalN = tick(rem2, businessDaysAfter(rem2.stateEnteredAt, 14)).state;

    const sevenBd = businessDaysAfter(finalN.stateEnteredAt, 7);
    const result = tick(finalN, sevenBd);

    expect(result.state.status).toBe("SUSPENDED");
    expect(result.actions).toEqual(
      expect.arrayContaining([
        { type: "suspend_service" },
        { type: "send_email", template: "service_suspended" },
      ]),
    );
  });

  it("SUSPENDED → WRITTEN_OFF: 30 business days elapsed", () => {
    const instance = createInstance(dueDate);
    const dueSoon = tick(instance, new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;
    const grace = tick(overdue, businessDaysAfter(dueDate, 3)).state;
    const rem1 = tick(grace, businessDaysAfter(grace.stateEnteredAt, 7)).state;
    const rem2 = tick(rem1, businessDaysAfter(rem1.stateEnteredAt, 14)).state;
    const finalN = tick(rem2, businessDaysAfter(rem2.stateEnteredAt, 14)).state;
    const suspended = tick(finalN, businessDaysAfter(finalN.stateEnteredAt, 7)).state;

    const thirtyBd = businessDaysAfter(suspended.stateEnteredAt, 30);
    const result = tick(suspended, thirtyBd);

    expect(result.state.status).toBe("WRITTEN_OFF");
    expect(result.actions).toEqual([
      { type: "send_email", template: "written_off_notice" },
    ]);
  });
});
