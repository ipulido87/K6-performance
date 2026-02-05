import { getEnvNumber } from './env-loader.js';

/**
 * Dynamically builds k6 thresholds from .env variables.
 * Reads {PREFIX}_THRESHOLD_* variables for the given test type.
 *
 * Supported threshold variables:
 *   {PREFIX}_THRESHOLD_FAILED_RATE        -> http_req_failed: rate<X
 *   {PREFIX}_THRESHOLD_P95_DURATION       -> http_req_duration: p(95)<X
 *   {PREFIX}_THRESHOLD_P99_DURATION       -> http_req_duration: p(99)<X
 *   {PREFIX}_THRESHOLD_AVG_DURATION       -> http_req_duration: avg<X
 *   {PREFIX}_THRESHOLD_REJECTED_SEMAPHORE -> rejected_semaphore: count<X
 *   {PREFIX}_THRESHOLD_SHORTCIRCUIT       -> shortcircuit: count<X
 *   {PREFIX}_THRESHOLD_CIRCUIT_BREAKERS   -> shortcircuit: count<X (alias)
 *   {PREFIX}_THRESHOLD_SEMAPHORE          -> rejected_semaphore: count<X (alias)
 *   {PREFIX}_THRESHOLD_DROPPED            -> dropped_iterations: count<X
 */
export function getThresholds(testType) {
  const prefix = testType.toUpperCase();
  const thresholds = {};

  const failedRate = getEnvNumber(`${prefix}_THRESHOLD_FAILED_RATE`);
  if (failedRate !== undefined) {
    thresholds.http_req_failed = [`rate<${failedRate}`];
  }

  const durationChecks = [];
  const p95 = getEnvNumber(`${prefix}_THRESHOLD_P95_DURATION`);
  if (p95 !== undefined) durationChecks.push(`p(95)<${p95}`);

  const p99 = getEnvNumber(`${prefix}_THRESHOLD_P99_DURATION`);
  if (p99 !== undefined) durationChecks.push(`p(99)<${p99}`);

  const avg = getEnvNumber(`${prefix}_THRESHOLD_AVG_DURATION`);
  if (avg !== undefined) durationChecks.push(`avg<${avg}`);

  if (durationChecks.length > 0) {
    thresholds.http_req_duration = durationChecks;
  }

  const semaphore = getEnvNumber(`${prefix}_THRESHOLD_REJECTED_SEMAPHORE`)
    ?? getEnvNumber(`${prefix}_THRESHOLD_SEMAPHORE`);
  if (semaphore !== undefined) {
    thresholds.rejected_semaphore = [`count<${semaphore}`];
  }

  const shortcircuit = getEnvNumber(`${prefix}_THRESHOLD_SHORTCIRCUIT`)
    ?? getEnvNumber(`${prefix}_THRESHOLD_CIRCUIT_BREAKERS`);
  if (shortcircuit !== undefined) {
    thresholds.shortcircuit = [`count<${shortcircuit}`];
  }

  const dropped = getEnvNumber(`${prefix}_THRESHOLD_DROPPED`);
  if (dropped !== undefined) {
    thresholds.dropped_iterations = [`count<${dropped}`];
  }

  return thresholds;
}
