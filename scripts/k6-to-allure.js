const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const INPUT_DIR = path.join(__dirname, '../reports/json');
const OUTPUT_DIR = path.join(__dirname, '../reports/allure-results');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function parseK6JSON(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');

  const metrics = {};
  const checks = [];
  let testName = path.basename(filePath, '.json').replace('-latest', '').replace('-report', '');

  lines.forEach(line => {
    try {
      const entry = JSON.parse(line);

      if (entry.type === 'Metric') {
        if (!metrics[entry.metric]) {
          metrics[entry.metric] = entry.data;
        }
      } else if (entry.type === 'Point') {
        if (!metrics[entry.metric]) {
          metrics[entry.metric] = { values: [] };
        }
        if (!metrics[entry.metric].values) {
          metrics[entry.metric].values = [];
        }
        metrics[entry.metric].values.push(entry.data.value);
      }
    } catch (e) {
    }
  });

  return { testName, metrics };
}

function calculateStats(values) {
  if (!values || values.length === 0) {
    return { min: 0, max: 0, avg: 0, p95: 0, p99: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)]
  };
}

function convertToAllureResult(k6Data) {
  const { testName, metrics } = k6Data;
  const uuid = uuidv4();
  const timestamp = Date.now();

  let status = 'passed';
  let statusDetails = {};

  if (metrics.http_req_failed && metrics.http_req_failed.values) {
    const failures = metrics.http_req_failed.values.filter(v => v === 1).length;
    if (failures > 0) {
      status = 'failed';
      statusDetails = {
        message: `${failures} HTTP request(s) failed`,
        trace: 'Check k6 console output for details'
      };
    }
  }

  const httpReqDuration = metrics.http_req_duration?.values || [];
  const stats = calculateStats(httpReqDuration);

  const parameters = [];

  if (metrics.vus?.value !== undefined) {
    parameters.push({
      name: 'Virtual Users (VUs)',
      value: String(metrics.vus.value)
    });
  }

  if (metrics.iterations?.values) {
    parameters.push({
      name: 'Iterations',
      value: String(metrics.iterations.values.length)
    });
  }

  if (httpReqDuration.length > 0) {
    parameters.push({
      name: 'Avg Response Time',
      value: `${stats.avg.toFixed(2)} ms`
    });
    parameters.push({
      name: 'P95 Response Time',
      value: `${stats.p95.toFixed(2)} ms`
    });
    parameters.push({
      name: 'P99 Response Time',
      value: `${stats.p99.toFixed(2)} ms`
    });
  }

  const steps = [];

  if (httpReqDuration.length > 0) {
    steps.push({
      name: 'HTTP Request Duration',
      status: 'passed',
      stage: 'finished',
      steps: [],
      attachments: [],
      parameters: [
        { name: 'Min', value: `${stats.min.toFixed(2)} ms` },
        { name: 'Max', value: `${stats.max.toFixed(2)} ms` },
        { name: 'Avg', value: `${stats.avg.toFixed(2)} ms` },
        { name: 'P95', value: `${stats.p95.toFixed(2)} ms` },
        { name: 'P99', value: `${stats.p99.toFixed(2)} ms` }
      ]
    });
  }

  if (metrics.http_reqs?.values) {
    const totalReqs = metrics.http_reqs.values.length;
    steps.push({
      name: 'HTTP Requests',
      status: 'passed',
      stage: 'finished',
      steps: [],
      attachments: [],
      parameters: [
        { name: 'Total', value: String(totalReqs) }
      ]
    });
  }

  if (metrics.data_received?.values) {
    const totalBytes = metrics.data_received.values.reduce((a, b) => a + b, 0);
    const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
    steps.push({
      name: 'Data Received',
      status: 'passed',
      stage: 'finished',
      steps: [],
      attachments: [],
      parameters: [
        { name: 'Total', value: `${totalMB} MB` }
      ]
    });
  }

  const allureResult = {
    uuid,
    historyId: testName,
    name: testName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    status,
    statusDetails,
    stage: 'finished',
    description: `k6 Performance Test: ${testName}`,
    start: timestamp - (httpReqDuration.length * 1000 || 60000),
    stop: timestamp,
    labels: [
      { name: 'suite', value: 'k6 Performance Tests' },
      { name: 'testType', value: testName.split('-')[0] },
      { name: 'framework', value: 'k6' },
      { name: 'language', value: 'javascript' }
    ],
    parameters,
    steps,
    attachments: []
  };

  return allureResult;
}

function main() {
  console.log('🔄 Converting k6 JSON results to Allure format...\n');

  const jsonFiles = fs.readdirSync(INPUT_DIR)
    .filter(file => file.endsWith('.json'));

  if (jsonFiles.length === 0) {
    console.log('⚠️  No JSON files found in reports/json/');
    console.log('   Run a test first: npm run test:smoke\n');
    return;
  }

  let converted = 0;

  jsonFiles.forEach(file => {
    const filePath = path.join(INPUT_DIR, file);
    console.log(`📄 Processing: ${file}`);

    try {
      const k6Data = parseK6JSON(filePath);
      const allureResult = convertToAllureResult(k6Data);

      const outputFile = path.join(OUTPUT_DIR, `${allureResult.uuid}-result.json`);
      fs.writeFileSync(outputFile, JSON.stringify(allureResult, null, 2));

      console.log(`   ✅ Converted to: ${path.basename(outputFile)}`);
      converted++;
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  });

  console.log(`\n✨ Conversion complete! ${converted}/${jsonFiles.length} files converted.`);
  console.log(`📁 Results saved to: ${OUTPUT_DIR}\n`);
  console.log('Next steps:');
  console.log('  1. npm run allure:generate  - Generate Allure report');
  console.log('  2. npm run allure:open      - Open report in browser\n');
  console.log('Or use shortcuts:');
  console.log('  npm run allure:smoke   - Run smoke test + generate + open');
  console.log('  npm run allure:load    - Run load test + generate + open');
  console.log('  npm run allure:stress  - Run stress test + generate + open\n');
}

try {
  main();
} catch (error) {
  console.error('❌ Conversion failed:', error.message);
  process.exit(1);
}
