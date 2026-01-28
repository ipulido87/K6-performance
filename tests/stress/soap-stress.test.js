import http from "k6/http";
import { sleep } from "k6";

import { loadConfig, getThresholds } from "../../src/config/index.js";
import { createSoapBuilder } from "../../src/builders/index.js";
import { validateSoapResponse } from "../../src/checks/index.js";
import { createMetricsManager } from "../../src/metrics/index.js";
import { createLogger, validateEnvNumber, toMB } from "../../src/utils/index.js";
import { getEnv, getEnvNumber } from "../../src/config/env-loader.js";

const config = loadConfig();
const logger = createLogger("stress-test");

const ACTIVITIES = validateEnvNumber(__ENV.ACTIVITIES, 1, 1, 100);
const SIZE_MB = validateEnvNumber(__ENV.SIZE_MB, 0, 0, 100);
const LOG_EVERY_BAD = validateEnvNumber(__ENV.LOG_EVERY_BAD, 20, 1, 1000);
const START_RPS = validateEnvNumber(__ENV.START_RPS, 2, 1, 100);

const soapBuilder = createSoapBuilder(config.getAll());
const metrics = createMetricsManager();

export const options = {
  scenarios: {
    stress: {
      executor: "ramping-arrival-rate",
      startRate: getEnvNumber("STRESS_START_RPS", 1),        // Starts at 1 req/s
      timeUnit: "1s",
      preAllocatedVUs: getEnvNumber("STRESS_PRE_VUS", 20),
      maxVUs: getEnvNumber("STRESS_MAX_VUS", 50),
      stages: [
        // Gradual ramp up to max 5 RPS
        { duration: getEnv("STRESS_STAGE1_DURATION", "1m"), target: getEnvNumber("STRESS_STAGE1_TARGET", 1) },   // 1 req/s
        { duration: getEnv("STRESS_STAGE2_DURATION", "1m"), target: getEnvNumber("STRESS_STAGE2_TARGET", 2) },   // 2 req/s
        { duration: getEnv("STRESS_STAGE3_DURATION", "1m"), target: getEnvNumber("STRESS_STAGE3_TARGET", 3) },   // 3 req/s
        { duration: getEnv("STRESS_STAGE4_DURATION", "1m"), target: getEnvNumber("STRESS_STAGE4_TARGET", 4) },   // 4 req/s
        { duration: getEnv("STRESS_STAGE5_DURATION", "2m"), target: getEnvNumber("STRESS_STAGE5_TARGET", 5) },   // 5 req/s (max)
        { duration: getEnv("STRESS_STAGE6_DURATION", "30s"), target: getEnvNumber("STRESS_STAGE6_TARGET", 0) },  // Ramp-down
      ],
      gracefulStop: getEnv("STRESS_GRACEFUL_STOP", "30s"),
    },
  },
  thresholds: getThresholds("stress"),
};

export function setup() {
  logger.info("Starting stress test - Max 5 req/s", {
    environment: config.environment,
    url: config.get("url"),
    activities: ACTIVITIES,
    sizeMB: SIZE_MB || "dynamic",
    stages: "1->2->3->4->5 req/s (max 5)",
    duration: "~6.5 minutes",
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
    name: "DET-WS-STRESS",
    size_mb: SIZE_MB > 0 ? String(SIZE_MB) : toMB(bodySize).toFixed(2),
    activities: String(ACTIVITIES),
  };

  const response = http.post(config.get("url"), body, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    timeout: "90s",
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
        testType: "stress",
        sizeMB: toMB(bodySize).toFixed(2),
        errorType: errors.message,
        isRejectedSemaphore: errors.isRejectedSemaphore,
        isShortCircuit: errors.isShortCircuit,
        isTimeout: errors.isTimeout,
        badCount,
      });
    }
  }

  sleep(0.001);
}

export function teardown(data) {
  const totalBad = metrics.getCounter("badResponses");
  logger.info("Stress test completed", {
    totalBadResponses: totalBad,
    note: "Review metrics to identify breaking point",
  });
}
