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

function pay(state: DunningState, now: Date) {
  return process(state, { type: "payment_received" }, now);
}

const dueDate = new Date("2025-03-12");

describe("Payment (resolves dunning at any point)", () => {
  it("payment from ISSUED → PAID", () => {
    const instance = createInstance(dueDate);
    const result = pay(instance, new Date("2025-03-01"));

    expect(result.state.status).toBe("PAID");
  });

  it("payment from DUE_SOON → PAID", () => {
    const dueSoon = tick(createInstance(dueDate), new Date("2025-03-03")).state;
    const result = pay(dueSoon, new Date("2025-03-05"));

    expect(result.state.status).toBe("PAID");
  });

  it("payment from OVERDUE → PAID", () => {
    const dueSoon = tick(createInstance(dueDate), new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;
    const result = pay(overdue, new Date("2025-03-13"));

    expect(result.state.status).toBe("PAID");
  });

  it("payment from SUSPENDED → PAID with resume_service", () => {
    const instance = createInstance(dueDate);
    const dueSoon = tick(instance, new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;
    const grace = tick(overdue, businessDaysAfter(dueDate, 3)).state;
    const rem1 = tick(grace, businessDaysAfter(grace.stateEnteredAt, 7)).state;
    const rem2 = tick(rem1, businessDaysAfter(rem1.stateEnteredAt, 14)).state;
    const finalN = tick(rem2, businessDaysAfter(rem2.stateEnteredAt, 14)).state;
    const suspended = tick(finalN, businessDaysAfter(finalN.stateEnteredAt, 7)).state;

    const result = pay(suspended, businessDaysAfter(suspended.stateEnteredAt, 5));

    expect(result.state.status).toBe("PAID");
    expect(result.actions).toEqual(
      expect.arrayContaining([{ type: "resume_service" }]),
    );
  });

  it("payment from WRITTEN_OFF → no transition", () => {
    const instance = createInstance(dueDate);
    const dueSoon = tick(instance, new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;
    const grace = tick(overdue, businessDaysAfter(dueDate, 3)).state;
    const rem1 = tick(grace, businessDaysAfter(grace.stateEnteredAt, 7)).state;
    const rem2 = tick(rem1, businessDaysAfter(rem1.stateEnteredAt, 14)).state;
    const finalN = tick(rem2, businessDaysAfter(rem2.stateEnteredAt, 14)).state;
    const suspended = tick(finalN, businessDaysAfter(finalN.stateEnteredAt, 7)).state;
    const writtenOff = tick(suspended, businessDaysAfter(suspended.stateEnteredAt, 30)).state;

    const result = pay(writtenOff, new Date("2025-09-01"));

    expect(result.state.status).toBe("WRITTEN_OFF");
    expect(result.actions).toEqual([]);
  });
});

describe("Terminal states", () => {
  it("PAID ignores all events", () => {
    const paid = pay(createInstance(dueDate), new Date("2025-03-01")).state;

    const tickResult = tick(paid, new Date("2025-04-01"));
    expect(tickResult.state.status).toBe("PAID");
    expect(tickResult.actions).toEqual([]);

    const cancelResult = process(paid, { type: "invoice_cancelled" }, new Date("2025-04-01"));
    expect(cancelResult.state.status).toBe("PAID");
    expect(cancelResult.actions).toEqual([]);
  });

  it("CANCELLED ignores all events", () => {
    const cancelled = process(
      createInstance(dueDate),
      { type: "invoice_cancelled" },
      new Date("2025-03-01"),
    ).state;

    const tickResult = tick(cancelled, new Date("2025-04-01"));
    expect(tickResult.state.status).toBe("CANCELLED");
    expect(tickResult.actions).toEqual([]);

    const payResult = pay(cancelled, new Date("2025-04-01"));
    expect(payResult.state.status).toBe("CANCELLED");
    expect(payResult.actions).toEqual([]);
  });
});
