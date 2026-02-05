import { createSoapTest } from "../../src/runners/index.js";
import { getEnv, getEnvNumber } from "../../src/config/env-loader.js";

const test = createSoapTest("smoke", {
  smoke: {
    executor: "constant-vus",
    vus: getEnvNumber("SMOKE_VUS"),
    duration: getEnv("SMOKE_DURATION"),
  },
});

export const options = test.options;
export const setup = test.setup;
export default test.default;
export const teardown = test.teardown;
