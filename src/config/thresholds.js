// ============================================
// SMOKE TEST - Validación básica de funcionalidad
// ============================================
export const smokeThresholds = {
  http_req_failed: ["rate<0.01"],
  http_req_duration: ["p(95)<2000", "p(99)<3000"],
};

// ============================================
// LOAD TEST - Comportamiento bajo carga esperada
// ============================================
export const loadThresholds = {
  http_req_failed: ["rate<0.10"],
  http_req_duration: ["p(95)<10000", "p(99)<15000"],
};

// ============================================
// STRESS TEST - Encontrar el punto de ruptura
// Thresholds laxos para observar dónde rompe el sistema
// ============================================
export const stressThresholds = {
  http_req_failed: ["rate<0.05"],
  http_req_duration: ["p(95)<45000", "p(99)<60000"],
  rejected_semaphore: ["count<1e9"],   // Solo para medir, no para fallar
  shortcircuit: ["count<1e9"],          // Solo para medir, no para fallar
};

// ============================================
// CAPACITY TEST - Encontrar capacidad saludable máxima
// Thresholds estrictos para identificar el límite donde el sistema cumple SLA
// ============================================
export const capacityThresholds = {
  http_req_failed: ["rate<0.01"],                    // Máximo 1% de errores
  http_req_duration: ["p(95)<2000", "p(99)<5000"],  // SLA de latencia
  shortcircuit: ["count==0"],                        // Cero circuit breakers
  rejected_semaphore: ["count==0"],                  // Cero rechazos por semáforo
  dropped_iterations: ["count==0"],                  // Cero iteraciones perdidas
};

// ============================================
// SPIKE TEST - Resistencia a picos de tráfico
// ============================================
export const spikeThresholds = {
  http_req_failed: ["rate<0.15"],
  http_req_duration: ["p(95)<20000", "p(99)<30000"],
};

// ============================================
// SOAK TEST - Estabilidad a largo plazo
// ============================================
export const soakThresholds = {
  http_req_failed: ["rate<0.05"],
  http_req_duration: ["p(95)<8000", "p(99)<12000", "avg<5000"],
};

export const sizeThresholds = {
  http_req_failed: ["rate<0.20"],
  http_req_duration: ["p(95)<45000"],
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
