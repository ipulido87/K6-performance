import { getEnv, getEnvNumber } from './env-loader.js';

/**
 * Dynamically builds k6 stages from .env variables.
 * Reads {prefix}_STAGE{N}_DURATION and {prefix}_STAGE{N}_TARGET
 * until no more stages are found (max 20).
 *
 * @param {string} prefix - Environment variable prefix (e.g. "LOAD", "STRESS")
 * @param {object} [opts] - Options
 * @param {number} [opts.defaultTarget] - Default target if not specified
 * @returns {Array<{duration: string, target: number}>}
 */
export function buildStages(prefix, { defaultTarget = 0 } = {}) {
  const stages = [];

  for (let i = 1; i <= 20; i++) {
    const duration = getEnv(`${prefix}_STAGE${i}_DURATION`);
    if (!duration) break;
    const target = getEnvNumber(`${prefix}_STAGE${i}_TARGET`, defaultTarget);
    stages.push({ duration, target });
  }

  if (stages.length === 0) {
    throw new Error(`No stages found for prefix "${prefix}". Expected ${prefix}_STAGE1_DURATION in .env`);
  }

  return stages;
}
