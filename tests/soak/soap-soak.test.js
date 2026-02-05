import { createSoapTest } from "../../src/runners/index.js";
import { getEnv, getEnvNumber } from "../../src/config/env-loader.js";

const test = createSoapTest("soak", {
  soak: {
    executor: "constant-vus",
    vus: getEnvNumber("SOAK_VUS"),
    duration: getEnv("SOAK_DURATION"),
    gracefulStop: getEnv("SOAK_GRACEFUL_STOP"),
  },
});

export const options = test.options;
export const setup = test.setup;
export default test.default;
export const teardown = test.teardown;
