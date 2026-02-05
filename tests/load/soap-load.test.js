import { createSoapTest } from "../../src/runners/index.js";
import { buildStages } from "../../src/config/stage-builder.js";
import { getEnv, getEnvNumber } from "../../src/config/env-loader.js";

const test = createSoapTest("load", {
  load: {
    executor: "ramping-arrival-rate",
    startRate: getEnvNumber("LOAD_START_RATE"),
    timeUnit: getEnv("LOAD_TIME_UNIT"),
    preAllocatedVUs: getEnvNumber("LOAD_PRE_VUS"),
    maxVUs: getEnvNumber("LOAD_MAX_VUS"),
    stages: buildStages("LOAD", { defaultTarget: getEnvNumber("LOAD_TARGET_RPS") }),
    gracefulStop: getEnv("LOAD_GRACEFUL_STOP"),
  },
});

export const options = test.options;
export const setup = test.setup;
export default test.default;
export const teardown = test.teardown;
