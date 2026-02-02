import { sleep } from 'k6';
import { getEnv, getEnvNumber } from "../../src/config/env-loader.js";
import { getEnvironment } from "../../src/config/environments.js";
import { getThresholds } from "../../src/config/thresholds.js";
import { createTrafficMonitoringClient } from "../../src/clients/traffic-monitoring-client.js";

export const options = {
  vus: getEnvNumber('SMOKE_VUS'),
  duration: getEnv('SMOKE_DURATION'),
  thresholds: getThresholds("smoke"),
};

const ENV = getEnv("ENVIRONMENT");
const environment = getEnvironment(ENV);

export function setup() {
  return { environment };
}

export default function(data) {
  const client = createTrafficMonitoringClient(data.environment);

  if (!client.token) {
    client.authenticate();
  }

  // Traffic Monitoring endpoint call
  const response = client.getDataDomain();

  // If we receive 401, re-authenticate and retry
  if (client.handleUnauthorized(response)) {
    client.getDataDomain();
  }

  sleep(getEnvNumber("TRAFFIC_SMOKE_SLEEP"));
}

export function teardown(data) {
  console.log('[Traffic Monitoring Smoke Test] Completed');
}
