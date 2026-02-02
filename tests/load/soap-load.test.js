import http from "k6/http";
import { sleep } from "k6";

import { loadConfig, getThresholds } from "../../src/config/index.js";
import { createSoapBuilder } from "../../src/builders/index.js";
import { validateSoapResponse } from "../../src/checks/index.js";
import { createMetricsManager } from "../../src/metrics/index.js";
import { createLogger, validateEnvNumber, toMB } from "../../src/utils/index.js";
import { getEnv, getEnvNumber } from "../../src/config/env-loader.js";

const config = loadConfig();
const logger = createLogger("load-test");

const ACTIVITIES = validateEnvNumber(getEnvNumber("ACTIVITIES"), undefined, 1, 100);
const SIZE_MB = validateEnvNumber(getEnvNumber("SIZE_MB"), undefined, 0, 100);
const LOG_EVERY_BAD = validateEnvNumber(getEnvNumber("LOAD_LOG_EVERY_BAD"), undefined, 1, 1000);

const soapBuilder = createSoapBuilder(config.getAll());
const metrics = createMetricsManager();

export const options = {
  scenarios: {
    load: {
      executor: "ramping-arrival-rate",
      startRate: getEnvNumber('LOAD_START_RATE'),
      timeUnit: getEnv("LOAD_TIME_UNIT"),
      preAllocatedVUs: validateEnvNumber(getEnvNumber('LOAD_PRE_VUS'), undefined, 1, 1000),
      maxVUs: validateEnvNumber(getEnvNumber('LOAD_MAX_VUS'), undefined, 1, 2000),
      stages: [
        { duration: getEnv("LOAD_STAGE1_DURATION"), target: getEnvNumber('LOAD_TARGET_RPS') },
        { duration: getEnv("LOAD_STAGE2_DURATION"), target: getEnvNumber('LOAD_TARGET_RPS') },
        { duration: getEnv("LOAD_STAGE3_DURATION"), target: getEnvNumber('LOAD_TARGET_RPS') },
        { duration: getEnv("LOAD_STAGE4_DURATION"), target: getEnvNumber('LOAD_TARGET_RPS') },
        { duration: getEnv("LOAD_STAGE5_DURATION"), target: getEnvNumber("LOAD_STAGE5_TARGET") },
      ],
      gracefulStop: getEnv("LOAD_GRACEFUL_STOP"),
    },
  },
  thresholds: getThresholds("load"),
};

export function setup() {
  const maxVUs = validateEnvNumber(getEnvNumber("LOAD_MAX_VUS"), undefined, 1, 2000);

  logger.info("Starting load test", {
    environment: config.environment,
    url: config.get("url"),
    activities: ACTIVITIES,
    sizeMB: SIZE_MB || "dynamic",
    maxVUs: maxVUs,
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
    name: "DET-WS-LOAD",
    size_mb: SIZE_MB > 0 ? String(SIZE_MB) : toMB(bodySize).toFixed(2),
    activities: String(ACTIVITIES),
  };

  const response = http.post(config.get("url"), body, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    timeout: config.get("timeout"),
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
      logger.logBadResponse(response, {
        testType: "load",
        sizeMB: toMB(bodySize).toFixed(2),
        errorType: validation.errors.message,
        badCount,
      });
    }
  }

  sleep(getEnvNumber("LOAD_SLEEP"));
}

export function teardown(data) {
  const totalBad = metrics.getCounter("badResponses");
  logger.info("Load test completed", {
    totalBadResponses: totalBad,
  });
}
