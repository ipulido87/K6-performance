import { createSoapTest } from "../../src/runners/index.js";
import { buildStages } from "../../src/config/stage-builder.js";
import { getEnv, getEnvNumber } from "../../src/config/env-loader.js";

const test = createSoapTest("stress", {
  stress: {
    executor: "ramping-arrival-rate",
    startRate: getEnvNumber("STRESS_START_RPS"),
    timeUnit: getEnv("STRESS_TIME_UNIT"),
    preAllocatedVUs: getEnvNumber("STRESS_PRE_VUS"),
    maxVUs: getEnvNumber("STRESS_MAX_VUS"),
    stages: buildStages("STRESS"),
    gracefulStop: getEnv("STRESS_GRACEFUL_STOP"),
  },
}, { timeoutKey: "STRESS_TIMEOUT" });

export const options = test.options;
export const setup = test.setup;
export default test.default;
export const teardown = test.teardown;
