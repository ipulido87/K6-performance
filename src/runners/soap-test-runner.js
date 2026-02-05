import http from "k6/http";
import { sleep } from "k6";

import { loadConfig, getThresholds } from "../config/index.js";
import { createSoapBuilder } from "../builders/index.js";
import { validateSoapResponse } from "../checks/index.js";
import { createMetricsManager } from "../metrics/index.js";
import { createLogger, toMB } from "../utils/index.js";
import { getEnv, getEnvNumber } from "../config/env-loader.js";

/**
 * Creates a fully configured SOAP test with standard behavior.
 *
 * @param {string} testType - Test type identifier (e.g. "load", "stress")
 * @param {object} scenarioConfig - k6 scenario configuration object
 * @param {object} [opts] - Additional options
 * @param {string} [opts.tagName] - Custom tag name (defaults to "DET-WS-{TYPE}")
 * @param {string} [opts.sleepKey] - Env key for sleep duration (defaults to "{TYPE}_SLEEP")
 * @param {string} [opts.logEveryBadKey] - Env key for log interval (defaults to "{TYPE}_LOG_EVERY_BAD")
 * @param {string} [opts.timeoutKey] - Env key for timeout (defaults to config.timeout)
 * @param {object} [opts.setupInfo] - Extra info to log in setup
 * @returns {{ options, setup, default: function, teardown }}
 */
export function createSoapTest(testType, scenarioConfig, opts = {}) {
  const prefix = testType.toUpperCase();
  const config = loadConfig();
  const logger = createLogger(`${testType}-test`);

  const ACTIVITIES = getEnvNumber("ACTIVITIES", 1);
  const SIZE_MB = getEnvNumber("SIZE_MB", 0);
  const LOG_EVERY_BAD = getEnvNumber(`${prefix}_LOG_EVERY_BAD`, 50);
  const SLEEP_TIME = getEnvNumber(opts.sleepKey ?? `${prefix}_SLEEP`, 0.1);
  const TAG_NAME = opts.tagName ?? `DET-WS-${prefix}`;
  const TIMEOUT = opts.timeoutKey
    ? getEnv(opts.timeoutKey)
    : config.get("timeout");

  const soapBuilder = createSoapBuilder(config.getAll());
  const metrics = createMetricsManager();

  const options = {
    scenarios: scenarioConfig,
    thresholds: getThresholds(testType),
  };

  function setup() {
    logger.info(`Starting ${testType} test`, {
      environment: config.environment,
      url: config.get("url"),
      activities: ACTIVITIES,
      sizeMB: SIZE_MB || "dynamic",
      ...opts.setupInfo,
    });
  }

  function run() {
    const body = SIZE_MB > 0
      ? soapBuilder.buildWithTargetSize(SIZE_MB)
      : soapBuilder.buildWithActivities(ACTIVITIES);

    const bodySize = body.length;
    metrics.recordPayloadSize(bodySize);

    const tags = {
      name: TAG_NAME,
      size_mb: SIZE_MB > 0 ? String(SIZE_MB) : toMB(bodySize).toFixed(2),
      activities: String(ACTIVITIES),
    };

    const response = http.post(config.get("url"), body, {
      headers: { "Content-Type": "text/xml; charset=utf-8" },
      timeout: TIMEOUT,
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
      if (badCount <= 3 || (LOG_EVERY_BAD > 0 && badCount % LOG_EVERY_BAD === 0)) {
        const { errors } = validation;
        logger.logBadResponse(response, {
          testType,
          sizeMB: toMB(bodySize).toFixed(2),
          errorType: errors.message,
          isRejectedSemaphore: errors.isRejectedSemaphore,
          isShortCircuit: errors.isShortCircuit,
          isTimeout: errors.isTimeout,
          badCount,
        });
      }
    }

    if (SLEEP_TIME > 0) sleep(SLEEP_TIME);
  }

  function teardown() {
    const totalBad = metrics.getCounter("badResponses");
    logger.info(`${testType} test completed`, {
      totalBadResponses: totalBad,
    });
  }

  return { options, setup, default: run, teardown };
}
