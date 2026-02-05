import { sleep } from 'k6';
import { getEnv, getEnvNumber } from "../../src/config/env-loader.js";
import { getEnvironment } from "../../src/config/environments.js";
import { getThresholds } from "../../src/config/thresholds.js";
import { buildStages } from "../../src/config/stage-builder.js";
import { createTrafficMonitoringClient } from "../../src/clients/traffic-monitoring-client.js";

const ENV = getEnv("ENVIRONMENT");
const environment = getEnvironment(ENV);
const client = createTrafficMonitoringClient(environment);

export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-arrival-rate',
      startRate: getEnvNumber('TRAFFIC_LOAD_START_RATE'),
      timeUnit: getEnv('TRAFFIC_LOAD_TIME_UNIT'),
      preAllocatedVUs: getEnvNumber('TRAFFIC_LOAD_PRE_VUS'),
      maxVUs: getEnvNumber('TRAFFIC_LOAD_MAX_VUS'),
      stages: buildStages("TRAFFIC_LOAD", { defaultTarget: getEnvNumber("TRAFFIC_LOAD_TARGET_RPS") }),
    },
  },
  thresholds: getThresholds("load"),
};

export function setup() {
  console.log(`[Traffic Monitoring Load Test] Environment: ${ENV}`);
  console.log(`[Traffic Monitoring] Target RPS: ${getEnvNumber('TRAFFIC_LOAD_TARGET_RPS')}`);
  console.log(`[Traffic Monitoring] Max VUs: ${getEnvNumber('TRAFFIC_LOAD_MAX_VUS')}`);
  return { environment };
}

export default function () {
  if (!client.token) client.authenticate();

  const response = client.getDataDomain();

  if (client.handleUnauthorized(response)) {
    client.getDataDomain();
  }

  sleep(getEnvNumber("TRAFFIC_LOAD_SLEEP"));
}

export function teardown() {
  console.log('[Traffic Monitoring Load Test] Completed');
}
