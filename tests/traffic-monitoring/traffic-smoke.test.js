import { sleep } from 'k6';
import { getEnv, getEnvNumber } from "../../src/config/env-loader.js";
import { getEnvironment } from "../../src/config/environments.js";
import { getThresholds } from "../../src/config/thresholds.js";
import { createTrafficMonitoringClient } from "../../src/clients/traffic-monitoring-client.js";

export const options = {
  vus: getEnvNumber('SMOKE_VUS', 1),
  duration: getEnv('SMOKE_DURATION', '15s'),
  thresholds: getThresholds("smoke"),
};

const ENV = __ENV.ENVIRONMENT || "local";
const environment = getEnvironment(ENV);

export function setup() {
  return { environment };
}

export default function(data) {
  const client = createTrafficMonitoringClient(data.environment);

  if (!client.token) {
    client.authenticate();
  }

  // Llamada al endpoint de Traffic Monitoring
  const response = client.getDataDomain();

  // Si recibimos 401, re-autenticamos y reintentamos
  if (client.handleUnauthorized(response)) {
    client.getDataDomain();
  }

  sleep(1);
}

export function teardown(data) {
  console.log('[Traffic Monitoring Smoke Test] Finalizado');
}
