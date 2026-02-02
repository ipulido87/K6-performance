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

const ACTIVITIES = validateEnvNumber(getEnvNumber("ACTIVITIES"), undefined, 1, 100);

const soapBuilder = createSoapBuilder(config.getAll());
const metrics = createMetricsManager();

// Traffic Monitoring client (initialized in setup)
let trafficClient = null;

export const options = {
  scenarios: {
    // Scenario 1: SOAP Backend - progressive arrival rate
    soap_backend: {
      executor: "ramping-arrival-rate",
      startRate: getEnvNumber("COMBINED_SOAP_START_RPS"),
      timeUnit: getEnv("COMBINED_SOAP_TIME_UNIT"),
      preAllocatedVUs: getEnvNumber("COMBINED_SOAP_VUS"),
      maxVUs: getEnvNumber("COMBINED_SOAP_MAX_VUS"),
      stages: [
        { duration: getEnv("COMBINED_SOAP_STAGE1_DURATION"), target: getEnvNumber("COMBINED_SOAP_STAGE1_TARGET") },
        { duration: getEnv("COMBINED_SOAP_STAGE2_DURATION"), target: getEnvNumber("COMBINED_SOAP_STAGE2_TARGET") },
        { duration: getEnv("COMBINED_SOAP_STAGE3_DURATION"), target: getEnvNumber("COMBINED_SOAP_STAGE3_TARGET") },
      ],
      exec: "soapTest",
      tags: { scenario: "soap" },
    },
    // Scenario 2: Traffic Monitoring (REST/Frontend) - progressive arrival rate
    traffic_frontend: {
      executor: "ramping-arrival-rate",
      startRate: getEnvNumber("COMBINED_TRAFFIC_START_RPS"),
      timeUnit: getEnv("COMBINED_TRAFFIC_TIME_UNIT"),
      preAllocatedVUs: getEnvNumber("COMBINED_TRAFFIC_VUS"),
      maxVUs: getEnvNumber("COMBINED_TRAFFIC_MAX_VUS"),
      stages: [
        { duration: getEnv("COMBINED_TRAFFIC_STAGE1_DURATION"), target: getEnvNumber("COMBINED_TRAFFIC_STAGE1_TARGET") },
        { duration: getEnv("COMBINED_TRAFFIC_STAGE2_DURATION"), target: getEnvNumber("COMBINED_TRAFFIC_STAGE2_TARGET") },
        { duration: getEnv("COMBINED_TRAFFIC_STAGE3_DURATION"), target: getEnvNumber("COMBINED_TRAFFIC_STAGE3_TARGET") },
      ],
      exec: "trafficTest",
      tags: { scenario: "traffic" },
    },
  },
  thresholds: {
    // Global thresholds
    http_req_failed: [`rate<${getEnvNumber("COMBINED_THRESHOLD_FAILED_RATE")}`],

    // Scenario thresholds
    "http_req_duration{scenario:soap}": [`p(95)<${getEnvNumber("COMBINED_SOAP_THRESHOLD_P95_DURATION")}`],
    "http_req_duration{scenario:traffic}": [`p(95)<${getEnvNumber("COMBINED_TRAFFIC_THRESHOLD_P95_DURATION")}`],
    "http_req_failed{scenario:soap}": [`rate<${getEnvNumber("COMBINED_SOAP_THRESHOLD_FAILED_RATE")}`],
    "http_req_failed{scenario:traffic}": [`rate<${getEnvNumber("COMBINED_TRAFFIC_THRESHOLD_FAILED_RATE")}`],
  },
};

export function setup() {
  logger.info("Starting combined test - SOAP + Traffic Monitoring", {
    environment: config.environment,
    soapUrl: config.get("url"),
    trafficUrl: config.get("trafficUrl"),
    soapStages: `${getEnv("COMBINED_SOAP_STAGE1_DURATION")}@${getEnvNumber("COMBINED_SOAP_STAGE1_TARGET")} -> ` +
      `${getEnv("COMBINED_SOAP_STAGE2_DURATION")}@${getEnvNumber("COMBINED_SOAP_STAGE2_TARGET")} -> ` +
      `${getEnv("COMBINED_SOAP_STAGE3_DURATION")}@${getEnvNumber("COMBINED_SOAP_STAGE3_TARGET")}`,
    trafficStages: `${getEnv("COMBINED_TRAFFIC_STAGE1_DURATION")}@${getEnvNumber("COMBINED_TRAFFIC_STAGE1_TARGET")} -> ` +
      `${getEnv("COMBINED_TRAFFIC_STAGE2_DURATION")}@${getEnvNumber("COMBINED_TRAFFIC_STAGE2_TARGET")} -> ` +
      `${getEnv("COMBINED_TRAFFIC_STAGE3_DURATION")}@${getEnvNumber("COMBINED_TRAFFIC_STAGE3_TARGET")}`,
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
      grant_type: grantType,
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
    timeout: getEnv("COMBINED_SOAP_TIMEOUT"),
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
    sleep(getEnvNumber("COMBINED_TRAFFIC_SLEEP"));
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
    timeout: getEnv("COMBINED_TRAFFIC_TIMEOUT"),
    tags,
  });

  check(response, {
    "Traffic: status is 200": (r) => r.status === 200,
    "Traffic: response time < max": (r) => r.timings.duration < getEnvNumber("COMBINED_TRAFFIC_MAX_RESPONSE_MS"),
  });
  // No sleep needed - constant-arrival-rate controls the request rate
}

export function teardown(data) {
  logger.info("Combined test completed", {
    note: "Check metrics by scenario: soap vs traffic",
  });
}
