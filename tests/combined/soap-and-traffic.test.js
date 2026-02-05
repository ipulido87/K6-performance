import http from "k6/http";
import { sleep, check } from "k6";

import { loadConfig } from "../../src/config/index.js";
import { createSoapBuilder } from "../../src/builders/index.js";
import { validateSoapResponse } from "../../src/checks/index.js";
import { createMetricsManager } from "../../src/metrics/index.js";
import { createLogger, toMB } from "../../src/utils/index.js";
import { OAuth2Manager } from "../../src/utils/oauth2-manager.js";
import { getEnv, getEnvNumber } from "../../src/config/env-loader.js";

const config = loadConfig();
const logger = createLogger("combined-test");

const ACTIVITIES = getEnvNumber("ACTIVITIES", 1);
const SIZE_MB = getEnvNumber("SIZE_MB", 0);
const COMBINED_START_RPS = getEnvNumber("COMBINED_START_RPS", 0);
const COMBINED_RPS = getEnvNumber("COMBINED_RPS", getEnvNumber("COMBINED_SOAP_START_RPS", 2));
const COMBINED_TIME_UNIT = getEnv("COMBINED_TIME_UNIT", "1s");
const COMBINED_RAMP_DURATION = getEnv("COMBINED_RAMP_DURATION", "30s");
const COMBINED_HOLD_DURATION = getEnv("COMBINED_HOLD_DURATION", "20m");
const COMBINED_SOAP_PRE_VUS = getEnvNumber("COMBINED_SOAP_VUS", 8);
const COMBINED_TRAFFIC_PRE_VUS = getEnvNumber("COMBINED_TRAFFIC_VUS", 4);
const COMBINED_SOAP_MAX_VUS = getEnvNumber("COMBINED_SOAP_MAX_VUS", getEnvNumber("COMBINED_MAX_VUS", 10));
const COMBINED_TRAFFIC_MAX_VUS = getEnvNumber("COMBINED_TRAFFIC_MAX_VUS", getEnvNumber("COMBINED_MAX_VUS", 10));
const COMBINED_LOG_EVERY_BAD = getEnvNumber("COMBINED_LOG_EVERY_BAD", 1);
const COMBINED_LOG_BODY_PREVIEW = getEnvNumber("COMBINED_LOG_BODY_PREVIEW", 200);

const soapBuilder = createSoapBuilder(config.getAll());
const metrics = createMetricsManager();
let soapBadCount = 0;
let trafficBadCount = 0;

const oauthManager = new OAuth2Manager(config.getAll(), {
  lifetimeMs: getEnvNumber("COMBINED_TOKEN_LIFETIME_MS", 300000),
  refreshMarginMs: getEnvNumber("COMBINED_TOKEN_REFRESH_MARGIN_MS", 60000),
  onWarn: (msg, data) => logger.warn(msg, data),
});

const combinedStages = [
  { duration: COMBINED_RAMP_DURATION, target: COMBINED_RPS },
  { duration: COMBINED_HOLD_DURATION, target: COMBINED_RPS },
  { duration: COMBINED_RAMP_DURATION, target: 0 },
];

export const options = {
  scenarios: {
    soap_backend: {
      executor: "ramping-arrival-rate",
      startRate: COMBINED_START_RPS,
      timeUnit: COMBINED_TIME_UNIT,
      preAllocatedVUs: COMBINED_SOAP_PRE_VUS,
      maxVUs: COMBINED_SOAP_MAX_VUS,
      stages: combinedStages,
      exec: "soapTest",
      tags: { scenario: "soap" },
    },
    traffic_frontend: {
      executor: "ramping-arrival-rate",
      startRate: COMBINED_START_RPS,
      timeUnit: COMBINED_TIME_UNIT,
      preAllocatedVUs: COMBINED_TRAFFIC_PRE_VUS,
      maxVUs: COMBINED_TRAFFIC_MAX_VUS,
      stages: combinedStages,
      exec: "trafficTest",
      tags: { scenario: "traffic" },
    },
  },
  thresholds: {
    http_req_failed: [`rate<${getEnvNumber("COMBINED_THRESHOLD_FAILED_RATE")}`],
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
    soapPayloadSizeMB: SIZE_MB || "dynamic",
    startRpsPerEndpoint: COMBINED_START_RPS,
    rpsPerEndpoint: COMBINED_RPS,
    rampDuration: COMBINED_RAMP_DURATION,
    holdDuration: COMBINED_HOLD_DURATION,
    soapMaxVUs: COMBINED_SOAP_MAX_VUS,
    trafficMaxVUs: COMBINED_TRAFFIC_MAX_VUS,
  });

  const authToken = oauthManager.authenticate();
  if (authToken) logger.info("Authentication successful for Traffic Monitoring");

  return { authToken };
}

export function soapTest() {
  const body = SIZE_MB > 0
    ? soapBuilder.buildWithTargetSize(SIZE_MB)
    : soapBuilder.buildWithActivities(ACTIVITIES);

  const bodySize = body.length;
  const tags = {
    name: "DET-WS-COMBINED",
    scenario: "soap",
    size_mb: SIZE_MB > 0 ? String(SIZE_MB) : toMB(bodySize).toFixed(2),
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
    soapBadCount++;
    if (soapBadCount <= 3 || soapBadCount % COMBINED_LOG_EVERY_BAD === 0) {
      logger.warn("SOAP request failed", {
        count: soapBadCount,
        status: response.status,
        durationMs: response.timings?.duration,
        errorCode: response.error_code || "",
        error: response.error || "",
        bodySnippet: response.body ? response.body.substring(0, COMBINED_LOG_BODY_PREVIEW) : "",
      });
    }
    metrics.recordBadResponse(response, { errorMessage: validation.errors.message });
  }
}

export function trafficTest(data) {
  const trafficUrl = config.get("trafficUrl");

  if (!trafficUrl) {
    logger.warn("Traffic URL not configured, skipping");
    sleep(getEnvNumber("COMBINED_TRAFFIC_SLEEP"));
    return;
  }

  oauthManager.initFromSetupData(data);
  oauthManager.refreshIfNeeded();

  const headers = oauthManager.getAuthHeaders();
  const tags = { name: "TRAFFIC-MONITORING-COMBINED", scenario: "traffic" };

  let response = http.get(trafficUrl, {
    headers,
    timeout: getEnv("COMBINED_TRAFFIC_TIMEOUT"),
    tags,
  });

  if (response.status === 401 || response.status === 403) {
    if (oauthManager.handleUnauthorized(response)) {
      const retryHeaders = oauthManager.getAuthHeaders();
      response = http.get(trafficUrl, {
        headers: retryHeaders,
        timeout: getEnv("COMBINED_TRAFFIC_TIMEOUT"),
        tags,
      });
    }
  }

  if (response.status !== 200) {
    trafficBadCount++;
    if (trafficBadCount <= 3 || trafficBadCount % COMBINED_LOG_EVERY_BAD === 0) {
      logger.warn("Traffic request failed", {
        count: trafficBadCount,
        status: response.status,
        durationMs: response.timings?.duration,
        errorCode: response.error_code || "",
        error: response.error || "",
        bodySnippet: response.body ? response.body.substring(0, COMBINED_LOG_BODY_PREVIEW) : "",
      });
    }
  }

  check(response, {
    "Traffic: status is 200": (r) => r.status === 200,
    "Traffic: response time < max": (r) =>
      r.timings.duration < getEnvNumber("COMBINED_TRAFFIC_MAX_RESPONSE_MS"),
  });
}

export function teardown() {
  logger.info("Combined test completed", {
    note: "Check metrics by scenario: soap vs traffic",
  });
}
