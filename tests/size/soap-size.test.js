import http from "k6/http";
import { sleep } from "k6";

import { loadConfig, getThresholds } from "../../src/config/index.js";
import { createSoapBuilder } from "../../src/builders/index.js";
import { runSoapChecks } from "../../src/checks/index.js";
import { createSizeTestMetrics } from "../../src/metrics/index.js";
import {
  createLogger,
  toMB,
  byteSize,
} from "../../src/utils/index.js";
import { getEnv, getEnvNumber } from "../../src/config/env-loader.js";

const config = loadConfig();
const logger = createLogger("size-test");

const START_MB = getEnvNumber("SIZE_START_MB", 0.5);
const MAX_MB = getEnvNumber("SIZE_MAX_MB", 64);
const MODE = getEnv("SIZE_STEP_MODE", "double");
const ADD_MB = getEnvNumber("SIZE_STEP_MB", 1);

const soapBuilder = createSoapBuilder(config.getAll());
const metrics = createSizeTestMetrics();

function buildSizeSequence() {
  const sizes = [];
  let current = START_MB;

  while (current <= MAX_MB) {
    sizes.push(current);
    current = MODE === "add" ? current + ADD_MB : current * 2;
  }

  return sizes;
}

const SIZE_SEQUENCE = buildSizeSequence();

export const options = {
  vus: getEnvNumber("SIZE_VUS", 1),
  iterations: SIZE_SEQUENCE.length,
  thresholds: getThresholds("size"),
};

export function setup() {
  logger.info("Starting size test", {
    environment: config.environment,
    url: config.get("url"),
    startMB: START_MB,
    maxMB: MAX_MB,
    mode: MODE,
    totalIterations: SIZE_SEQUENCE.length,
    sequence: SIZE_SEQUENCE,
  });

  return { sizes: SIZE_SEQUENCE };
}

export default function (data) {
  const targetMB = data.sizes[__ITER];

  const body = soapBuilder.buildWithTargetSize(targetMB);
  const actualBytes = byteSize(body);
  const actualMB = toMB(actualBytes).toFixed(2);

  metrics.payloadBytes.add(actualBytes);

  const response = http.post(config.get("url"), body, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    timeout: getEnv("SIZE_TIMEOUT", "180s"),
    tags: {
      name: "DET-WS-SIZE",
      target_mb: String(targetMB),
      actual_mb: actualMB,
    },
  });

  const checkResult = runSoapChecks(response, {
    name: "Size Test",
    size: targetMB,
  });

  if (checkResult) {
    metrics.successRate.add(1);
    metrics.maxSizeReached.add(targetMB);

    logger.info(`Size test passed`, {
      targetMB,
      actualMB,
      status: response.status,
      duration: response.timings.duration,
    });

    if (__ITER === SIZE_SEQUENCE.length - 1) {
      logger.info(`Maximum size reached without failure`, {
        maxTestedMB: targetMB,
        recommendation: "Increase MAX_MB to continue testing",
      });
    }
  } else {
    metrics.badResponses.add(1);
    metrics.successRate.add(0);
    metrics.failureAtSize.add(targetMB);

    logger.error(`Size test FAILED - Breaking point found`, {
      targetMB,
      actualMB,
      status: response.status,
      bodySnippet: response.body ? response.body.substring(0, 200) : "",
    });
  }

  sleep(getEnvNumber("SIZE_SLEEP", 0.2));
}

export function teardown(data) {
  logger.info("Size test completed", {
    totalSizesTested: SIZE_SEQUENCE.length,
    sequence: SIZE_SEQUENCE,
  });
}
