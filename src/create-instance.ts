import type { DunningState, DunningConfig } from "./types.js";

const DEFAULT_CONFIG: DunningConfig = {
  timeouts: {},
  holidays: [],
};

export function createInstance(
  dueDate: Date,
  config?: Partial<DunningConfig>,
): DunningState {
  return {
    status: "ISSUED",
    dueDate,
    stateEnteredAt: dueDate, // will be set properly on first tick
    config: {
      timeouts: config?.timeouts ?? DEFAULT_CONFIG.timeouts,
      holidays: config?.holidays ?? DEFAULT_CONFIG.holidays,
    },
  };
}
