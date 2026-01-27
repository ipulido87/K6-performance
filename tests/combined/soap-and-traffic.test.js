import http from "k6/http";
import { sleep, check } from "k6";

import { loadConfig } from "../../src/config/index.js";
import { createSoapBuilder } from "../../src/builders/index.js";
import { validateSoapResponse } from "../../src/checks/index.js";
import { createMetricsManager } from "../../src/metrics/index.js";
import { createLogger, validateEnvNumber, toMB } from "../../src/utils/index.js";
import { getEnv, getEnvNumber } from "../../src/config/env-loader.js";
import { TrafficMonitoringClient } from "../../src/clients/traffic-monitoring-client.js";

const config = loadConfig();
const logger = createLogger("combined-test");

const ACTIVITIES = validateEnvNumber(__ENV.ACTIVITIES, 1, 1, 100);

const soapBuilder = createSoapBuilder(config.getAll());
const metrics = createMetricsManager();

// Cliente para Traffic Monitoring (se inicializa en setup)
let trafficClient = null;

export const options = {
  scenarios: {
    // Escenario 1: SOAP Backend
    soap_backend: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: getEnv("COMBINED_SOAP_STAGE1", "1m"), target: getEnvNumber("COMBINED_SOAP_VUS1", 5) },
        { duration: getEnv("COMBINED_SOAP_STAGE2", "2m"), target: getEnvNumber("COMBINED_SOAP_VUS2", 10) },
        { duration: getEnv("COMBINED_SOAP_STAGE3", "2m"), target: getEnvNumber("COMBINED_SOAP_VUS3", 15) },
        { duration: getEnv("COMBINED_SOAP_STAGE4", "1m"), target: 0 },
      ],
      exec: "soapTest",
      tags: { scenario: "soap" },
    },
    // Escenario 2: Traffic Monitoring (REST/Frontend)
    traffic_frontend: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: getEnv("COMBINED_TRAFFIC_STAGE1", "1m"), target: getEnvNumber("COMBINED_TRAFFIC_VUS1", 3) },
        { duration: getEnv("COMBINED_TRAFFIC_STAGE2", "2m"), target: getEnvNumber("COMBINED_TRAFFIC_VUS2", 5) },
        { duration: getEnv("COMBINED_TRAFFIC_STAGE3", "2m"), target: getEnvNumber("COMBINED_TRAFFIC_VUS3", 8) },
        { duration: getEnv("COMBINED_TRAFFIC_STAGE4", "1m"), target: 0 },
      ],
      exec: "trafficTest",
      tags: { scenario: "traffic" },
    },
  },
  thresholds: {
    // Thresholds globales
    http_req_failed: ["rate<0.30"],

    // Thresholds por escenario
    "http_req_duration{scenario:soap}": ["p(95)<30000"],
    "http_req_duration{scenario:traffic}": ["p(95)<5000"],
    "http_req_failed{scenario:soap}": ["rate<0.50"],
    "http_req_failed{scenario:traffic}": ["rate<0.10"],
  },
};

export function setup() {
  logger.info("Starting combined test - SOAP + Traffic Monitoring", {
    environment: config.environment,
    soapUrl: config.get("url"),
    trafficUrl: config.get("trafficUrl"),
    soapStages: "5→10→15 VUs",
    trafficStages: "3→5→8 VUs",
    duration: "~6 minutes",
  });

  // Obtener token de autenticación para Traffic Monitoring
  const authUrl = config.get("authUrl");
  const clientId = config.get("clientId");
  const clientSecret = config.get("clientSecret");
  const grantType = config.get("authGrantType");
  const username = config.get("authUsername");
  const password = config.get("authPassword");

  let authToken = null;

  if (authUrl && clientId) {
    const authPayload = {
      grant_type: grantType || "password",
      client_id: clientId,
      client_secret: clientSecret,
      username: username,
      password: password,
    };

    const authResponse = http.post(authUrl, authPayload, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (authResponse.status === 200) {
      const authData = JSON.parse(authResponse.body);
      authToken = authData.access_token;
      logger.info("Authentication successful for Traffic Monitoring");
    } else {
      logger.warn("Authentication failed for Traffic Monitoring", {
        status: authResponse.status,
      });
    }
  }

  return { authToken };
}

// ============================================
// Escenario 1: SOAP Backend Test
// ============================================
export function soapTest() {
  const body = soapBuilder.buildWithActivities(ACTIVITIES);
  const bodySize = body.length;

  const tags = {
    name: "DET-WS-COMBINED",
    scenario: "soap",
  };

  const response = http.post(config.get("url"), body, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    timeout: "60s",
    tags,
  });

  const validation = validateSoapResponse(response);

  if (validation.isValid) {
    metrics.recordSuccess(response);
  } else {
    metrics.recordBadResponse(response, {
      errorMessage: validation.errors.message,
    });
  }

  sleep(0.5);
}

// ============================================
// Escenario 2: Traffic Monitoring Test
// ============================================
export function trafficTest(data) {
  const trafficUrl = config.get("trafficUrl");

  if (!trafficUrl) {
    logger.warn("Traffic URL not configured, skipping");
    sleep(1);
    return;
  }

  const headers = {
    "Content-Type": "application/json",
  };

  if (data && data.authToken) {
    headers["Authorization"] = `Bearer ${data.authToken}`;
  }

  const tags = {
    name: "TRAFFIC-MONITORING-COMBINED",
    scenario: "traffic",
  };

  const response = http.get(trafficUrl, {
    headers,
    timeout: "30s",
    tags,
  });

  check(response, {
    "Traffic: status is 200": (r) => r.status === 200,
    "Traffic: response time < 5s": (r) => r.timings.duration < 5000,
  });

  sleep(1);
}

export function teardown(data) {
  logger.info("Combined test completed", {
    note: "Check metrics by scenario: soap vs traffic",
  });
}
