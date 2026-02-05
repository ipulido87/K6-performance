#!/usr/bin/env node

/**
 * Full Test Runner
 * Executes k6 test, generates PDF report, and opens results
 * Continues even if thresholds fail
 */

const { execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const ROOT_DIR = path.join(__dirname, '..');
const VALID_ENVS = ['local', 'dev', 'staging', 'prod'];

const TEST_FILES = {
  smoke: 'tests/smoke/soap-smoke.test.js',
  load: 'tests/load/soap-load.test.js',
  stress: 'tests/stress/soap-stress.test.js',
  capacity: 'tests/capacity/soap-capacity.test.js',
  spike: 'tests/spike/soap-spike.test.js',
  soak: 'tests/soak/soap-soak.test.js',
  size: 'tests/size/soap-size.test.js',
  combined: 'tests/combined/soap-and-traffic.test.js',
  'traffic-smoke': 'tests/traffic-monitoring/traffic-smoke.test.js',
  'traffic-load': 'tests/traffic-monitoring/traffic-load.test.js',
  'traffic-stress': 'tests/traffic-monitoring/traffic-stress.test.js',
};

const CAPTURE_DURATION_DEFAULTS = {
  smoke: 30_000,
  load: 600_000,
  stress: 480_000,
  capacity: 480_000,
  spike: 360_000,
  soak: 1_800_000,
  size: 300_000,
};

// --- CLI args ---
const testType = process.argv[2];
const environment = process.argv[3] || 'local';
const skipGrafana = process.argv.includes('--skip-grafana');
const skipOpen = process.argv.includes('--skip-open');

// --- Helpers ---
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => {
        const idx = line.indexOf('=');
        return idx > 0 ? [line.slice(0, idx).trim(), line.slice(idx + 1).trim()] : null;
      })
      .filter(Boolean)
  );
}

function parseDurationMs(raw) {
  const match = String(raw ?? '').match(/^(\d+(?:\.\d+)?)(ms|s|m|h)$/i);
  if (!match) return null;
  const value = Number(match[1]);
  const factors = { ms: 1, s: 1000, m: 60_000, h: 3_600_000 };
  return Math.round(value * factors[match[2].toLowerCase()]);
}

function getCaptureDurationMs(type, envVars) {
  if (type === 'combined') {
    const ramp = parseDurationMs(envVars.COMBINED_RAMP_DURATION) ?? 30_000;
    const hold = parseDurationMs(envVars.COMBINED_HOLD_DURATION) ?? 1_200_000;
    return (ramp * 2) + hold;
  }
  return CAPTURE_DURATION_DEFAULTS[type] ?? 600_000;
}

function exec(cmd, opts = {}) {
  try {
    execSync(cmd, { stdio: 'pipe', ...opts });
    return true;
  } catch {
    return false;
  }
}

function waitMs(ms) {
  try {
    execSync(process.platform === 'win32'
      ? `ping -n ${Math.ceil(ms / 1000) + 1} 127.0.0.1 >nul`
      : `sleep ${Math.ceil(ms / 1000)}`,
      { stdio: 'ignore' });
  } catch { /* ignore */ }
}

function showHelp() {
  console.log(`
===============================================
K6 PERFORMANCE TESTING FRAMEWORK
===============================================

TESTS (default environment: LOCAL):
  npm run smoke      Basic functionality check (15s)
  npm run load       Sustained normal load (~9min)
  npm run stress     Find breaking point (~7min)
  npm run capacity   Healthy max capacity (~7min)
  npm run spike      Traffic bursts (~5min)
  npm run soak       Long-term stability (30min+)
  npm run size       Payload limits
  npm run combined   SOAP + Traffic in parallel

BY ENVIRONMENT (dev, staging, prod):
  npm run smoke:dev        Smoke on DEV
  npm run smoke:staging    Smoke on STAGING
  npm run smoke:prod       Smoke on PROD
  npm run load:dev         Load on DEV
  npm run load:staging     Load on STAGING
  npm run stress:dev       Stress on DEV
  (same for capacity, spike, soak, size...)

TRAFFIC MONITORING:
  npm run traffic:smoke
  npm run traffic:load
  npm run traffic:stress

UTILITIES:
  npm start          Start Grafana and open dashboard
  npm stop           Stop Grafana
  npm run clean      Clean Grafana data

EACH TEST DOES:
  1. Start Grafana/InfluxDB
  2. Clean previous data
  3. Open the dashboard in a browser
  4. Run the k6 test
  5. Capture Grafana charts
  6. Generate a PDF report
  7. Open the reports folder

PDF REPORTS: reports/pdf/
GRAFANA:     http://localhost:3000
`);
}

// --- Validation ---
if (!testType || testType === '--help' || testType === '-h') {
  showHelp();
  process.exit(0);
}

const testFile = TEST_FILES[testType];
if (!testFile) {
  console.error(`Unknown test type: ${testType}`);
  console.error(`Available: ${Object.keys(TEST_FILES).join(', ')}`);
  process.exit(1);
}

if (!VALID_ENVS.includes(environment)) {
  console.error(`Unknown environment: ${environment}`);
  console.error(`Available: ${VALID_ENVS.join(', ')}`);
  process.exit(1);
}

// --- Main execution ---
async function main() {
  const envLabel = environment.toUpperCase();
  console.log(`
===============================================
K6 FULL TEST RUNNER
===============================================
Test Type:   ${testType}
Environment: ${envLabel}
Test File:   ${testFile}
===============================================
`);

  // Step 1-3: Grafana setup
  if (!skipGrafana) {
    console.log('[1/7] Starting Grafana & InfluxDB...');
    exec('docker-compose up -d', { stdio: 'inherit' })
      || console.log('WARN: Grafana may already be running or Docker is not available');

    console.log('[2/7] Cleaning previous test data...');
    console.log('   Waiting for InfluxDB to be ready...');
    waitMs(5000);

    const cleaned =
      exec('docker exec k6-influxdb influx -execute "DROP DATABASE k6"')
      && exec('docker exec k6-influxdb influx -execute "CREATE DATABASE k6"');

    if (cleaned) {
      console.log('   Database cleaned successfully');
    } else {
      const httpCleaned =
        exec('curl -s -X POST "http://localhost:8086/query" --data-urlencode "q=DROP DATABASE k6"')
        && exec('curl -s -X POST "http://localhost:8086/query" --data-urlencode "q=CREATE DATABASE k6"');
      console.log(httpCleaned ? '   Database cleaned via HTTP API' : '   WARNING: Could not clean database (may be first run)');
    }

    console.log('[3/7] Opening Grafana dashboard...');
    exec('start http://localhost:3000/d/k6-performance/k6-performance-dashboard', { stdio: 'inherit' });
  } else {
    console.log('Skipping Grafana (--skip-grafana)');
  }

  // Ensure output directories
  const jsonDir = path.join(ROOT_DIR, 'reports', 'json');
  const pdfDir = path.join(ROOT_DIR, 'reports', 'pdf');
  const chartsDir = path.join(ROOT_DIR, 'reports', 'charts');
  fs.mkdirSync(jsonDir, { recursive: true });
  fs.mkdirSync(pdfDir, { recursive: true });

  // Step 4: Run k6 test
  console.log(`\n[4/7] Running ${testType} test on ${envLabel}...`);
  console.log('-'.repeat(60));

  const jsonOutput = path.join(jsonDir, `${testType}-${environment}-latest.json`);
  const k6Command = `k6 run -e ENVIRONMENT=${environment} --out json=${jsonOutput} --out influxdb=http://localhost:8086/k6 ${testFile}`;

  let testPassed = true;
  try {
    execSync(k6Command, { stdio: 'inherit' });
    console.log('\nOK: Test completed - All thresholds passed');
  } catch {
    testPassed = false;
    console.log('\nWARN: Test completed - Some thresholds may have failed');
    console.log('      (This is normal for stress/capacity tests)');
  }

  // Step 5: Capture Grafana charts
  console.log('\n[5/7] Capturing Grafana charts...');
  console.log('-'.repeat(60));

  let grafanaImages = null;
  if (!skipGrafana) {
    try {
      const { captureAllPanels } = require('../src/reports');
      const envVars = parseEnvFile(path.join(ROOT_DIR, '.env'));
      const duration = getCaptureDurationMs(testType, envVars);
      grafanaImages = await captureAllPanels(chartsDir, duration);
      console.log(grafanaImages
        ? '   Charts captured successfully'
        : '   Grafana renderer not available, skipping charts');
    } catch (err) {
      console.log(`   Could not capture charts: ${err.message}`);
    }
  }

  // Step 6: Generate PDF report
  console.log('\n[6/7] Generating PDF report...');
  console.log('-'.repeat(60));

  const { PDFReportGenerator } = require('../src/reports');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const pdfOutput = path.join(pdfDir, `${testType}-${environment}-${timestamp}.pdf`);

  const generator = new PDFReportGenerator(jsonOutput, testType, {
    grafanaImages,
    environment,
  });

  const outputPath = await generator.generate(pdfOutput);
  console.log(`\nOK: PDF generated: ${path.basename(outputPath)}`);

  // Step 7: Open reports folder
  if (!skipOpen) {
    console.log('\n[7/7] Opening reports folder...');
    exec(`start "" "${pdfDir}"`, { stdio: 'inherit' });
  }

  console.log(`
===============================================
TEST COMPLETE
===============================================
Result:     ${testPassed ? 'PASSED' : 'THRESHOLDS EXCEEDED'}
PDF Report: ${path.basename(outputPath)}
Location:   reports/pdf/
Grafana:    http://localhost:3000
===============================================
`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
