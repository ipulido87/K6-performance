import { createSoapTest } from "../../src/runners/index.js";
import { buildStages } from "../../src/config/stage-builder.js";
import { getEnv, getEnvNumber } from "../../src/config/env-loader.js";

const test = createSoapTest("spike", {
  spike: {
    executor: "ramping-vus",
    startVUs: getEnvNumber("SPIKE_START_VUS"),
    stages: buildStages("SPIKE", { defaultTarget: getEnvNumber("SPIKE_MAX_VUS") }),
    gracefulStop: getEnv("SPIKE_GRACEFUL_STOP"),
  },
});

export const options = test.options;
export const setup = test.setup;
export default test.default;
export const teardown = test.teardown;
