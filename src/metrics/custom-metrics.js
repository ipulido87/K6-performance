import { Counter, Trend, Rate, Gauge } from "k6/metrics";

export function createSoapMetrics() {
  return {
    badResponses: new Counter("bad_responses"),
    http500: new Counter("http_500"),
    http503: new Counter("http_503"),
    http504: new Counter("http_504"),
    timeouts: new Counter("timeouts"),

    rejectedSemaphore: new Counter("rejected_semaphore"),
    shortcircuit: new Counter("shortcircuit"),
    soapNotOk: new Counter("soap_not_ok"),

    payloadBytes: new Trend("payload_bytes"),
    payloadMB: new Trend("payload_mb"),

    responseSizeBytes: new Trend("response_size_bytes"),

    successRate: new Rate("success_rate"),

    soapProcessingTime: new Trend("soap_processing_time"),
  };
}

export function createSizeTestMetrics() {
  return {
    badResponses: new Counter("bad_responses"),
    maxSizeReached: new Gauge("max_size_reached_mb"),
    failureAtSize: new Gauge("failure_at_size_mb"),
    payloadBytes: new Trend("payload_bytes"),
    successRate: new Rate("success_rate"),
  };
}

export class MetricsManager {
  constructor(metrics) {
    this.metrics = metrics;
    this.counters = {};
  }

  recordBadResponse(response, context = {}) {
    this.metrics.badResponses.add(1);

    switch (response.status) {
      case 500:
        this.metrics.http500?.add(1);
        break;
      case 503:
        this.metrics.http503?.add(1);
        break;
      case 504:
        this.metrics.http504?.add(1);
        break;
      case 0:
        this.metrics.timeouts?.add(1);
        break;
    }

    const message = context.errorMessage || "";
    if (message === "REJECTED_SEMAPHORE_EXECUTION") {
      this.metrics.rejectedSemaphore?.add(1);
    } else if (message === "SHORTCIRCUIT") {
      this.metrics.shortcircuit?.add(1);
    }

    this.metrics.successRate?.add(0);
  }

  recordSuccess(response, context = {}) {
    this.metrics.successRate?.add(1);

    if (this.metrics.responseSizeBytes && response.body) {
      this.metrics.responseSizeBytes.add(response.body.length);
    }
  }

  recordPayloadSize(sizeBytes) {
    if (this.metrics.payloadBytes) {
      this.metrics.payloadBytes.add(sizeBytes);
    }

    if (this.metrics.payloadMB) {
      this.metrics.payloadMB.add(sizeBytes / (1024 * 1024));
    }
  }

  recordTiming(name, duration) {
    if (this.metrics[name]) {
      this.metrics[name].add(duration);
    }
  }

  increment(name) {
    if (!this.counters[name]) {
      this.counters[name] = 0;
    }
    this.counters[name]++;
    return this.counters[name];
  }

  getCounter(name) {
    return this.counters[name] || 0;
  }

  resetCounter(name) {
    this.counters[name] = 0;
  }
}

export function createMetricsManager() {
  const metrics = createSoapMetrics();
  return new MetricsManager(metrics);
}
