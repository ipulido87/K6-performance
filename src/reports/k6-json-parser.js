/**
 * K6 JSON Parser
 * Parses K6 JSON output files and extracts metrics data
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse K6 JSON output file (line-by-line JSON format)
 * @param {string} filePath - Path to the JSON file
 * @returns {object} Parsed K6 data
 */
function parseK6JSON(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');

  const metrics = {};
  const points = {};
  const checks = {};
  let rootGroup = null;
  let testDuration = 0;
  let startTime = null;
  let endTime = null;

  lines.forEach((line) => {
    try {
      const entry = JSON.parse(line);

      switch (entry.type) {
        case 'Metric':
          // Metric definition
          metrics[entry.metric] = {
            type: entry.data.type,
            contains: entry.data.contains,
            thresholds: entry.data.thresholds || [],
            values: [],
          };
          break;

        case 'Point':
          // Data point for a metric
          if (!points[entry.metric]) {
            points[entry.metric] = [];
          }
          points[entry.metric].push({
            value: entry.data.value,
            time: entry.data.time,
            tags: entry.data.tags,
          });

          // Track test duration
          const pointTime = new Date(entry.data.time).getTime();
          if (!startTime || pointTime < startTime) {
            startTime = pointTime;
          }
          if (!endTime || pointTime > endTime) {
            endTime = pointTime;
          }
          break;

        case 'Group':
          if (!rootGroup) {
            rootGroup = entry.data;
          }
          break;
      }
    } catch (e) {
      // Skip malformed lines
    }
  });

  // Merge points into metrics
  for (const [metricName, metricPoints] of Object.entries(points)) {
    if (!metrics[metricName]) {
      metrics[metricName] = { type: 'unknown', values: [] };
    }
    metrics[metricName].values = metricPoints.map((p) => p.value);
    metrics[metricName].points = metricPoints;
  }

  // Calculate test duration
  if (startTime && endTime) {
    testDuration = endTime - startTime;
  }

  // Extract test name from filename
  const testName = path
    .basename(filePath, '.json')
    .replace('-latest', '')
    .replace('-report', '');

  return {
    testName,
    testDate: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
    duration: testDuration,
    metrics,
    rootGroup,
    filePath,
  };
}

/**
 * Extract threshold results from parsed data
 * @param {object} parsedData - Parsed K6 data
 * @returns {object} Threshold results
 */
function extractThresholdResults(parsedData) {
  const results = {};

  for (const [metricName, metric] of Object.entries(parsedData.metrics)) {
    if (metric.thresholds && metric.thresholds.length > 0) {
      for (const threshold of metric.thresholds) {
        const thresholdKey = `${metricName}`;
        results[thresholdKey] = {
          threshold: threshold,
          passed: evaluateThreshold(metric, threshold),
        };
      }
    }
  }

  return results;
}

/**
 * Evaluate if a metric passes its threshold
 * @param {object} metric - Metric data with values
 * @param {string} threshold - Threshold expression (e.g., "p(95)<2000")
 * @returns {boolean} Whether the threshold passes
 */
function evaluateThreshold(metric, threshold) {
  if (!metric.values || metric.values.length === 0) {
    return true; // No data, assume pass
  }

  // Parse threshold expression
  const match = threshold.match(/^(p\(\d+\)|rate|avg|min|max|count|med)([<>]=?)(\d+\.?\d*)$/);
  if (!match) {
    return true; // Can't parse, assume pass
  }

  const [, stat, operator, valueStr] = match;
  const thresholdValue = parseFloat(valueStr);

  let actualValue;
  const values = metric.values.filter((v) => typeof v === 'number');

  if (values.length === 0) {
    return true;
  }

  switch (stat) {
    case 'p(50)':
    case 'med':
      actualValue = percentile(values, 50);
      break;
    case 'p(90)':
      actualValue = percentile(values, 90);
      break;
    case 'p(95)':
      actualValue = percentile(values, 95);
      break;
    case 'p(99)':
      actualValue = percentile(values, 99);
      break;
    case 'avg':
      actualValue = values.reduce((a, b) => a + b, 0) / values.length;
      break;
    case 'min':
      actualValue = Math.min(...values);
      break;
    case 'max':
      actualValue = Math.max(...values);
      break;
    case 'count':
      actualValue = values.length;
      break;
    case 'rate':
      // For rate metrics (like http_req_failed), calculate the rate
      actualValue = values.filter((v) => v === 1).length / values.length;
      break;
    default:
      return true;
  }

  switch (operator) {
    case '<':
      return actualValue < thresholdValue;
    case '<=':
      return actualValue <= thresholdValue;
    case '>':
      return actualValue > thresholdValue;
    case '>=':
      return actualValue >= thresholdValue;
    default:
      return true;
  }
}

/**
 * Calculate percentile of an array of values
 * @param {number[]} values - Array of numeric values
 * @param {number} p - Percentile (0-100)
 * @returns {number} Percentile value
 */
function percentile(values, p) {
  if (!values || values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor((p / 100) * sorted.length);
  return sorted[Math.min(index, sorted.length - 1)];
}

/**
 * Extract key metrics for summary
 * @param {object} parsedData - Parsed K6 data
 * @returns {object} Key metrics summary
 */
function extractKeyMetrics(parsedData) {
  const { metrics } = parsedData;

  const httpReqDuration = metrics['http_req_duration']?.values || [];
  const httpReqFailed = metrics['http_req_failed']?.values || [];
  const httpReqs = metrics['http_reqs']?.values || [];
  const vus = metrics['vus']?.values || [];
  const iterations = metrics['iterations']?.values || [];

  // Calculate stats
  const sorted = [...httpReqDuration].filter((v) => typeof v === 'number').sort((a, b) => a - b);

  return {
    totalRequests: httpReqs.length,
    failedRequests: httpReqFailed.filter((v) => v === 1).length,
    errorRate: httpReqFailed.length > 0
      ? httpReqFailed.filter((v) => v === 1).length / httpReqFailed.length
      : 0,
    duration: {
      min: sorted[0] || 0,
      max: sorted[sorted.length - 1] || 0,
      avg: sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0,
      p50: percentile(sorted, 50),
      p90: percentile(sorted, 90),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
    },
    rps: parsedData.duration > 0 ? httpReqs.length / (parsedData.duration / 1000) : 0,
    vusMax: vus.length > 0 ? Math.max(...vus) : 0,
    iterations: iterations.length,
  };
}

/**
 * Check if the test passed overall
 * @param {object} parsedData - Parsed K6 data
 * @returns {boolean} Whether all thresholds passed
 */
function checkTestPassed(parsedData) {
  const thresholdResults = extractThresholdResults(parsedData);

  for (const result of Object.values(thresholdResults)) {
    if (!result.passed) {
      return false;
    }
  }

  return true;
}

/**
 * Extract custom metrics (non-standard K6 metrics)
 * @param {object} parsedData - Parsed K6 data
 * @returns {object} Custom metrics
 */
function extractCustomMetrics(parsedData) {
  const standardMetrics = [
    'http_req_duration',
    'http_req_waiting',
    'http_req_connecting',
    'http_req_tls_handshaking',
    'http_req_sending',
    'http_req_receiving',
    'http_req_blocked',
    'http_req_failed',
    'http_reqs',
    'data_received',
    'data_sent',
    'iteration_duration',
    'iterations',
    'vus',
    'vus_max',
    'checks',
  ];

  const customMetrics = {};

  for (const [name, metric] of Object.entries(parsedData.metrics)) {
    if (!standardMetrics.includes(name)) {
      customMetrics[name] = {
        ...metric,
        stats: calculateMetricStats(metric.values),
      };
    }
  }

  return customMetrics;
}

/**
 * Calculate statistics for a metric's values
 * @param {number[]} values - Metric values
 * @returns {object} Statistics
 */
function calculateMetricStats(values) {
  if (!values || values.length === 0) {
    return { min: 0, max: 0, avg: 0, count: 0, sum: 0 };
  }

  const numericValues = values.filter((v) => typeof v === 'number');
  if (numericValues.length === 0) {
    return { min: 0, max: 0, avg: 0, count: values.length, sum: 0 };
  }

  const sorted = [...numericValues].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    count: sorted.length,
    sum: sum,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  };
}

/**
 * Extract HTTP status code distribution
 * @param {object} parsedData - Parsed K6 data
 * @returns {object} Status code counts
 */
function extractStatusCodes(parsedData) {
  const distribution = {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0,
    'timeout': 0,
    'other': 0,
  };

  // Look for custom metrics that track status codes
  const { metrics } = parsedData;

  if (metrics['http_500']) {
    distribution['5xx'] += metrics['http_500'].values?.length || 0;
  }
  if (metrics['http_503']) {
    distribution['5xx'] += metrics['http_503'].values?.length || 0;
  }
  if (metrics['http_504']) {
    distribution['5xx'] += metrics['http_504'].values?.length || 0;
  }
  if (metrics['timeouts']) {
    distribution['timeout'] = metrics['timeouts'].values?.length || 0;
  }

  // Calculate successful requests
  const totalReqs = metrics['http_reqs']?.values?.length || 0;
  const failedReqs = metrics['http_req_failed']?.values?.filter((v) => v === 1).length || 0;
  distribution['2xx'] = totalReqs - failedReqs - distribution['5xx'] - distribution['timeout'];

  return distribution;
}

module.exports = {
  parseK6JSON,
  extractThresholdResults,
  extractKeyMetrics,
  checkTestPassed,
  extractCustomMetrics,
  extractStatusCodes,
  calculateMetricStats,
  percentile,
};
