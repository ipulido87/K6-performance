import { sleep } from 'k6';
import { getEnv, getEnvNumber } from "../../src/config/env-loader.js";
import { getEnvironment } from "../../src/config/environments.js";
import { getThresholds } from "../../src/config/thresholds.js";
import { createTrafficMonitoringClient } from "../../src/clients/traffic-monitoring-client.js";

export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-arrival-rate',
      startRate: getEnvNumber('TRAFFIC_LOAD_START_RATE'),
      timeUnit: getEnv('TRAFFIC_LOAD_TIME_UNIT'),
      preAllocatedVUs: getEnvNumber('TRAFFIC_LOAD_PRE_VUS'),
      maxVUs: getEnvNumber('TRAFFIC_LOAD_MAX_VUS'),
      stages: [
        { target: getEnvNumber('TRAFFIC_LOAD_TARGET_RPS'), duration: getEnv('TRAFFIC_LOAD_STAGE1_DURATION') },  // Ramp-up
        { target: getEnvNumber('TRAFFIC_LOAD_TARGET_RPS'), duration: getEnv('TRAFFIC_LOAD_STAGE2_DURATION') },  // Hold load
        { target: getEnvNumber('TRAFFIC_LOAD_STAGE3_TARGET'), duration: getEnv('TRAFFIC_LOAD_STAGE3_DURATION') },  
      ],
    },
  },
  thresholds: getThresholds("load"),
};

const ENV = getEnv("ENVIRONMENT");
const environment = getEnvironment(ENV);
const client = createTrafficMonitoringClient(environment);

export function setup() {
  console.log(`[Traffic Monitoring Load Test] Environment: ${ENV}`);
  console.log(`[Traffic Monitoring] Target RPS: ${getEnvNumber('TRAFFIC_LOAD_TARGET_RPS')}`);
  console.log(`[Traffic Monitoring] Max VUs: ${getEnvNumber('TRAFFIC_LOAD_MAX_VUS')}`);

  return { environment };
}

export default function() {

  // Initial authentication
  if (!client.token) {
    client.authenticate();
  }

  // Endpoint call
  const response = client.getDataDomain();

  // Re-auth handling
  if (client.handleUnauthorized(response)) {
    client.getDataDomain();
  }

  sleep(getEnvNumber("TRAFFIC_LOAD_SLEEP"));
}

export function teardown(data) {
  console.log('[Traffic Monitoring Load Test] Completed');
}
