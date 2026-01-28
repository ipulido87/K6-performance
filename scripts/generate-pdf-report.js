#!/usr/bin/env node

/**
 * K6 PDF Report Generator CLI
 * Generates PDF reports from K6 JSON output files
 *
 * Usage:
 *   node generate-pdf-report.js <test-type> [json-file]
 *
 * Examples:
 *   node generate-pdf-report.js smoke
 *   node generate-pdf-report.js load reports/json/load-results.json
 */

const fs = require('fs');
const path = require('path');
const { PDFReportGenerator } = require('../src/reports');

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
K6 PDF Report Generator
=======================

Generates comprehensive PDF reports from K6 test results.

Usage:
  node generate-pdf-report.js <test-type> [json-file]

Arguments:
  test-type    Type of test (smoke, load, stress, capacity, spike, soak, size)
  json-file    Optional: Path to JSON file (default: reports/json/<test-type>-latest.json)

Examples:
  node generate-pdf-report.js smoke
  node generate-pdf-report.js load
  node generate-pdf-report.js stress reports/json/custom-results.json

Supported test types:
  - smoke       Quick sanity check
  - load        Normal load testing
  - stress      Find breaking point
  - capacity    Max sustainable load
  - spike       Traffic surge testing
  - soak        Long-term stability
  - size        Payload size limits
  - combined    Multiple scenarios
  - traffic-smoke, traffic-load, traffic-stress
`);
  process.exit(0);
}

const testType = args[0];
const jsonFile = args[1] || path.join(__dirname, '..', 'reports', 'json', `${testType}-latest.json`);

// Validate inputs
if (!fs.existsSync(jsonFile)) {
  console.error(`Error: JSON file not found: ${jsonFile}`);
  console.error(`\nMake sure you've run a test first with JSON output:`);
  console.error(`  k6 run --out json=reports/json/${testType}-latest.json tests/...`);
  console.error(`\nOr run with npm:`);
  console.error(`  npm run ${testType}:pdf`);
  process.exit(1);
}

// Generate timestamp for output filename
const timestamp = new Date().toISOString()
  .replace(/[:.]/g, '-')
  .slice(0, 19);

// Determine output path
const outputDir = path.join(__dirname, '..', 'reports', 'pdf');
const outputFile = path.join(outputDir, `${testType}-report-${timestamp}.pdf`);

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate the report
console.log(`
==============================================
  K6 PDF Report Generator
==============================================

Test Type: ${testType}
Input:     ${jsonFile}
Output:    ${outputFile}

Generating report...
`);

const generator = new PDFReportGenerator(jsonFile, testType);

generator.generate(outputFile)
  .then((outputPath) => {
    console.log(`
==============================================
  Report Generated Successfully!
==============================================

PDF saved to: ${outputPath}

The report includes:
  - Executive Summary with health score
  - Metrics Glossary (P95, P99, RPS, Error Rate explained)
  - Test Description (what this test type measures)
  - Detailed Results (response times, error rates)
  - Interpretation & Recommendations
  - Technical Details

`);
  })
  .catch((error) => {
    console.error(`Error generating report: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  });
