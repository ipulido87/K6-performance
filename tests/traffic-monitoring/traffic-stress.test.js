import { sleep } from 'k6';
import { getEnv, getEnvNumber } from "../../src/config/env-loader.js";
import { getEnvironment } from "../../src/config/environments.js";
import { getThresholds } from "../../src/config/thresholds.js";
import { createTrafficMonitoringClient } from "../../src/clients/traffic-monitoring-client.js";

export const options = {
  scenarios: {
    stress_test: {
      executor: 'ramping-arrival-rate',
      startRate: getEnvNumber('TRAFFIC_STRESS_START_RPS'),
      timeUnit: getEnv('TRAFFIC_STRESS_TIME_UNIT'),
      preAllocatedVUs: getEnvNumber('TRAFFIC_STRESS_PRE_VUS'),
      maxVUs: getEnvNumber('TRAFFIC_STRESS_MAX_VUS'),
      stages: [
        { target: getEnvNumber('TRAFFIC_STRESS_STAGE1_TARGET'), duration: getEnv('TRAFFIC_STRESS_STAGE1_DURATION') },
        { target: getEnvNumber('TRAFFIC_STRESS_STAGE2_TARGET'), duration: getEnv('TRAFFIC_STRESS_STAGE2_DURATION') },
        { target: getEnvNumber('TRAFFIC_STRESS_STAGE3_TARGET'), duration: getEnv('TRAFFIC_STRESS_STAGE3_DURATION') },
        { target: getEnvNumber('TRAFFIC_STRESS_STAGE4_TARGET'), duration: getEnv('TRAFFIC_STRESS_STAGE4_DURATION') },
        { target: getEnvNumber('TRAFFIC_STRESS_STAGE5_TARGET'), duration: getEnv('TRAFFIC_STRESS_STAGE5_DURATION') },
        { target: getEnvNumber('TRAFFIC_STRESS_STAGE6_TARGET'), duration: getEnv('TRAFFIC_STRESS_STAGE6_DURATION') },
        { target: getEnvNumber('TRAFFIC_STRESS_STAGE7_TARGET'), duration: getEnv('TRAFFIC_STRESS_STAGE7_DURATION') },  
      ],
      gracefulStop: getEnv('TRAFFIC_STRESS_GRACEFUL_STOP'),
    },
  },
  thresholds: getThresholds("stress"),
};

const ENV = getEnv("ENVIRONMENT");
const environment = getEnvironment(ENV);

export function setup() {
  console.log(`[Traffic Monitoring Stress Test] Environment: ${ENV}`);
  console.log(`[Traffic Monitoring] Max VUs: ${getEnvNumber('TRAFFIC_STRESS_MAX_VUS')}`);

  return { environment };
}

export default function(data) {
  const client = createTrafficMonitoringClient(data.environment);

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

  sleep(getEnvNumber("TRAFFIC_STRESS_SLEEP"));
}

export function teardown(data) {
  console.log('[Traffic Monitoring Stress Test] Completed');
}
