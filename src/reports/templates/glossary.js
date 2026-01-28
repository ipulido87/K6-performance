/**
 * Metrics Glossary
 * Self-explanatory definitions of all performance metrics
 */

export const metricsGlossary = {
  // Percentiles
  percentiles: {
    title: 'Response Time Percentiles',
    description: `Percentiles show what percentage of requests completed faster than the given value.
They are more meaningful than averages because they show the actual user experience distribution.`,
    metrics: {
      p50: {
        name: 'P50 (Median)',
        short: '50% of requests were faster than this value',
        long: `The median response time. Half of all requests completed faster than this value,
and half were slower. This represents the "typical" user experience.`,
      },
      p90: {
        name: 'P90 (90th Percentile)',
        short: '90% of requests were faster than this value',
        long: `90% of requests completed faster than this value. Only 10% of users experienced
longer response times. This is a good indicator of general performance.`,
      },
      p95: {
        name: 'P95 (95th Percentile)',
        short: '95% of requests were faster than this value',
        long: `The most commonly used SLA metric. 95% of requests completed faster than this value.
If your SLA states "P95 < 3s", it means 95% of users must get a response within 3 seconds.`,
      },
      p99: {
        name: 'P99 (99th Percentile)',
        short: '99% of requests were faster than this value',
        long: `Shows performance for almost all users except the slowest 1%. This helps identify
occasional slowdowns that might affect some users but aren't visible in averages.`,
      },
    },
  },

  // Throughput
  throughput: {
    title: 'Throughput Metrics',
    metrics: {
      rps: {
        name: 'RPS (Requests Per Second)',
        short: 'Number of requests the system processes per second',
        long: `Measures how many requests the system can handle per second. Higher RPS indicates
better capacity. A sudden drop in RPS during load often signals a bottleneck.`,
        interpretation: {
          low: '< 1 RPS: System under light load or processing slowly',
          normal: '1-10 RPS: Typical workload range',
          high: '> 10 RPS: High demand, monitor for degradation',
        },
      },
      iterations: {
        name: 'Iterations',
        short: 'Total number of complete test cycles executed',
        long: `Each iteration represents one complete execution of the test scenario by a virtual user.
More iterations provide more statistical confidence in the results.`,
      },
    },
  },

  // Error Metrics
  errors: {
    title: 'Error Metrics',
    metrics: {
      errorRate: {
        name: 'Error Rate',
        short: 'Percentage of requests that failed',
        long: `The ratio of failed requests to total requests, expressed as a percentage.
This is a critical SLA metric that directly impacts user experience.`,
        interpretation: {
          excellent: '< 0.1%: Excellent - Almost no errors',
          good: '0.1% - 1%: Good - Acceptable for production',
          acceptable: '1% - 5%: Acceptable - Normal under heavy load',
          concerning: '5% - 10%: Concerning - Investigate root cause',
          critical: '> 10%: Critical - System is degraded',
        },
      },
      http500: {
        name: 'HTTP 500 Errors',
        short: 'Internal Server Error count',
        long: `Server-side errors indicating bugs, crashes, or resource exhaustion.
Any occurrence requires investigation as it indicates server instability.`,
      },
      http503: {
        name: 'HTTP 503 Errors',
        short: 'Service Unavailable count',
        long: `Indicates the server is temporarily unable to handle requests, often due to
overload or maintenance. May include rate limiting or circuit breaker activations.`,
      },
      http504: {
        name: 'HTTP 504 Errors',
        short: 'Gateway Timeout count',
        long: `The server acting as gateway didn't receive a timely response from upstream.
Often indicates backend processing is too slow or connections are timing out.`,
      },
      timeouts: {
        name: 'Timeouts',
        short: 'Requests that exceeded the timeout threshold',
        long: `Requests that didn't receive any response within the configured timeout period.
High timeout counts indicate severe performance issues or network problems.`,
      },
    },
  },

  // Thresholds
  thresholds: {
    title: 'Thresholds (Pass/Fail Criteria)',
    description: `Thresholds are predefined limits that determine if a test passes or fails.
They are based on your Service Level Objectives (SLOs) and represent acceptable performance levels.`,
    interpretation: {
      passed: 'The metric value is within acceptable limits',
      failed: 'The metric value exceeds the defined threshold',
    },
    example: `Example: "http_req_duration{p(95)}<2000" means 95% of requests
must complete in less than 2000ms (2 seconds) for the test to pass.`,
  },

  // K6 Built-in Metrics
  k6Metrics: {
    title: 'K6 HTTP Metrics',
    metrics: {
      http_req_duration: {
        name: 'HTTP Request Duration',
        short: 'Total time for the complete request-response cycle',
        long: `The total time from sending the request to receiving the complete response.
Includes: DNS lookup, TCP connection, TLS handshake, sending data, waiting, and receiving.`,
      },
      http_req_waiting: {
        name: 'HTTP Request Waiting (TTFB)',
        short: 'Time to First Byte - time waiting for server response',
        long: `Time from sending the request to receiving the first byte of the response.
This is primarily server processing time and is a key indicator of backend performance.`,
      },
      http_req_connecting: {
        name: 'HTTP Connecting Time',
        short: 'Time spent establishing TCP connection',
        long: `Time taken to establish the TCP connection to the server.
High values may indicate network issues or server connection queue problems.`,
      },
      http_req_blocked: {
        name: 'HTTP Blocked Time',
        short: 'Time spent waiting for a free connection slot',
        long: `Time the request spent waiting before it could be sent, typically waiting
for a connection from the connection pool. High values indicate connection exhaustion.`,
      },
      http_req_sending: {
        name: 'HTTP Sending Time',
        short: 'Time spent sending request data',
        long: `Time taken to send the request body to the server. Usually very fast unless
you're sending large payloads or have bandwidth limitations.`,
      },
      http_req_receiving: {
        name: 'HTTP Receiving Time',
        short: 'Time spent receiving response data',
        long: `Time taken to receive the response body from the server. Depends on response
size and network bandwidth.`,
      },
      http_req_failed: {
        name: 'HTTP Request Failed',
        short: 'Rate of failed HTTP requests',
        long: `Binary counter (0 or 1) for each request indicating success or failure.
The aggregated rate shows what percentage of all requests failed.`,
      },
      http_reqs: {
        name: 'HTTP Requests',
        short: 'Total count of HTTP requests made',
        long: `The total number of HTTP requests generated during the test.
Used to calculate throughput (RPS) when divided by test duration.`,
      },
    },
  },

  // Custom Metrics
  customMetrics: {
    title: 'Custom Application Metrics',
    metrics: {
      bad_responses: {
        name: 'Bad Responses',
        short: 'Total count of responses that failed validation',
        long: `Responses that returned successfully (HTTP 200) but failed business logic
validation. For example, SOAP responses with Status != OK.`,
      },
      rejected_semaphore: {
        name: 'Rejected Semaphore',
        short: 'Requests rejected due to semaphore limits',
        long: `Count of requests rejected because the server's semaphore (concurrent request limiter)
was at capacity. Indicates the server is protecting itself from overload.`,
      },
      shortcircuit: {
        name: 'Circuit Breaker Activations',
        short: 'Times the circuit breaker was triggered',
        long: `Count of requests rejected by the circuit breaker pattern. This protection mechanism
stops sending requests when too many failures occur, preventing cascade failures.`,
      },
      success_rate: {
        name: 'Success Rate',
        short: 'Percentage of successful requests',
        long: `The ratio of successful requests to total requests. This is the inverse of error rate.
A value of 1.0 (100%) means all requests succeeded.`,
      },
      payload_bytes: {
        name: 'Payload Size (Bytes)',
        short: 'Size of request payload in bytes',
        long: `The size of the data sent in each request. Used to analyze if payload size
correlates with response time or error rate.`,
      },
      soap_processing_time: {
        name: 'SOAP Processing Time',
        short: 'Server-side processing time for SOAP requests',
        long: `The time the server spent processing the SOAP request, extracted from response
headers or calculated from TTFB.`,
      },
    },
  },

  // Virtual Users
  virtualUsers: {
    title: 'Virtual Users (VUs)',
    description: `Virtual Users simulate concurrent users making requests to your application.
Each VU runs in parallel, executing the test script independently.`,
    metrics: {
      vus: {
        name: 'VUs (Current)',
        short: 'Number of active virtual users at this moment',
        long: `The number of virtual users currently executing the test script.
This changes during ramping phases.`,
      },
      vus_max: {
        name: 'VUs Max',
        short: 'Maximum number of virtual users during the test',
        long: `The highest number of virtual users that were active at any point during the test.
This represents the peak load applied to the system.`,
      },
    },
  },
};

export function getMetricExplanation(metricName) {
  const searchName = metricName.toLowerCase().replace(/_/g, '');

  for (const category of Object.values(metricsGlossary)) {
    if (category.metrics) {
      for (const [key, metric] of Object.entries(category.metrics)) {
        if (key.toLowerCase().replace(/_/g, '') === searchName) {
          return metric;
        }
      }
    }
  }

  return null;
}

export function getAllCategories() {
  return Object.entries(metricsGlossary).map(([key, value]) => ({
    key,
    title: value.title,
    description: value.description,
    metrics: value.metrics,
  }));
}
