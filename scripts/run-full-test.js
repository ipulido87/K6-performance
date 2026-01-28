#!/usr/bin/env node

/**
 * Full Test Runner
 * Executes k6 test, generates PDF report, and opens results
 * Continues even if thresholds fail
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const testType = process.argv[2];
const environment = process.argv[3] || 'local';
const skipGrafana = process.argv.includes('--skip-grafana');
const skipOpen = process.argv.includes('--skip-open');

// Valid environments
const validEnvironments = ['local', 'dev', 'staging', 'prod'];

// Show help
if (!testType || testType === '--help' || testType === '-h') {
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
  process.exit(0);
}

// Test configurations
const testConfigs = {
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

const testFile = testConfigs[testType];

if (!testFile) {
  console.error(`Unknown test type: ${testType}`);
  console.error(`Available: ${Object.keys(testConfigs).join(', ')}`);
  console.error(`\nUse: npm run help`);
  process.exit(1);
}

if (!validEnvironments.includes(environment)) {
  console.error(`Unknown environment: ${environment}`);
  console.error(`Available: ${validEnvironments.join(', ')}`);
  process.exit(1);
}

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

// Step 1: Start Grafana (if not skipped)
if (!skipGrafana) {
  console.log('[1/7] Starting Grafana & InfluxDB...');
  try {
    execSync('docker-compose up -d', { stdio: 'inherit' });
  } catch (e) {
    console.log('WARN: Grafana may already be running or Docker is not available');
  }

  // Wait a moment for InfluxDB to be ready
  console.log('[2/7] Cleaning previous test data...');
  try {
    // Small delay to ensure InfluxDB is ready
    execSync('timeout /t 2 /nobreak >nul 2>&1 || sleep 2', { stdio: 'ignore' });
    execSync('docker exec k6-influxdb influx -execute "DROP DATABASE k6; CREATE DATABASE k6"', { stdio: 'pipe' });
    console.log('   Database cleaned successfully');
  } catch (e) {
    console.log('   Could not clean database (may be first run)');
  }

  // Open Grafana dashboard
  console.log('[3/7] Opening Grafana dashboard...');
  try {
    execSync('start http://localhost:3000/d/k6-performance/k6-performance-dashboard', { stdio: 'inherit' });
  } catch (e) {
    // Ignore errors
  }
} else {
  console.log('Skipping Grafana (--skip-grafana)');
}

// Ensure output directories exist
const jsonDir = path.join(__dirname, '..', 'reports', 'json');
const pdfDir = path.join(__dirname, '..', 'reports', 'pdf');

if (!fs.existsSync(jsonDir)) {
  fs.mkdirSync(jsonDir, { recursive: true });
}
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

// Step 4: Run k6 test
console.log(`\n[4/7] Running ${testType} test on ${envLabel}...`);
console.log('-'.repeat(60));

const jsonOutput = path.join(jsonDir, `${testType}-${environment}-latest.json`);
const k6Command = `k6 run -e ENVIRONMENT=${environment} --out json=${jsonOutput} --out influxdb=http://localhost:8086/k6 ${testFile}`;

let testPassed = true;
try {
  execSync(k6Command, { stdio: 'inherit' });
  console.log('\nOK: Test completed - All thresholds passed');
} catch (e) {
  testPassed = false;
  console.log('\nWARN: Test completed - Some thresholds may have failed');
  console.log('      (This is normal for stress/capacity tests)');
}

// Step 5: Capture Grafana charts
console.log('\n[5/7] Capturing Grafana charts...');
console.log('-'.repeat(60));

let grafanaImages = null;
const chartsDir = path.join(__dirname, '..', 'reports', 'charts');

async function captureGrafanaCharts() {
  try {
    const { captureAllPanels } = require('../src/reports');

    // Calculate test duration (use a reasonable default based on test type)
    const testDurations = {
      smoke: 30000,       // 30s
      load: 600000,       // 10min
      stress: 480000,     // 8min
      capacity: 480000,   // 8min
      spike: 360000,      // 6min
      soak: 1800000,      // 30min
      size: 300000,       // 5min
      combined: 600000,   // 10min
    };

    const duration = testDurations[testType] || 600000;
    grafanaImages = await captureAllPanels(chartsDir, duration);

    if (grafanaImages) {
      console.log('   Charts captured successfully');
    } else {
      console.log('   Grafana renderer not available, skipping charts');
    }
  } catch (err) {
    console.log(`   Could not capture charts: ${err.message}`);
  }
  return grafanaImages;
}

// Step 6: Generate PDF report
console.log('\n[6/7] Generating PDF report...');
console.log('-'.repeat(60));

async function generateReport() {
  // First capture charts
  if (!skipGrafana) {
    await captureGrafanaCharts();
  }

  const { PDFReportGenerator } = require('../src/reports');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const pdfOutput = path.join(pdfDir, `${testType}-${environment}-${timestamp}.pdf`);

  const generator = new PDFReportGenerator(jsonOutput, testType, {
    grafanaImages: grafanaImages,
    environment: environment,
  });

  return generator.generate(pdfOutput);
}

try {
  generateReport().then((outputPath) => {
    console.log(`\nOK: PDF generated: ${path.basename(outputPath)}`);

    // Open PDF folder (Step 7)
    if (!skipOpen) {
      console.log('\n[7/7] Opening reports folder...');
      try {
        execSync(`start "" "${pdfDir}"`, { stdio: 'inherit' });
      } catch (e) {
        // Ignore
      }
    }

    // Final summary
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
  }).catch((err) => {
    console.error('Error generating PDF:', err.message);
  });
} catch (e) {
  console.error('Error generating PDF:', e.message);
}
