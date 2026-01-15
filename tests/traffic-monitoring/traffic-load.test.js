import { sleep } from 'k6';
import { getEnvNumber } from "../../src/config/env-loader.js";
import { getEnvironment } from "../../src/config/environments.js";
import { getThresholds } from "../../src/config/thresholds.js";
import { createTrafficMonitoringClient } from "../../src/clients/traffic-monitoring-client.js";

export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-arrival-rate',
      startRate: getEnvNumber('LOAD_START_RATE', 1),
      timeUnit: '1s',
      preAllocatedVUs: getEnvNumber('LOAD_PRE_VUS', 30),
      maxVUs: getEnvNumber('LOAD_MAX_VUS', 200),
      stages: [
        { target: getEnvNumber('LOAD_TARGET_RPS', 10), duration: '3m' },  // Ramp-up
        { target: getEnvNumber('LOAD_TARGET_RPS', 10), duration: '5m' },  // Mantener carga
        { target: 0, duration: '1m' },  // Ramp-down
      ],
    },
  },
  thresholds: getThresholds("load"),
};

const ENV = __ENV.ENVIRONMENT || "local";
const environment = getEnvironment(ENV);
const client = createTrafficMonitoringClient(environment);

export function setup() {
  console.log(`[Traffic Monitoring Load Test] Ambiente: ${ENV}`);
  console.log(`[Traffic Monitoring] Target RPS: ${getEnvNumber('LOAD_TARGET_RPS', 10)}`);
  console.log(`[Traffic Monitoring] Max VUs: ${getEnvNumber('LOAD_MAX_VUS', 200)}`);

  return { environment };
}

export default function() {

  // Autenticacion inicial
  if (!client.token) {
    client.authenticate();
  }

  // Llamada al endpoint
  const response = client.getDataDomain();

  // Manejo de re-autenticacion
  if (client.handleUnauthorized(response)) {
    client.getDataDomain();
  }

  sleep(0.1);
}

export function teardown(data) {
  console.log('[Traffic Monitoring Load Test] Finalizado');
}
