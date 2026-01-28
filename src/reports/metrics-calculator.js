/**
 * Metrics Calculator
 * Additional calculations and analysis for K6 metrics
 */

/**
 * Calculate detailed statistics for an array of values
 * @param {number[]} values - Array of numeric values
 * @returns {object} Detailed statistics
 */
function calculateDetailedStats(values) {
  if (!values || values.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      sum: 0,
      avg: 0,
      median: 0,
      p50: 0,
      p75: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      stdDev: 0,
      variance: 0,
    };
  }

  const sorted = [...values].filter((v) => typeof v === 'number').sort((a, b) => a - b);

  if (sorted.length === 0) {
    return {
      count: values.length,
      min: 0,
      max: 0,
      sum: 0,
      avg: 0,
      median: 0,
      p50: 0,
      p75: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      stdDev: 0,
      variance: 0,
    };
  }

  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;

  // Calculate variance and standard deviation
  const squaredDiffs = sorted.map((v) => Math.pow(v - avg, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / sorted.length;
  const stdDev = Math.sqrt(variance);

  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    sum: sum,
    avg: avg,
    median: percentile(sorted, 50),
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    stdDev: stdDev,
    variance: variance,
  };
}

/**
 * Calculate percentile of a sorted array
 * @param {number[]} sortedValues - Sorted array of numeric values
 * @param {number} p - Percentile (0-100)
 * @returns {number} Percentile value
 */
function percentile(sortedValues, p) {
  if (!sortedValues || sortedValues.length === 0) return 0;

  const index = Math.floor((p / 100) * sortedValues.length);
  return sortedValues[Math.min(index, sortedValues.length - 1)];
}

/**
 * Calculate RPS (Requests Per Second)
 * @param {number} requestCount - Total number of requests
 * @param {number} durationMs - Duration in milliseconds
 * @returns {number} RPS value
 */
function calculateRPS(requestCount, durationMs) {
  if (!durationMs || durationMs <= 0) return 0;
  return requestCount / (durationMs / 1000);
}

/**
 * Calculate error rate
 * @param {number} failedCount - Number of failed requests
 * @param {number} totalCount - Total number of requests
 * @returns {number} Error rate (0-1)
 */
function calculateErrorRate(failedCount, totalCount) {
  if (!totalCount || totalCount <= 0) return 0;
  return failedCount / totalCount;
}

/**
 * Evaluate a threshold value and determine status
 * @param {number} value - Actual value
 * @param {string} threshold - Threshold expression (e.g., "p(95)<2000")
 * @returns {object} Evaluation result
 */
function evaluateThreshold(value, threshold) {
  // Parse threshold expression
  const match = threshold.match(/^(p\(\d+\)|rate|avg|min|max|count|med)([<>]=?)(\d+\.?\d*)$/);

  if (!match) {
    return {
      passed: true,
      percentage: 0,
      thresholdValue: null,
      status: 'unknown',
    };
  }

  const [, , operator, thresholdValueStr] = match;
  const thresholdValue = parseFloat(thresholdValueStr);

  let passed;
  let percentage;

  switch (operator) {
    case '<':
      passed = value < thresholdValue;
      percentage = (value / thresholdValue) * 100;
      break;
    case '<=':
      passed = value <= thresholdValue;
      percentage = (value / thresholdValue) * 100;
      break;
    case '>':
      passed = value > thresholdValue;
      percentage = (thresholdValue / value) * 100;
      break;
    case '>=':
      passed = value >= thresholdValue;
      percentage = (thresholdValue / value) * 100;
      break;
    default:
      passed = true;
      percentage = 0;
  }

  // Determine status based on percentage
  let status;
  if (passed) {
    if (percentage > 80) {
      status = 'caution'; // Close to threshold
    } else {
      status = 'good';
    }
  } else {
    status = 'bad';
  }

  return {
    passed,
    percentage: Math.min(percentage, 100),
    thresholdValue,
    status,
  };
}

/**
 * Analyze performance trend from data points
 * @param {object[]} points - Array of data points with time and value
 * @returns {object} Trend analysis
 */
function analyzeTrend(points) {
  if (!points || points.length < 2) {
    return {
      trend: 'stable',
      slope: 0,
      improvement: 0,
    };
  }

  const sortedPoints = [...points].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  // Calculate linear regression slope
  const n = sortedPoints.length;
  const times = sortedPoints.map((p, i) => i);
  const values = sortedPoints.map((p) => p.value);

  const sumX = times.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = times.reduce((acc, x, i) => acc + x * values[i], 0);
  const sumXX = times.reduce((acc, x) => acc + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  // Determine trend
  let trend;
  if (Math.abs(slope) < 0.01) {
    trend = 'stable';
  } else if (slope > 0) {
    trend = 'degrading'; // Response time increasing
  } else {
    trend = 'improving'; // Response time decreasing
  }

  // Calculate percentage change
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const improvement = firstValue !== 0 ? ((firstValue - lastValue) / firstValue) * 100 : 0;

  return {
    trend,
    slope,
    improvement,
    startValue: firstValue,
    endValue: lastValue,
  };
}

/**
 * Generate automated recommendations based on metrics
 * @param {object} keyMetrics - Key metrics from the test
 * @param {string} testType - Type of test (smoke, load, stress, etc.)
 * @returns {string[]} Array of recommendations
 */
function generateRecommendations(keyMetrics, testType) {
  const recommendations = [];

  // Error rate recommendations
  if (keyMetrics.errorRate > 0.1) {
    recommendations.push(
      'CRITICAL: Error rate exceeds 10%. Investigate error causes immediately.'
    );
  } else if (keyMetrics.errorRate > 0.05) {
    recommendations.push(
      'WARNING: Error rate exceeds 5%. Review error logs for patterns.'
    );
  } else if (keyMetrics.errorRate > 0.01) {
    recommendations.push(
      'NOTICE: Some errors detected. Monitor in production.'
    );
  }

  // Response time recommendations
  if (keyMetrics.duration.p95 > 10000) {
    recommendations.push(
      'P95 response time exceeds 10 seconds. Consider performance optimization.'
    );
  } else if (keyMetrics.duration.p95 > 5000) {
    recommendations.push(
      'P95 response time is between 5-10 seconds. May impact user experience.'
    );
  }

  // P99 vs P95 gap
  const p99P95Ratio = keyMetrics.duration.p99 / keyMetrics.duration.p95;
  if (p99P95Ratio > 2) {
    recommendations.push(
      'Large gap between P99 and P95. Some requests experience significant delays.'
    );
  }

  // Test type specific recommendations
  switch (testType.toLowerCase()) {
    case 'stress':
      if (keyMetrics.errorRate < 0.05) {
        recommendations.push(
          'Stress test completed with low errors. System may handle higher load.'
        );
      }
      break;

    case 'soak':
      recommendations.push(
        'Review memory and resource usage over time for gradual degradation.'
      );
      break;

    case 'spike':
      recommendations.push(
        'Verify system recovery time after traffic spike subsides.'
      );
      break;

    case 'capacity':
      if (keyMetrics.errorRate < 0.01) {
        recommendations.push(
          'System can sustain this load. Consider testing higher capacity.'
        );
      }
      break;
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push(
      'All metrics within acceptable ranges. System performing well.'
    );
  }

  return recommendations;
}

/**
 * Calculate overall health score (0-100)
 * @param {object} keyMetrics - Key metrics from the test
 * @param {object} thresholdResults - Threshold evaluation results
 * @returns {number} Health score
 */
function calculateHealthScore(keyMetrics, thresholdResults) {
  let score = 100;

  // Deduct for error rate
  score -= Math.min(keyMetrics.errorRate * 100 * 2, 40); // Max 40 points

  // Deduct for failed thresholds
  const totalThresholds = Object.keys(thresholdResults).length;
  const failedThresholds = Object.values(thresholdResults).filter((r) => !r.passed).length;
  if (totalThresholds > 0) {
    score -= (failedThresholds / totalThresholds) * 30; // Max 30 points
  }

  // Deduct for high response times
  if (keyMetrics.duration.p95 > 10000) {
    score -= 20;
  } else if (keyMetrics.duration.p95 > 5000) {
    score -= 10;
  } else if (keyMetrics.duration.p95 > 3000) {
    score -= 5;
  }

  // Deduct for high variance (inconsistent performance)
  const variance = keyMetrics.duration.p99 / keyMetrics.duration.p50;
  if (variance > 5) {
    score -= 10;
  } else if (variance > 3) {
    score -= 5;
  }

  return Math.max(0, Math.round(score));
}

/**
 * Get health score label
 * @param {number} score - Health score (0-100)
 * @returns {string} Label
 */
function getHealthLabel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Poor';
  return 'Critical';
}

module.exports = {
  calculateDetailedStats,
  percentile,
  calculateRPS,
  calculateErrorRate,
  evaluateThreshold,
  analyzeTrend,
  generateRecommendations,
  calculateHealthScore,
  getHealthLabel,
};
