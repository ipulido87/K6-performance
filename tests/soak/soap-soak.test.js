import http from "k6/http";
import { sleep } from "k6";

import { loadConfig, getThresholds } from "../../src/config/index.js";
import { createSoapBuilder } from "../../src/builders/index.js";
import { validateSoapResponse } from "../../src/checks/index.js";
import { createMetricsManager } from "../../src/metrics/index.js";
import { createLogger, validateEnvNumber, toMB } from "../../src/utils/index.js";

const config = loadConfig();
const logger = createLogger("soak-test");

const ACTIVITIES = validateEnvNumber(__ENV.ACTIVITIES, 1, 1, 100);
const SIZE_MB = validateEnvNumber(__ENV.SIZE_MB, 0, 0, 100);
const SOAK_DURATION = __ENV.SOAK_DURATION || "30m";
const SOAK_VUS = validateEnvNumber(__ENV.SOAK_VUS, 10, 1, 100);

const soapBuilder = createSoapBuilder(config.getAll());
const metrics = createMetricsManager();

export const options = {
  scenarios: {
    soak: {
      executor: "constant-vus",
      vus: SOAK_VUS,
      duration: SOAK_DURATION,
      gracefulStop: "30s",
    },
  },
  thresholds: getThresholds("soak"),
};

export function setup() {
  logger.info("Starting soak test", {
    environment: config.environment,
    url: config.get("url"),
    duration: SOAK_DURATION,
    vus: SOAK_VUS,
    activities: ACTIVITIES,
    sizeMB: SIZE_MB || "dynamic",
    warning: "This is a long-running test. Monitor system resources.",
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
    name: "DET-WS-SOAK",
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
    if (badCount % 100 === 0) {
      logger.logBadResponse(response, {
        testType: "soak",
        sizeMB: toMB(bodySize).toFixed(2),
        badCount,
        note: "Monitoring for degradation over time",
      });
    }
  }

  sleep(1);
}

export function teardown(data) {
  const totalBad = metrics.getCounter("badResponses");
  logger.info("Soak test completed", {
    totalBadResponses: totalBad,
    note: "Review metrics for performance degradation trends over time",
  });
}
