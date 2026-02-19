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

function cancel(state: DunningState, now: Date) {
  return process(state, { type: "invoice_cancelled" }, now);
}

const dueDate = new Date("2025-03-12");

describe("Invoice cancellation", () => {
  it("cancellation from ISSUED → CANCELLED", () => {
    const instance = createInstance(dueDate);
    const result = cancel(instance, new Date("2025-03-01"));

    expect(result.state.status).toBe("CANCELLED");
  });

  it("cancellation from OVERDUE → CANCELLED", () => {
    const dueSoon = tick(createInstance(dueDate), new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;
    const result = cancel(overdue, new Date("2025-03-13"));

    expect(result.state.status).toBe("CANCELLED");
  });

  it("cancellation from SUSPENDED → CANCELLED with resume_service", () => {
    const instance = createInstance(dueDate);
    const dueSoon = tick(instance, new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;
    const grace = tick(overdue, businessDaysAfter(dueDate, 3)).state;
    const rem1 = tick(grace, businessDaysAfter(grace.stateEnteredAt, 7)).state;
    const rem2 = tick(rem1, businessDaysAfter(rem1.stateEnteredAt, 14)).state;
    const finalN = tick(rem2, businessDaysAfter(rem2.stateEnteredAt, 14)).state;
    const suspended = tick(finalN, businessDaysAfter(finalN.stateEnteredAt, 7)).state;

    const result = cancel(suspended, businessDaysAfter(suspended.stateEnteredAt, 5));

    expect(result.state.status).toBe("CANCELLED");
    expect(result.actions).toEqual(
      expect.arrayContaining([{ type: "resume_service" }]),
    );
  });

  it("cancellation from PAID → no transition", () => {
    const paid = process(
      createInstance(dueDate),
      { type: "payment_received" },
      new Date("2025-03-01"),
    ).state;

    const result = cancel(paid, new Date("2025-03-15"));

    expect(result.state.status).toBe("PAID");
    expect(result.actions).toEqual([]);
  });

  it("cancellation from WRITTEN_OFF → no transition", () => {
    const instance = createInstance(dueDate);
    const dueSoon = tick(instance, new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;
    const grace = tick(overdue, businessDaysAfter(dueDate, 3)).state;
    const rem1 = tick(grace, businessDaysAfter(grace.stateEnteredAt, 7)).state;
    const rem2 = tick(rem1, businessDaysAfter(rem1.stateEnteredAt, 14)).state;
    const finalN = tick(rem2, businessDaysAfter(rem2.stateEnteredAt, 14)).state;
    const suspended = tick(finalN, businessDaysAfter(finalN.stateEnteredAt, 7)).state;
    const writtenOff = tick(suspended, businessDaysAfter(suspended.stateEnteredAt, 30)).state;

    const result = cancel(writtenOff, new Date("2025-09-01"));

    expect(result.state.status).toBe("WRITTEN_OFF");
    expect(result.actions).toEqual([]);
  });
});
