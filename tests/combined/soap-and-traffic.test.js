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

// Traffic Monitoring client (initialized in setup)
let trafficClient = null;

export const options = {
  scenarios: {
    // Scenario 1: SOAP Backend - 10 RPS constant rate
    soap_backend: {
      executor: "constant-arrival-rate",
      rate: getEnvNumber("COMBINED_SOAP_RPS", 10),
      timeUnit: "1s",
      duration: getEnv("COMBINED_SOAP_DURATION", "5m"),
      preAllocatedVUs: getEnvNumber("COMBINED_SOAP_VUS", 20),
      maxVUs: getEnvNumber("COMBINED_SOAP_MAX_VUS", 50),
      exec: "soapTest",
      tags: { scenario: "soap" },
    },
    // Scenario 2: Traffic Monitoring (REST/Frontend) - 5 RPS
    traffic_frontend: {
      executor: "constant-arrival-rate",
      rate: getEnvNumber("COMBINED_TRAFFIC_RPS", 5),
      timeUnit: "1s",
      duration: getEnv("COMBINED_TRAFFIC_DURATION", "5m"),
      preAllocatedVUs: getEnvNumber("COMBINED_TRAFFIC_VUS", 10),
      maxVUs: getEnvNumber("COMBINED_TRAFFIC_MAX_VUS", 30),
      exec: "trafficTest",
      tags: { scenario: "traffic" },
    },
  },
  thresholds: {
    // Global thresholds
    http_req_failed: ["rate<0.30"],

    // Scenario thresholds
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
    soapRPS: getEnvNumber("COMBINED_SOAP_RPS", 10),
    trafficRPS: getEnvNumber("COMBINED_TRAFFIC_RPS", 5),
    duration: "5 minutes",
  });

  // Get authentication token for Traffic Monitoring
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
// Scenario 1: SOAP Backend Test
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
  // No sleep needed - constant-arrival-rate controls the request rate
}

// ============================================
// Scenario 2: Traffic Monitoring Test
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
  // No sleep needed - constant-arrival-rate controls the request rate
}

export function teardown(data) {
  logger.info("Combined test completed", {
    note: "Check metrics by scenario: soap vs traffic",
  });
}
