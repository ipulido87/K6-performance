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

const ACTIVITIES = validateEnvNumber(__ENV.ACTIVITIES, 1, 1, 100);
const SIZE_MB = validateEnvNumber(__ENV.SIZE_MB, 0, 0, 100);
const SPIKE_VUS = getEnvNumber("SPIKE_MAX_VUS", 100);

const soapBuilder = createSoapBuilder(config.getAll());
const metrics = createMetricsManager();

export const options = {
  scenarios: {
    spike: {
      executor: "ramping-vus",
      startVUs: getEnvNumber("SPIKE_START_VUS", 1),
      stages: [
        { duration: getEnv("SPIKE_STAGE1_DURATION", "30s"), target: getEnvNumber("SPIKE_STAGE1_TARGET", 5) },
        { duration: getEnv("SPIKE_STAGE2_DURATION", "10s"), target: SPIKE_VUS },
        { duration: getEnv("SPIKE_STAGE3_DURATION", "1m"), target: SPIKE_VUS },
        { duration: getEnv("SPIKE_STAGE4_DURATION", "10s"), target: getEnvNumber("SPIKE_STAGE4_TARGET", 5) },
        { duration: getEnv("SPIKE_STAGE5_DURATION", "1m"), target: getEnvNumber("SPIKE_STAGE5_TARGET", 5) },
        { duration: getEnv("SPIKE_STAGE6_DURATION", "30s"), target: getEnvNumber("SPIKE_STAGE6_TARGET", 0) },
      ],
      gracefulStop: getEnv("SPIKE_GRACEFUL_STOP", "30s"),
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
    if (badCount % 50 === 0) {
      logger.logBadResponse(response, {
        testType: "spike",
        sizeMB: toMB(bodySize).toFixed(2),
        stage: "spike",
        badCount,
      });
    }
  }

  sleep(0.5);
}

export function teardown(data) {
  const totalBad = metrics.getCounter("badResponses");
  logger.info("Spike test completed", {
    totalBadResponses: totalBad,
    note: "System should recover after spike",
  });
}
