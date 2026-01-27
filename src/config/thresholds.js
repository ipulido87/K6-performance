import { getEnvNumber } from './env-loader.js';

// ============================================
// SMOKE TEST - Validación básica de funcionalidad
// Objetivo: Verificar que la app responde correctamente con carga mínima
// ============================================
export const smokeThresholds = {
  http_req_failed: [`rate<${getEnvNumber('SMOKE_THRESHOLD_FAILED_RATE', 0.01)}`],  // < 1% errores
  http_req_duration: [
    `p(95)<${getEnvNumber('SMOKE_THRESHOLD_P95_DURATION', 3000)}`,   // 95% bajo 3s
    `p(99)<${getEnvNumber('SMOKE_THRESHOLD_P99_DURATION', 5000)}`    // 99% bajo 5s
  ],
};

// ============================================
// LOAD TEST - Comportamiento bajo carga normal esperada
// Objetivo: Simular tráfico típico de producción
// ============================================
export const loadThresholds = {
  http_req_failed: [`rate<${getEnvNumber('LOAD_THRESHOLD_FAILED_RATE', 0.05)}`],  // < 5% errores
  http_req_duration: [
    `p(95)<${getEnvNumber('LOAD_THRESHOLD_P95_DURATION', 8000)}`,    // 95% bajo 8s
    `p(99)<${getEnvNumber('LOAD_THRESHOLD_P99_DURATION', 15000)}`    // 99% bajo 15s
  ],
};

// ============================================
// STRESS TEST - Encontrar el punto de ruptura
// Objetivo: Observar cómo se degrada el sistema bajo presión extrema
// Thresholds MUY permisivos - el objetivo es MEDIR, no aprobar/fallar
// ============================================
export const stressThresholds = {
  http_req_failed: [`rate<${getEnvNumber('STRESS_THRESHOLD_FAILED_RATE', 0.50)}`],  // < 50% errores (permisivo)
  http_req_duration: [
    `p(95)<${getEnvNumber('STRESS_THRESHOLD_P95_DURATION', 60000)}`,   // 95% bajo 60s
    `p(99)<${getEnvNumber('STRESS_THRESHOLD_P99_DURATION', 90000)}`    // 99% bajo 90s
  ],
  // Métricas de observación - umbrales altos para no fallar, solo medir
  rejected_semaphore: ["count<1e9"],
  shortcircuit: ["count<1e9"],
};

// ============================================
// CAPACITY TEST - Encontrar capacidad saludable máxima
// Objetivo: Identificar el límite donde el sistema cumple SLAs sin degradarse
// ============================================
export const capacityThresholds = {
  http_req_failed: [`rate<${getEnvNumber('CAPACITY_THRESHOLD_FAILED_RATE', 0.05)}`],  // < 5% errores
  http_req_duration: [
    `p(95)<${getEnvNumber('CAPACITY_THRESHOLD_P95_DURATION', 5000)}`,   // 95% bajo 5s
    `p(99)<${getEnvNumber('CAPACITY_THRESHOLD_P99_DURATION', 10000)}`   // 99% bajo 10s
  ],
  // Estos indican que el sistema entró en modo de auto-protección
  shortcircuit: [`count<${getEnvNumber('CAPACITY_THRESHOLD_CIRCUIT_BREAKERS', 10)}`],
  rejected_semaphore: [`count<${getEnvNumber('CAPACITY_THRESHOLD_SEMAPHORE', 10)}`],
  dropped_iterations: [`count<${getEnvNumber('CAPACITY_THRESHOLD_DROPPED', 50)}`],
};

// ============================================
// SPIKE TEST - Resistencia a picos repentinos de tráfico
// Objetivo: Ver cómo maneja ráfagas súbitas de usuarios
// ============================================
export const spikeThresholds = {
  http_req_failed: [`rate<${getEnvNumber('SPIKE_THRESHOLD_FAILED_RATE', 0.20)}`],  // < 20% errores
  http_req_duration: [
    `p(95)<${getEnvNumber('SPIKE_THRESHOLD_P95_DURATION', 30000)}`,   // 95% bajo 30s
    `p(99)<${getEnvNumber('SPIKE_THRESHOLD_P99_DURATION', 45000)}`    // 99% bajo 45s
  ],
};

// ============================================
// SOAK TEST - Estabilidad a largo plazo
// Objetivo: Detectar memory leaks, degradación gradual, etc.
// ============================================
export const soakThresholds = {
  http_req_failed: [`rate<${getEnvNumber('SOAK_THRESHOLD_FAILED_RATE', 0.05)}`],  // < 5% errores
  http_req_duration: [
    `p(95)<${getEnvNumber('SOAK_THRESHOLD_P95_DURATION', 10000)}`,    // 95% bajo 10s
    `p(99)<${getEnvNumber('SOAK_THRESHOLD_P99_DURATION', 15000)}`,    // 99% bajo 15s
    `avg<${getEnvNumber('SOAK_THRESHOLD_AVG_DURATION', 5000)}`        // Promedio bajo 5s
  ],
};

// ============================================
// SIZE TEST - Límites de tamaño de payload
// Objetivo: Encontrar el tamaño máximo de payload que el sistema maneja
// ============================================
export const sizeThresholds = {
  http_req_failed: [`rate<${getEnvNumber('SIZE_THRESHOLD_FAILED_RATE', 0.30)}`],  // < 30% errores
  http_req_duration: [`p(95)<${getEnvNumber('SIZE_THRESHOLD_P95_DURATION', 60000)}`],  // 95% bajo 60s
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
