import { getEnvNumber } from './env-loader.js';

// ============================================
// SMOKE TEST - Basic functionality validation
// Goal: Verify the app responds correctly under minimal load
// ============================================
export const smokeThresholds = {
  http_req_failed: [`rate<${getEnvNumber('SMOKE_THRESHOLD_FAILED_RATE', 0.01)}`],  // < 1% errors
  http_req_duration: [
    `p(95)<${getEnvNumber('SMOKE_THRESHOLD_P95_DURATION', 3000)}`,   // 95% under 3s
    `p(99)<${getEnvNumber('SMOKE_THRESHOLD_P99_DURATION', 5000)}`    // 99% under 5s
  ],
};

// ============================================
// LOAD TEST - Behavior under expected normal load
// Goal: Simulate typical production traffic
// ============================================
export const loadThresholds = {
  http_req_failed: [`rate<${getEnvNumber('LOAD_THRESHOLD_FAILED_RATE', 0.05)}`],  // < 5% errors
  http_req_duration: [
    `p(95)<${getEnvNumber('LOAD_THRESHOLD_P95_DURATION', 8000)}`,    // 95% under 8s
    `p(99)<${getEnvNumber('LOAD_THRESHOLD_P99_DURATION', 15000)}`    // 99% under 15s
  ],
};

// ============================================
// STRESS TEST - Find the breaking point
// Goal: Observe how the system degrades under extreme pressure
// Thresholds are VERY permissive - the goal is to MEASURE, not pass/fail
// ============================================
export const stressThresholds = {
  http_req_failed: [`rate<${getEnvNumber('STRESS_THRESHOLD_FAILED_RATE', 0.50)}`],  // < 50% errors (permissive)
  http_req_duration: [
    `p(95)<${getEnvNumber('STRESS_THRESHOLD_P95_DURATION', 60000)}`,   // 95% under 60s
    `p(99)<${getEnvNumber('STRESS_THRESHOLD_P99_DURATION', 90000)}`    // 99% under 90s
  ],
  // Observation metrics - high thresholds to avoid failing, just measure
  rejected_semaphore: ["count<1e9"],
  shortcircuit: ["count<1e9"],
};

// ============================================
// CAPACITY TEST - Find maximum healthy capacity
// Goal: Identify the limit where the system meets SLAs without degradation
// ============================================
export const capacityThresholds = {
  http_req_failed: [`rate<${getEnvNumber('CAPACITY_THRESHOLD_FAILED_RATE', 0.05)}`],  // < 5% errors
  http_req_duration: [
    `p(95)<${getEnvNumber('CAPACITY_THRESHOLD_P95_DURATION', 5000)}`,   // 95% under 5s
    `p(99)<${getEnvNumber('CAPACITY_THRESHOLD_P99_DURATION', 10000)}`   // 99% under 10s
  ],
  // These indicate the system entered self-protection mode
  shortcircuit: [`count<${getEnvNumber('CAPACITY_THRESHOLD_CIRCUIT_BREAKERS', 10)}`],
  rejected_semaphore: [`count<${getEnvNumber('CAPACITY_THRESHOLD_SEMAPHORE', 10)}`],
  dropped_iterations: [`count<${getEnvNumber('CAPACITY_THRESHOLD_DROPPED', 50)}`],
};

// ============================================
// SPIKE TEST - Resilience to sudden traffic spikes
// Goal: See how it handles sudden bursts of users
// ============================================
export const spikeThresholds = {
  http_req_failed: [`rate<${getEnvNumber('SPIKE_THRESHOLD_FAILED_RATE', 0.20)}`],  // < 20% errors
  http_req_duration: [
    `p(95)<${getEnvNumber('SPIKE_THRESHOLD_P95_DURATION', 30000)}`,   // 95% under 30s
    `p(99)<${getEnvNumber('SPIKE_THRESHOLD_P99_DURATION', 45000)}`    // 99% under 45s
  ],
};

// ============================================
// SOAK TEST - Long-term stability
// Goal: Detect memory leaks, gradual degradation, etc.
// ============================================
export const soakThresholds = {
  http_req_failed: [`rate<${getEnvNumber('SOAK_THRESHOLD_FAILED_RATE', 0.05)}`],  // < 5% errors
  http_req_duration: [
    `p(95)<${getEnvNumber('SOAK_THRESHOLD_P95_DURATION', 10000)}`,    // 95% under 10s
    `p(99)<${getEnvNumber('SOAK_THRESHOLD_P99_DURATION', 15000)}`,    // 99% under 15s
    `avg<${getEnvNumber('SOAK_THRESHOLD_AVG_DURATION', 5000)}`        // Average under 5s
  ],
};

// ============================================
// SIZE TEST - Payload size limits
// Goal: Find the maximum payload size the system can handle
// ============================================
export const sizeThresholds = {
  http_req_failed: [`rate<${getEnvNumber('SIZE_THRESHOLD_FAILED_RATE', 0.30)}`],  // < 30% errors
  http_req_duration: [`p(95)<${getEnvNumber('SIZE_THRESHOLD_P95_DURATION', 60000)}`],  // 95% under 60s
};

export function getThresholds(testType) {
  const thresholds = {
    smoke: smokeThresholds,
    load: loadThresholds,
    stress: stressThresholds,
    capacity: capacityThresholds,
    spike: spikeThresholds,
    soak: soakThresholds,
    size: sizeThresholds,
  };

  const threshold = thresholds[testType.toLowerCase()];

  if (!threshold) {
    throw new Error(
      `Unknown test type: ${testType}. Available: ${Object.keys(thresholds).join(", ")}`
    );
  }

  return threshold;
}
