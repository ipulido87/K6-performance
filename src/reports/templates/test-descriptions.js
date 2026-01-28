/**
 * Test Type Descriptions
 * Self-explanatory descriptions for each type of performance test
 */

export const testDescriptions = {
  smoke: {
    title: 'SMOKE TEST',
    icon: '🔥',
    objective: 'Verify basic functionality with minimal load',
    shortDescription: 'A quick sanity check to ensure the system works correctly under minimal stress.',
    longDescription: `The Smoke Test is the first test you should run. It uses minimal load (1 virtual user)
to verify that the system is working correctly at a fundamental level.

If this test fails, there's a critical problem that must be fixed before running any other tests.
Think of it as checking if the engine starts before doing a full road test.`,
    whenToRun: [
      'Before any other performance test',
      'After each deployment or release',
      'As part of CI/CD pipeline for quick validation',
      'After infrastructure changes',
    ],
    whatItFinds: [
      'Basic connectivity issues',
      'Authentication/authorization problems',
      'Critical bugs that break functionality',
      'Configuration errors',
      'Deployment failures',
    ],
    typicalConfig: {
      vus: '1',
      duration: '15-30 seconds',
      errorRateThreshold: '< 1%',
      p95Threshold: '< 2-3 seconds',
    },
    interpretation: {
      pass: 'System works correctly. Proceed with more intensive tests.',
      fail: 'Critical issue detected. DO NOT run other tests until fixed.',
    },
  },

  load: {
    title: 'LOAD TEST',
    icon: '📊',
    objective: 'Evaluate system behavior under expected normal load',
    shortDescription: 'Simulates typical production traffic to measure baseline performance.',
    longDescription: `The Load Test simulates your expected production load over an extended period.
It uses a realistic number of virtual users performing typical operations.

This test answers the question: "How does our system perform under normal conditions?"
The results establish your performance baseline and help identify SLA compliance.`,
    whenToRun: [
      'After successful smoke test',
      'Before production releases',
      'Periodically to track performance trends',
      'After significant code or infrastructure changes',
    ],
    whatItFinds: [
      'Baseline performance metrics',
      'SLA compliance verification',
      'Resource utilization under normal load',
      'Connection pool adequacy',
      'Slow queries or operations',
    ],
    typicalConfig: {
      vus: '10-100 (based on expected traffic)',
      duration: '5-15 minutes',
      errorRateThreshold: '< 5%',
      p95Threshold: '< 5-10 seconds',
    },
    interpretation: {
      pass: 'System handles normal load within SLA. Ready for production.',
      fail: 'Performance issues under normal load. Optimize before release.',
    },
  },

  stress: {
    title: 'STRESS TEST',
    icon: '💪',
    objective: 'Find the system breaking point',
    shortDescription: 'Progressively increases load to find the limit where the system fails.',
    longDescription: `The Stress Test pushes the system beyond normal capacity to find its breaking point.
Load is gradually increased until the system starts failing or degrading significantly.

This test answers: "What is our maximum capacity?" and "How does the system behave when overloaded?"

Note: This test is expected to eventually fail. The goal is to OBSERVE and MEASURE, not to pass.`,
    whenToRun: [
      'Periodically to understand capacity limits',
      'Before major traffic events (campaigns, launches)',
      'When planning infrastructure scaling',
      'After significant architecture changes',
    ],
    whatItFinds: [
      'Maximum throughput capacity',
      'Breaking point (when errors start)',
      'Degradation pattern under extreme load',
      'Resource bottlenecks (CPU, memory, connections)',
      'System behavior during and after overload',
    ],
    typicalConfig: {
      vus: 'Ramping from low to very high',
      duration: '5-10 minutes',
      errorRateThreshold: '< 50% (permissive - goal is to measure)',
      p95Threshold: '< 60 seconds (permissive)',
    },
    interpretation: {
      observe: 'Look for the exact point where errors begin',
      identify: 'Note the load level where P95 degrades significantly',
      capacity: 'Maximum sustainable load is just before degradation starts',
    },
  },

  capacity: {
    title: 'CAPACITY TEST',
    icon: '📈',
    objective: 'Find maximum load while maintaining SLA compliance',
    shortDescription: 'Determines the highest load the system can handle while meeting all SLAs.',
    longDescription: `The Capacity Test finds the maximum throughput your system can sustain while still
meeting all quality thresholds. Unlike stress testing, this test SHOULD pass.

It answers: "What's the maximum load we can handle while staying within our SLA?"

This is critical for capacity planning and setting realistic traffic limits.`,
    whenToRun: [
      'After stress test to find sustainable limit',
      'For capacity planning',
      'Before committing to SLA contracts',
      'When planning auto-scaling thresholds',
    ],
    whatItFinds: [
      'Maximum sustainable throughput',
      'Safe operating limits',
      'Ideal auto-scaling trigger points',
      'Buffer before performance degradation',
    ],
    typicalConfig: {
      vus: 'Ramping to expected peak',
      duration: '5-10 minutes',
      errorRateThreshold: '< 5%',
      p95Threshold: '< 5 seconds',
    },
    interpretation: {
      pass: 'System can handle this load while meeting all SLAs.',
      fail: 'Load exceeds sustainable capacity. Scale down or optimize.',
    },
  },

  spike: {
    title: 'SPIKE TEST',
    icon: '⚡',
    objective: 'Test system response to sudden traffic surges',
    shortDescription: 'Simulates sudden traffic spikes to test system resilience and recovery.',
    longDescription: `The Spike Test simulates sudden, extreme increases in traffic - like what happens
during a viral event, marketing campaign launch, or DDoS attack.

It answers: "Can our system handle sudden traffic bursts?" and "How quickly does it recover?"

Unlike gradual ramping, this test immediately jumps to high load, holds it, then drops.`,
    whenToRun: [
      'Before marketing campaigns or product launches',
      'To test auto-scaling responsiveness',
      'After implementing caching or CDN',
      'To validate rate limiting and circuit breakers',
    ],
    whatItFinds: [
      'System behavior under sudden load',
      'Auto-scaling speed and effectiveness',
      'Queue and buffer adequacy',
      'Recovery time after spike subsides',
      'Memory leaks or resource exhaustion',
    ],
    typicalConfig: {
      vus: 'Quick ramp to 10-100x normal',
      duration: '3-5 minutes',
      errorRateThreshold: '< 20% (some errors expected during spike)',
      p95Threshold: '< 30 seconds (elevated during spike)',
    },
    interpretation: {
      pass: 'System handled the spike and recovered. Resilience confirmed.',
      fail: 'System couldn\'t handle sudden load. Add buffering or scaling.',
    },
  },

  soak: {
    title: 'SOAK TEST (Endurance)',
    icon: '🏊',
    objective: 'Verify stability over extended periods',
    shortDescription: 'Runs moderate load for hours to find memory leaks and degradation over time.',
    longDescription: `The Soak Test (also called Endurance Test) runs a moderate, steady load for an extended
period (hours or days) to detect problems that only appear over time.

It answers: "Is our system stable for long-running operations?" and "Are there any memory leaks?"

Short tests might miss issues like memory leaks, connection pool exhaustion, or gradual degradation.`,
    whenToRun: [
      'Before major releases',
      'After introducing new dependencies',
      'Periodically for production stability assurance',
      'When investigating intermittent production issues',
    ],
    whatItFinds: [
      'Memory leaks',
      'Connection pool leaks',
      'Gradual performance degradation',
      'Log file growth issues',
      'Database connection exhaustion',
      'Thread/goroutine leaks',
    ],
    typicalConfig: {
      vus: 'Moderate, steady (10-50)',
      duration: '30 minutes to several hours',
      errorRateThreshold: '< 5%',
      p95Threshold: '< 10 seconds',
    },
    interpretation: {
      pass: 'System remains stable over time. No leaks detected.',
      fail: 'Degradation detected. Investigate resource leaks.',
    },
  },

  size: {
    title: 'SIZE TEST (Payload Limit)',
    icon: '📦',
    objective: 'Find maximum payload size the system can handle',
    shortDescription: 'Tests how the system handles increasingly large request payloads.',
    longDescription: `The Size Test progressively increases the request payload size to find the
maximum that the system can process successfully.

It answers: "What's the largest request our system can handle?" and "How does response time
scale with payload size?"

This is important for APIs that process file uploads, large documents, or batch operations.`,
    whenToRun: [
      'When designing file upload features',
      'Before implementing batch APIs',
      'To set documented payload limits',
      'When optimizing large data processing',
    ],
    whatItFinds: [
      'Maximum payload size',
      'Payload size vs. response time relationship',
      'Memory usage with large payloads',
      'Timeout thresholds',
      'Serialization/deserialization limits',
    ],
    typicalConfig: {
      vus: '1 (sequential size testing)',
      duration: 'Variable (one iteration per size)',
      errorRateThreshold: '< 30% (finding limits)',
      p95Threshold: '< 60 seconds (large payloads are slow)',
    },
    interpretation: {
      observe: 'Note the size where errors begin',
      limit: 'Set documented limit slightly below breaking point',
      optimize: 'If needed, implement chunking for larger payloads',
    },
  },

  combined: {
    title: 'COMBINED TEST',
    icon: '🔄',
    objective: 'Test multiple scenarios running simultaneously',
    shortDescription: 'Runs multiple test scenarios in parallel to simulate realistic mixed traffic.',
    longDescription: `The Combined Test runs multiple different scenarios simultaneously to simulate
realistic production traffic where different types of requests happen concurrently.

It answers: "How does the system behave when handling different workloads at the same time?"

This is more realistic than single-scenario tests because production traffic is always mixed.`,
    whenToRun: [
      'Final validation before production releases',
      'To test resource contention between features',
      'When multiple APIs share infrastructure',
      'To validate priority/QoS configurations',
    ],
    whatItFinds: [
      'Resource contention issues',
      'Priority handling effectiveness',
      'Cross-feature performance impact',
      'Shared resource bottlenecks',
    ],
    typicalConfig: {
      vus: 'Split across scenarios',
      duration: '5-15 minutes',
      errorRateThreshold: 'Per scenario',
      p95Threshold: 'Per scenario',
    },
    interpretation: {
      pass: 'All scenarios meet their respective SLAs.',
      fail: 'Some scenarios impact others. Isolate or prioritize.',
    },
  },

  'traffic-smoke': {
    title: 'TRAFFIC MONITORING SMOKE TEST',
    icon: '🚦',
    objective: 'Verify Traffic Monitoring API basic functionality',
    shortDescription: 'Quick validation of the Traffic Monitoring REST API.',
    longDescription: `Similar to the main smoke test, but specifically for the Traffic Monitoring API.
Verifies that the monitoring endpoints are functional and responsive.`,
    whenToRun: ['Before load testing the monitoring API'],
    whatItFinds: ['Basic API functionality issues'],
    typicalConfig: {
      vus: '1',
      duration: '15 seconds',
    },
    interpretation: {
      pass: 'Traffic Monitoring API is functional.',
      fail: 'API issues detected. Check configuration.',
    },
  },

  'traffic-load': {
    title: 'TRAFFIC MONITORING LOAD TEST',
    icon: '🚦',
    objective: 'Evaluate Traffic Monitoring API under normal load',
    shortDescription: 'Load test for the Traffic Monitoring REST API.',
    longDescription: `Tests the Traffic Monitoring API under expected production load to ensure it can
handle the typical volume of monitoring requests.`,
    whenToRun: ['After successful traffic smoke test'],
    whatItFinds: ['API performance baseline', 'Resource usage'],
    typicalConfig: {
      vus: '10-50',
      duration: '5-10 minutes',
    },
    interpretation: {
      pass: 'API handles normal load successfully.',
      fail: 'Performance issues under load.',
    },
  },

  'traffic-stress': {
    title: 'TRAFFIC MONITORING STRESS TEST',
    icon: '🚦',
    objective: 'Find Traffic Monitoring API limits',
    shortDescription: 'Stress test to find the breaking point of the Traffic Monitoring API.',
    longDescription: `Pushes the Traffic Monitoring API beyond normal capacity to understand its limits
and behavior under extreme load.`,
    whenToRun: ['To understand API capacity limits'],
    whatItFinds: ['Maximum API capacity', 'Failure modes'],
    typicalConfig: {
      vus: 'Ramping to high levels',
      duration: '5-10 minutes',
    },
    interpretation: {
      observe: 'Note when errors start appearing.',
    },
  },
};

export function getTestDescription(testType) {
  const normalizedType = testType.toLowerCase().replace(/-/g, '-');

  // Direct match
  if (testDescriptions[normalizedType]) {
    return testDescriptions[normalizedType];
  }

  // Try without 'soap-' prefix
  const withoutPrefix = normalizedType.replace('soap-', '');
  if (testDescriptions[withoutPrefix]) {
    return testDescriptions[withoutPrefix];
  }

  // Try to match by keyword
  for (const [key, desc] of Object.entries(testDescriptions)) {
    if (normalizedType.includes(key) || key.includes(normalizedType)) {
      return desc;
    }
  }

  // Default generic description
  return {
    title: testType.toUpperCase() + ' TEST',
    icon: '🧪',
    objective: 'Performance testing',
    shortDescription: 'Custom performance test execution.',
    longDescription: 'A custom performance test for your application.',
    whenToRun: ['As needed'],
    whatItFinds: ['Performance metrics'],
    typicalConfig: {},
    interpretation: {
      pass: 'Test completed successfully.',
      fail: 'Performance issues detected.',
    },
  };
}

export function getAllTestTypes() {
  return Object.keys(testDescriptions);
}
