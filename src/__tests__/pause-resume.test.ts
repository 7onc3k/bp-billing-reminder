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

function pause(state: DunningState, now: Date) {
  return process(state, { type: "dunning_paused" }, now);
}

function resume(state: DunningState, now: Date) {
  return process(state, { type: "dunning_resumed" }, now);
}

const dueDate = new Date("2025-03-12");

describe("Pause / Resume", () => {
  it("pause from OVERDUE → PAUSED, preserves previous state", () => {
    const dueSoon = tick(createInstance(dueDate), new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;

    const result = pause(overdue, new Date("2025-03-13"));

    expect(result.state.status).toBe("PAUSED");
    expect(result.state.pausedFrom).toBe("OVERDUE");
  });

  it("pause from REMINDER_1 → PAUSED", () => {
    const dueSoon = tick(createInstance(dueDate), new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;
    const grace = tick(overdue, businessDaysAfter(dueDate, 3)).state;
    const rem1 = tick(grace, businessDaysAfter(grace.stateEnteredAt, 7)).state;

    const result = pause(rem1, businessDaysAfter(rem1.stateEnteredAt, 5));

    expect(result.state.status).toBe("PAUSED");
    expect(result.state.pausedFrom).toBe("REMINDER_1");
  });

  it("resume from PAUSED → back to previous state", () => {
    const dueSoon = tick(createInstance(dueDate), new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;
    const paused = pause(overdue, new Date("2025-03-13")).state;

    const result = resume(paused, new Date("2025-03-20"));

    expect(result.state.status).toBe("OVERDUE");
  });

  it("resume preserves elapsed time — timeout continues from where it left off", () => {
    const dueSoon = tick(createInstance(dueDate), new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;

    // Pause after 1 business day in OVERDUE (timeout is 3bd)
    const pauseTime = businessDaysAfter(overdue.stateEnteredAt, 1);
    const paused = pause(overdue, pauseTime).state;

    // Resume 10 days later
    const resumeTime = businessDaysAfter(pauseTime, 10);
    const resumed = resume(paused, resumeTime).state;

    // Should need only 2 more business days to transition (3 total - 1 elapsed)
    const twoMoreBd = businessDaysAfter(resumed.stateEnteredAt, 2);
    const result = tick(resumed, twoMoreBd);

    expect(result.state.status).toBe("GRACE");
  });

  it("payment from PAUSED → PAID (payment always takes priority)", () => {
    const dueSoon = tick(createInstance(dueDate), new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;
    const paused = pause(overdue, new Date("2025-03-13")).state;

    const result = process(paused, { type: "payment_received" }, new Date("2025-03-20"));

    expect(result.state.status).toBe("PAID");
  });

  it("cancellation from PAUSED → CANCELLED", () => {
    const dueSoon = tick(createInstance(dueDate), new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;
    const paused = pause(overdue, new Date("2025-03-13")).state;

    const result = process(paused, { type: "invoice_cancelled" }, new Date("2025-03-20"));

    expect(result.state.status).toBe("CANCELLED");
  });

  it("pause scope: ISSUED cannot be paused", () => {
    const instance = createInstance(dueDate);
    const result = pause(instance, new Date("2025-03-01"));

    expect(result.state.status).toBe("ISSUED");
    expect(result.actions).toEqual([]);
  });

  it("pause scope: DUE_SOON cannot be paused", () => {
    const dueSoon = tick(createInstance(dueDate), new Date("2025-03-03")).state;
    const result = pause(dueSoon, new Date("2025-03-05"));

    expect(result.state.status).toBe("DUE_SOON");
    expect(result.actions).toEqual([]);
  });
});
