import http from "k6/http";
import { sleep } from "k6";

import { loadConfig, getThresholds } from "../../src/config/index.js";
import { createSoapBuilder } from "../../src/builders/index.js";
import { validateSoapResponse } from "../../src/checks/index.js";
import { createMetricsManager } from "../../src/metrics/index.js";
import { createLogger, validateEnvNumber, toMB } from "../../src/utils/index.js";
import { getEnv, getEnvNumber } from "../../src/config/env-loader.js";

const config = loadConfig();
const logger = createLogger("spike-test");

const ACTIVITIES = validateEnvNumber(getEnvNumber("ACTIVITIES"), undefined, 1, 100);
const SIZE_MB = validateEnvNumber(getEnvNumber("SIZE_MB"), undefined, 0, 100);
const SPIKE_VUS = getEnvNumber("SPIKE_MAX_VUS");

const soapBuilder = createSoapBuilder(config.getAll());
const metrics = createMetricsManager();

export const options = {
  scenarios: {
    spike: {
      executor: "ramping-vus",
      startVUs: getEnvNumber("SPIKE_START_VUS"),
      stages: [
        { duration: getEnv("SPIKE_STAGE1_DURATION"), target: getEnvNumber("SPIKE_STAGE1_TARGET") },
        { duration: getEnv("SPIKE_STAGE2_DURATION"), target: SPIKE_VUS },
        { duration: getEnv("SPIKE_STAGE3_DURATION"), target: SPIKE_VUS },
        { duration: getEnv("SPIKE_STAGE4_DURATION"), target: getEnvNumber("SPIKE_STAGE4_TARGET") },
        { duration: getEnv("SPIKE_STAGE5_DURATION"), target: getEnvNumber("SPIKE_STAGE5_TARGET") },
        { duration: getEnv("SPIKE_STAGE6_DURATION"), target: getEnvNumber("SPIKE_STAGE6_TARGET") },
      ],
      gracefulStop: getEnv("SPIKE_GRACEFUL_STOP"),
    },
  },
  thresholds: getThresholds("spike"),
};

export function setup() {
  logger.info("Starting spike test", {
    environment: config.environment,
    url: config.get("url"),
    spikeVUs: SPIKE_VUS,
    activities: ACTIVITIES,
    sizeMB: SIZE_MB || "dynamic",
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
    name: "DET-WS-SPIKE",
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
    const logEveryBad = getEnvNumber("SPIKE_LOG_EVERY_BAD");
    if (logEveryBad > 0 && badCount % logEveryBad === 0) {
      logger.logBadResponse(response, {
        testType: "spike",
        sizeMB: toMB(bodySize).toFixed(2),
        stage: "spike",
        badCount,
      });
    }
  }

  sleep(getEnvNumber("SPIKE_SLEEP"));
}

export function teardown(data) {
  const totalBad = metrics.getCounter("badResponses");
  logger.info("Spike test completed", {
    totalBadResponses: totalBad,
    note: "System should recover after spike",
  });
}
