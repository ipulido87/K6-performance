import { getEnv, getEnvNumber } from './env-loader.js';

// ============================================
// SMOKE TEST - Validación básica de funcionalidad
// ============================================
export const smokeThresholds = {
  http_req_failed: [`rate<${getEnvNumber('SMOKE_THRESHOLD_FAILED_RATE', 0.01)}`],
  http_req_duration: [
    `p(95)<${getEnvNumber('SMOKE_THRESHOLD_P95_DURATION', 2000)}`,
    `p(99)<${getEnvNumber('SMOKE_THRESHOLD_P99_DURATION', 3000)}`
  ],
};

// ============================================
// LOAD TEST - Comportamiento bajo carga esperada
// ============================================
export const loadThresholds = {
  http_req_failed: [`rate<${getEnvNumber('LOAD_THRESHOLD_FAILED_RATE', 0.10)}`],
  http_req_duration: [
    `p(95)<${getEnvNumber('LOAD_THRESHOLD_P95_DURATION', 10000)}`,
    `p(99)<${getEnvNumber('LOAD_THRESHOLD_P99_DURATION', 15000)}`
  ],
};

// ============================================
// STRESS TEST - Encontrar el punto de ruptura
// Thresholds laxos para observar dónde rompe el sistema
// ============================================
export const stressThresholds = {
  http_req_failed: [`rate<${getEnvNumber('STRESS_THRESHOLD_FAILED_RATE', 0.05)}`],
  http_req_duration: [
    `p(95)<${getEnvNumber('STRESS_THRESHOLD_P95_DURATION', 45000)}`,
    `p(99)<${getEnvNumber('STRESS_THRESHOLD_P99_DURATION', 60000)}`
  ],
  rejected_semaphore: ["count<1e9"],   // Solo para medir, no para fallar
  shortcircuit: ["count<1e9"],          // Solo para medir, no para fallar
};

// ============================================
// CAPACITY TEST - Encontrar capacidad saludable máxima
// Thresholds estrictos para identificar el límite donde el sistema cumple SLA
// ============================================
export const capacityThresholds = {
  http_req_failed: [`rate<${getEnvNumber('CAPACITY_THRESHOLD_FAILED_RATE', 0.01)}`],
  http_req_duration: [
    `p(95)<${getEnvNumber('CAPACITY_THRESHOLD_P95_DURATION', 2000)}`,
    `p(99)<${getEnvNumber('CAPACITY_THRESHOLD_P99_DURATION', 5000)}`
  ],
  shortcircuit: ["count==0"],                        // Cero circuit breakers
  rejected_semaphore: ["count==0"],                  // Cero rechazos por semáforo
  dropped_iterations: ["count==0"],                  // Cero iteraciones perdidas
};

// ============================================
// SPIKE TEST - Resistencia a picos de tráfico
// ============================================
export const spikeThresholds = {
  http_req_failed: [`rate<${getEnvNumber('SPIKE_THRESHOLD_FAILED_RATE', 0.15)}`],
  http_req_duration: [
    `p(95)<${getEnvNumber('SPIKE_THRESHOLD_P95_DURATION', 20000)}`,
    `p(99)<${getEnvNumber('SPIKE_THRESHOLD_P99_DURATION', 30000)}`
  ],
};

// ============================================
// SOAK TEST - Estabilidad a largo plazo
// ============================================
export const soakThresholds = {
  http_req_failed: [`rate<${getEnvNumber('SOAK_THRESHOLD_FAILED_RATE', 0.05)}`],
  http_req_duration: [
    `p(95)<${getEnvNumber('SOAK_THRESHOLD_P95_DURATION', 8000)}`,
    `p(99)<${getEnvNumber('SOAK_THRESHOLD_P99_DURATION', 12000)}`,
    `avg<${getEnvNumber('SOAK_THRESHOLD_AVG_DURATION', 5000)}`
  ],
};

export const sizeThresholds = {
  http_req_failed: [`rate<${getEnvNumber('SIZE_THRESHOLD_FAILED_RATE', 0.20)}`],
  http_req_duration: [`p(95)<${getEnvNumber('SIZE_THRESHOLD_P95_DURATION', 45000)}`],
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
