import http from "k6/http";
import { sleep } from "k6";

import { loadConfig } from "../../src/config/index.js";
import { createSoapBuilder } from "../../src/builders/index.js";
import { runSoapChecks } from "../../src/checks/index.js";
import { createMetricsManager } from "../../src/metrics/index.js";
import { createLogger } from "../../src/utils/index.js";

const config = loadConfig();
const logger = createLogger("smoke-test-no-thresholds");

const soapBuilder = createSoapBuilder(config.getAll());
const metrics = createMetricsManager();

export const options = {
  vus: 1,
  duration: "15s",
};

export function setup() {
  logger.info("Starting smoke test (no strict thresholds)", {
    environment: config.environment,
    url: config.get("url"),
  });
}

export default function () {
  const body = soapBuilder.buildSimple();

  const response = http.post(config.get("url"), body, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    timeout: config.get("timeout"),
    tags: { name: "DET-WS-SMOKE-NO-THRESHOLDS" },
  });

  const checkResult = runSoapChecks(response, { name: "Smoke" });

  if (checkResult) {
    metrics.recordSuccess(response);
  } else {
    metrics.recordBadResponse(response);
    logger.logBadResponse(response, {
      testType: "smoke",
      bodySize: body.length,
    });
  }

  sleep(0.1);
}

export function teardown(data) {
  logger.info("Smoke test completed (no thresholds enforced)");
}
