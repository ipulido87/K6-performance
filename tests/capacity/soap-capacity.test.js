import { createSoapTest } from "../../src/runners/index.js";
import { buildStages } from "../../src/config/stage-builder.js";
import { getEnv, getEnvNumber } from "../../src/config/env-loader.js";

const test = createSoapTest("capacity", {
  capacity: {
    executor: "ramping-arrival-rate",
    startRate: getEnvNumber("CAPACITY_START_RPS"),
    timeUnit: getEnv("CAPACITY_TIME_UNIT"),
    preAllocatedVUs: getEnvNumber("CAPACITY_PRE_VUS"),
    maxVUs: getEnvNumber("CAPACITY_MAX_VUS"),
    stages: buildStages("CAPACITY"),
    gracefulStop: getEnv("CAPACITY_GRACEFUL_STOP"),
  },
}, { timeoutKey: "CAPACITY_TIMEOUT" });

export const options = test.options;
export const setup = test.setup;
export default test.default;
export const teardown = test.teardown;
