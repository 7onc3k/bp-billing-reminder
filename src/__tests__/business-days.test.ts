import { describe, it, expect } from "vitest";
import { createInstance, process } from "../index.js";
import type { DunningState } from "../index.js";

function tick(state: DunningState, now: Date) {
  return process(state, { type: "tick" }, now);
}

describe("Business days calculation", () => {
  it("weekends are excluded from timeout calculation", () => {
    // Due date: Friday 2025-03-14
    // 7 business days before = Thursday 2025-03-05
    const dueDate = new Date("2025-03-14");
    const instance = createInstance(dueDate);

    // Tuesday 2025-03-04 — 8 business days before, should NOT trigger
    const tooEarly = new Date("2025-03-04");
    const noTransition = tick(instance, tooEarly);
    expect(noTransition.state.status).toBe("ISSUED");

    // Thursday 2025-03-05 — exactly 7 business days before
    const sevenBdBefore = new Date("2025-03-05");
    const result = tick(instance, sevenBdBefore);
    expect(result.state.status).toBe("DUE_SOON");
  });

  it("public holidays are excluded from timeout calculation", () => {
    // Due date: Wednesday 2025-03-12
    // Normal: 7 business days before = Monday 2025-03-03
    // With holiday on 2025-03-03: should be Friday 2025-02-28
    const dueDate = new Date("2025-03-12");
    const instance = createInstance(dueDate, {
      holidays: [new Date("2025-03-03")],
    });

    // Monday 2025-03-03 is a holiday, so 7bd before should be Friday 2025-02-28
    const withHoliday = new Date("2025-02-28");
    const result = tick(instance, withHoliday);
    expect(result.state.status).toBe("DUE_SOON");
  });

  it("custom holiday calendar is used for business day calculations", () => {
    const dueDate = new Date("2025-03-12");
    const instance = createInstance(dueDate, {
      holidays: [new Date("2025-03-04"), new Date("2025-03-05")],
    });

    // With 2 extra holidays, 7bd before due shifts earlier
    // Normal 7bd before = 2025-03-03
    // With holidays on 3/4 and 3/5: need 2 extra days → 2025-02-27 (Thursday)
    const withHolidays = new Date("2025-02-27");
    const result = tick(instance, withHolidays);
    expect(result.state.status).toBe("DUE_SOON");
  });
});
