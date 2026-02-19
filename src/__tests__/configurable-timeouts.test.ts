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

const dueDate = new Date("2025-03-12");

describe("Configurable timeouts", () => {
  it("custom timeout overrides default", () => {
    const instance = createInstance(dueDate, {
      timeouts: { GRACE: 14 },
    });
    const dueSoon = tick(instance, new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;
    const grace = tick(overdue, businessDaysAfter(dueDate, 3)).state;

    // Default GRACE→REMINDER_1 is 7bd, custom is 14bd
    const atSevenBd = businessDaysAfter(grace.stateEnteredAt, 7);
    const stillGrace = tick(grace, atSevenBd);
    expect(stillGrace.state.status).toBe("GRACE");

    const atFourteenBd = businessDaysAfter(grace.stateEnteredAt, 14);
    const result = tick(grace, atFourteenBd);
    expect(result.state.status).toBe("REMINDER_1");
  });

  it("default timeouts used when no custom config", () => {
    const instance = createInstance(dueDate);
    const dueSoon = tick(instance, new Date("2025-03-03")).state;
    const overdue = tick(dueSoon, dueDate).state;
    const grace = tick(overdue, businessDaysAfter(dueDate, 3)).state;

    // Default GRACE→REMINDER_1 is 7bd
    const atSevenBd = businessDaysAfter(grace.stateEnteredAt, 7);
    const result = tick(grace, atSevenBd);
    expect(result.state.status).toBe("REMINDER_1");
  });
});
