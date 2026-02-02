import http from "k6/http";
import { sleep } from "k6";

import { loadConfig, getThresholds } from "../../src/config/index.js";
import { createSoapBuilder } from "../../src/builders/index.js";
import { validateSoapResponse } from "../../src/checks/index.js";
import { createMetricsManager } from "../../src/metrics/index.js";
import { createLogger, validateEnvNumber, toMB } from "../../src/utils/index.js";
import { getEnv, getEnvNumber } from "../../src/config/env-loader.js";

const config = loadConfig();
const logger = createLogger("capacity-test");

const ACTIVITIES = validateEnvNumber(getEnvNumber("ACTIVITIES"), undefined, 1, 100);
const SIZE_MB = validateEnvNumber(getEnvNumber("SIZE_MB"), undefined, 0, 100);
const LOG_EVERY_BAD = validateEnvNumber(getEnvNumber("CAPACITY_LOG_EVERY_BAD"), undefined, 1, 1000);

const soapBuilder = createSoapBuilder(config.getAll());
const metrics = createMetricsManager();

export const options = {
  scenarios: {
    capacity: {
      executor: "ramping-arrival-rate",
      startRate: getEnvNumber("CAPACITY_START_RPS"),
      timeUnit: getEnv("CAPACITY_TIME_UNIT"),
      preAllocatedVUs: getEnvNumber("CAPACITY_PRE_VUS"),
      maxVUs: getEnvNumber("CAPACITY_MAX_VUS"),
      stages: [
        { duration: getEnv("CAPACITY_STAGE1_DURATION"), target: getEnvNumber("CAPACITY_STAGE1_TARGET") },
        { duration: getEnv("CAPACITY_STAGE2_DURATION"), target: getEnvNumber("CAPACITY_STAGE2_TARGET") },
        { duration: getEnv("CAPACITY_STAGE3_DURATION"), target: getEnvNumber("CAPACITY_STAGE3_TARGET") },
        { duration: getEnv("CAPACITY_STAGE4_DURATION"), target: getEnvNumber("CAPACITY_STAGE4_TARGET") },
        { duration: getEnv("CAPACITY_STAGE5_DURATION"), target: getEnvNumber("CAPACITY_STAGE5_TARGET") },
        { duration: getEnv("CAPACITY_STAGE6_DURATION"), target: getEnvNumber("CAPACITY_STAGE6_TARGET") },
        { duration: getEnv("CAPACITY_STAGE7_DURATION"), target: getEnvNumber("CAPACITY_STAGE7_TARGET") },
      ],
      gracefulStop: getEnv("CAPACITY_GRACEFUL_STOP"),
    },
  },
  thresholds: getThresholds("capacity"),
};

export function setup() {
  const maxVUs = getEnvNumber("CAPACITY_MAX_VUS");

  logger.info("Starting capacity test", {
    environment: config.environment,
    url: config.get("url"),
    activities: ACTIVITIES,
    sizeMB: SIZE_MB || "dynamic",
    startRPS: getEnvNumber("CAPACITY_START_RPS"),
    maxVUs: maxVUs,
    note: "Test will FAIL at first step that doesn't meet SLA",
  });
}

export default function () {
  const body =
    SIZE_MB > 0
      ? soapBuilder.buildWithTargetSize(SIZE_MB)
      : soapBuilder.buildWithActivities(ACTIVITIES);

  const bodySize = body.length;
  metrics.recordPayloadSize(bodySize);

  const tags = {
    name: "DET-WS-CAPACITY",
    size_mb: SIZE_MB > 0 ? String(SIZE_MB) : toMB(bodySize).toFixed(2),
    activities: String(ACTIVITIES),
  };

  const response = http.post(config.get("url"), body, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    timeout: getEnv("CAPACITY_TIMEOUT"),
    tags,
  });

  const validation = validateSoapResponse(response);

  if (validation.isValid) {
    metrics.recordSuccess(response);
  } else {
    metrics.recordBadResponse(response, {
      errorMessage: validation.errors.message,
    });

    const badCount = metrics.increment("badResponses");
    if (badCount % LOG_EVERY_BAD === 0) {
      const errors = validation.errors;
      logger.logBadResponse(response, {
        testType: "capacity",
        sizeMB: toMB(bodySize).toFixed(2),
        errorType: errors.message,
        isRejectedSemaphore: errors.isRejectedSemaphore,
        isShortCircuit: errors.isShortCircuit,
        isTimeout: errors.isTimeout,
        badCount,
      });
    }
  }

  sleep(getEnvNumber("CAPACITY_SLEEP"));
}

export function teardown(data) {
  const totalBad = metrics.getCounter("badResponses");
  logger.info("Capacity test completed", {
    totalBadResponses: totalBad,
    note: "Last successful step = healthy capacity limit",
  });
}
