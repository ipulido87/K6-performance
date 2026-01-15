import http from "k6/http";
import { sleep } from "k6";

import { loadConfig, getThresholds } from "../../src/config/index.js";
import { createSoapBuilder } from "../../src/builders/index.js";
import { validateSoapResponse } from "../../src/checks/index.js";
import { createMetricsManager } from "../../src/metrics/index.js";
import { createLogger, validateEnvNumber, toMB } from "../../src/utils/index.js";

const config = loadConfig();
const logger = createLogger("spike-test");

const ACTIVITIES = validateEnvNumber(__ENV.ACTIVITIES, 1, 1, 100);
const SIZE_MB = validateEnvNumber(__ENV.SIZE_MB, 0, 0, 100);
const SPIKE_VUS = validateEnvNumber(__ENV.SPIKE_VUS, 100, 10, 1000);

const soapBuilder = createSoapBuilder(config.getAll());
const metrics = createMetricsManager();

export const options = {
  scenarios: {
    spike: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 5 },
        { duration: "10s", target: SPIKE_VUS },
        { duration: "1m", target: SPIKE_VUS },
        { duration: "10s", target: 5 },
        { duration: "1m", target: 5 },
        { duration: "30s", target: 0 },
      ],
      gracefulStop: "30s",
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
