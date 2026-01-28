import { sleep } from 'k6';
import { getEnv, getEnvNumber } from "../../src/config/env-loader.js";
import { getEnvironment } from "../../src/config/environments.js";
import { getThresholds } from "../../src/config/thresholds.js";
import { createTrafficMonitoringClient } from "../../src/clients/traffic-monitoring-client.js";

export const options = {
  scenarios: {
    stress_test: {
      executor: 'ramping-arrival-rate',
      startRate: getEnvNumber('STRESS_START_RPS', 2),
      timeUnit: '1s',
      preAllocatedVUs: getEnvNumber('STRESS_PRE_VUS', 50),
      maxVUs: getEnvNumber('STRESS_MAX_VUS', 300),
      stages: [
        { target: 2, duration: '1m' },
        { target: 4, duration: '1m' },
        { target: 6, duration: '1m' },
        { target: 8, duration: '1m' },
        { target: 10, duration: '1m' },
        { target: 12, duration: '1m' },
        { target: 0, duration: '1m' },  
      ],
      gracefulStop: getEnv('STRESS_GRACEFUL_STOP', '30s'),
    },
  },
  thresholds: getThresholds("stress"),
};

const ENV = __ENV.ENVIRONMENT || "local";
const environment = getEnvironment(ENV);

export function setup() {
  console.log(`[Traffic Monitoring Stress Test] Environment: ${ENV}`);
  console.log(`[Traffic Monitoring] Max VUs: ${getEnvNumber('STRESS_MAX_VUS', 300)}`);

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

  sleep(0.1);
}

export function teardown(data) {
  console.log('[Traffic Monitoring Stress Test] Completed');
}
