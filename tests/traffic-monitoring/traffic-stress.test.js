import { sleep } from 'k6';
import { getEnv, getEnvNumber } from "../../src/config/env-loader.js";
import { getEnvironment } from "../../src/config/environments.js";
import { getThresholds } from "../../src/config/thresholds.js";
import { buildStages } from "../../src/config/stage-builder.js";
import { createTrafficMonitoringClient } from "../../src/clients/traffic-monitoring-client.js";

const ENV = getEnv("ENVIRONMENT");
const environment = getEnvironment(ENV);

export const options = {
  scenarios: {
    stress_test: {
      executor: 'ramping-arrival-rate',
      startRate: getEnvNumber('TRAFFIC_STRESS_START_RPS'),
      timeUnit: getEnv('TRAFFIC_STRESS_TIME_UNIT'),
      preAllocatedVUs: getEnvNumber('TRAFFIC_STRESS_PRE_VUS'),
      maxVUs: getEnvNumber('TRAFFIC_STRESS_MAX_VUS'),
      stages: buildStages("TRAFFIC_STRESS"),
      gracefulStop: getEnv('TRAFFIC_STRESS_GRACEFUL_STOP'),
    },
  },
  thresholds: getThresholds("stress"),
};

export function setup() {
  console.log(`[Traffic Monitoring Stress Test] Environment: ${ENV}`);
  console.log(`[Traffic Monitoring] Max VUs: ${getEnvNumber('TRAFFIC_STRESS_MAX_VUS')}`);
  return { environment };
}

export default function (data) {
  const client = createTrafficMonitoringClient(data.environment);

  if (!client.token) client.authenticate();

  const response = client.getDataDomain();

  if (client.handleUnauthorized(response)) {
    client.getDataDomain();
  }

  sleep(getEnvNumber("TRAFFIC_STRESS_SLEEP"));
}

export function teardown() {
  console.log('[Traffic Monitoring Stress Test] Completed');
}
