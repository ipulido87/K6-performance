/**
 * PDF Report Generator
 * Generates comprehensive PDF reports from K6 test results
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const {
  parseK6JSON,
  extractKeyMetrics,
  extractThresholdResults,
  checkTestPassed,
  extractCustomMetrics,
  extractStatusCodes,
} = require('./k6-json-parser');

const {
  calculateHealthScore,
  getHealthLabel,
  generateRecommendations,
} = require('./metrics-calculator');

const {
  colors,
  fonts,
  spacing,
  branding,
  formatDuration,
  formatNumber,
  formatPercentage,
} = require('./templates/styles');

const { metricsGlossary, getAllCategories } = require('./templates/glossary');
const { getTestDescription } = require('./templates/test-descriptions');

class PDFReportGenerator {
  constructor(jsonFilePath, testType, options = {}) {
    this.jsonFilePath = jsonFilePath;
    this.testType = testType;
    this.grafanaImages = options.grafanaImages || null;
    this.environment = options.environment || 'local';
    this.data = null;
    this.keyMetrics = null;
    this.thresholdResults = null;
    this.testPassed = null;
    this.doc = null;
  }

  /**
   * Generate the PDF report
   * @param {string} outputPath - Path for the output PDF file
   */
  generate(outputPath) {
    // Parse the JSON data
    this.data = parseK6JSON(this.jsonFilePath);
    this.keyMetrics = extractKeyMetrics(this.data);
    this.thresholdResults = extractThresholdResults(this.data);
    this.testPassed = checkTestPassed(this.data);

    // Create PDF document
    this.doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `K6 Performance Report - ${this.testType}`,
        Author: branding.companyName,
        Subject: 'Performance Test Results',
        Creator: 'K6 Performance Testing Framework',
      },
    });

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Pipe to file
    const stream = fs.createWriteStream(outputPath);
    this.doc.pipe(stream);

    // Generate content
    this.addCoverPage();
    this.addExecutiveSummary();

    // Add Grafana charts if available
    if (this.grafanaImages) {
      this.doc.addPage();
      this.addGrafanaChartsSection();
    }

    this.doc.addPage();
    this.addGlossarySection();
    this.doc.addPage();
    this.addTestDescriptionSection();
    this.doc.addPage();
    this.addDetailedResultsSection();
    this.doc.addPage();
    this.addInterpretationSection();
    this.doc.addPage();
    this.addTechnicalDetailsSection();

    // Add page numbers
    this.addPageNumbers();

    // Finalize
    this.doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    });
  }

  /**
   * Add cover page with title and basic info
   */
  addCoverPage() {
    const doc = this.doc;
    const centerX = doc.page.width / 2;

    // Title
    doc.fontSize(fonts.title + 8)
      .fillColor(colors.primary)
      .text('K6 PERFORMANCE', 50, 150, { align: 'center' })
      .text('TEST REPORT', { align: 'center' });

    // Test type badge
    const testDesc = getTestDescription(this.testType);
    doc.fontSize(fonts.subtitle)
      .fillColor(colors.text)
      .text(`${testDesc.icon || ''} ${testDesc.title}`, { align: 'center' })
      .moveDown(2);

    // Status badge
    const statusColor = this.testPassed ? colors.passed : colors.failed;
    const statusText = this.testPassed ? 'PASSED' : 'FAILED';

    doc.fontSize(fonts.title)
      .fillColor(statusColor)
      .text(statusText, { align: 'center' })
      .moveDown(3);

    // Date and time
    doc.fontSize(fonts.body)
      .fillColor(colors.textLight)
      .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' })
      .text(`Test Date: ${new Date(this.data.testDate).toLocaleString()}`, { align: 'center' })
      .moveDown(4);

    // Key metrics preview
    this.addMetricsPreview();

    // Footer
    doc.fontSize(fonts.small)
      .fillColor(colors.textLight)
      .text(branding.footerText, 50, doc.page.height - 80, { align: 'center' });
  }

  /**
   * Add key metrics preview on cover page
   */
  addMetricsPreview() {
    const doc = this.doc;
    const metrics = this.keyMetrics;
    const startY = 450;
    const boxWidth = 110;
    const boxHeight = 60;
    const startX = 70;
    const gap = 10;

    const boxes = [
      { label: 'P95', value: formatDuration(metrics.duration.p95), color: colors.primary },
      { label: 'P99', value: formatDuration(metrics.duration.p99), color: colors.primary },
      { label: 'Error Rate', value: formatPercentage(metrics.errorRate), color: metrics.errorRate > 0.05 ? colors.failed : colors.passed },
      { label: 'RPS', value: formatNumber(metrics.rps, 2), color: colors.primary },
    ];

    boxes.forEach((box, i) => {
      const x = startX + i * (boxWidth + gap);

      // Box background
      doc.rect(x, startY, boxWidth, boxHeight)
        .fillColor(colors.background)
        .fill();

      // Box border
      doc.rect(x, startY, boxWidth, boxHeight)
        .strokeColor(box.color)
        .lineWidth(2)
        .stroke();

      // Label
      doc.fontSize(fonts.small)
        .fillColor(colors.textLight)
        .text(box.label, x, startY + 10, { width: boxWidth, align: 'center' });

      // Value
      doc.fontSize(fonts.heading)
        .fillColor(box.color)
        .text(box.value, x, startY + 30, { width: boxWidth, align: 'center' });
    });
  }

  /**
   * Add Grafana charts section with captured images
   */
  addGrafanaChartsSection() {
    const doc = this.doc;
    this.addSectionHeader('Performance Charts (Grafana)');

    doc.fontSize(fonts.body)
      .fillColor(colors.textLight)
      .text('Real-time performance metrics captured from Grafana dashboard during test execution.')
      .moveDown(1.5);

    const chartOrder = ['vus', 'rps', 'responseTime', 'errorRate'];
    const chartTitles = {
      vus: 'Virtual Users Over Time',
      rps: 'Requests Per Second',
      responseTime: 'Response Time Distribution',
      errorRate: 'Error Rate',
    };

    let chartsAdded = 0;

    for (const chartKey of chartOrder) {
      if (this.grafanaImages[chartKey] && fs.existsSync(this.grafanaImages[chartKey])) {
        // Check if we need a new page
        if (doc.y > doc.page.height - 350) {
          doc.addPage();
        }

        // Chart title
        doc.fontSize(fonts.heading)
          .fillColor(colors.primary)
          .text(chartTitles[chartKey] || chartKey)
          .moveDown(0.5);

        // Add image
        try {
          doc.image(this.grafanaImages[chartKey], {
            fit: [495, 280],
            align: 'center',
          });
          chartsAdded++;
        } catch (err) {
          doc.fontSize(fonts.small)
            .fillColor(colors.textLight)
            .text(`Could not load chart: ${err.message}`);
        }

        doc.moveDown(1.5);
      }
    }

    if (chartsAdded === 0) {
      doc.fontSize(fonts.body)
        .fillColor(colors.textLight)
        .text('No charts available. Grafana image renderer may not be configured.')
        .moveDown();
    }
  }

  /**
   * Add executive summary section
   */
  addExecutiveSummary() {
    const doc = this.doc;
    const metrics = this.keyMetrics;
    const healthScore = calculateHealthScore(metrics, this.thresholdResults);
    const healthLabel = getHealthLabel(healthScore);

    doc.addPage();
    this.addSectionHeader('Executive Summary');

    // Health score
    doc.fontSize(fonts.heading)
      .fillColor(colors.text)
      .text('Overall Health Score: ', { continued: true })
      .fillColor(healthScore >= 75 ? colors.passed : healthScore >= 50 ? colors.warning : colors.failed)
      .text(`${healthScore}/100 (${healthLabel})`)
      .moveDown();

    // Test result
    doc.fontSize(fonts.heading)
      .fillColor(colors.text)
      .text('Test Result: ', { continued: true })
      .fillColor(this.testPassed ? colors.passed : colors.failed)
      .text(this.testPassed ? 'ALL THRESHOLDS PASSED' : 'SOME THRESHOLDS FAILED')
      .moveDown(2);

    // Summary table
    this.addSummaryTable();

    // Quick stats
    doc.moveDown(2);
    doc.fontSize(fonts.heading)
      .fillColor(colors.text)
      .text('Quick Statistics')
      .moveDown(0.5);

    const stats = [
      ['Total Requests', metrics.totalRequests.toString()],
      ['Failed Requests', metrics.failedRequests.toString()],
      ['Error Rate', formatPercentage(metrics.errorRate)],
      ['Test Duration', formatDuration(this.data.duration)],
      ['Max VUs', metrics.vusMax.toString()],
      ['Avg Response Time', formatDuration(metrics.duration.avg)],
      ['P95 Response Time', formatDuration(metrics.duration.p95)],
      ['P99 Response Time', formatDuration(metrics.duration.p99)],
      ['Requests/Second', formatNumber(metrics.rps, 2)],
    ];

    this.addSimpleTable(stats);
  }

  /**
   * Add summary table with thresholds
   */
  addSummaryTable() {
    const doc = this.doc;

    doc.fontSize(fonts.heading)
      .fillColor(colors.text)
      .text('Threshold Results')
      .moveDown(0.5);

    const headers = ['Metric', 'Threshold', 'Status'];
    const rows = [];

    for (const [metric, result] of Object.entries(this.thresholdResults)) {
      rows.push([
        metric,
        result.threshold,
        result.passed ? 'PASS' : 'FAIL',
      ]);
    }

    if (rows.length === 0) {
      doc.fontSize(fonts.body)
        .fillColor(colors.textLight)
        .text('No thresholds defined for this test.')
        .moveDown();
      return;
    }

    this.addTable(headers, rows, (row, colIndex) => {
      if (colIndex === 2) {
        return row[2] === 'PASS' ? colors.passed : colors.failed;
      }
      return colors.text;
    });
  }

  /**
   * Add glossary section with metric explanations
   */
  addGlossarySection() {
    const doc = this.doc;
    this.addSectionHeader('Metrics Glossary');

    doc.fontSize(fonts.body)
      .fillColor(colors.textLight)
      .text('This section explains all performance metrics used in this report. Understanding these metrics is essential for interpreting the test results correctly.')
      .moveDown(2);

    const categories = getAllCategories();

    for (const category of categories) {
      if (!category.metrics) continue;

      // Category title
      doc.fontSize(fonts.heading)
        .fillColor(colors.primary)
        .text(category.title)
        .moveDown(0.5);

      if (category.description) {
        doc.fontSize(fonts.small)
          .fillColor(colors.textLight)
          .text(category.description)
          .moveDown(0.5);
      }

      // Metrics in this category
      for (const [key, metric] of Object.entries(category.metrics)) {
        doc.fontSize(fonts.body)
          .fillColor(colors.text)
          .text(`${metric.name}`, { continued: true })
          .fillColor(colors.textLight)
          .text(` - ${metric.short}`)
          .moveDown(0.3);
      }

      doc.moveDown(1);

      // Check if we need a new page
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
      }
    }
  }

  /**
   * Add test description section
   */
  addTestDescriptionSection() {
    const doc = this.doc;
    const testDesc = getTestDescription(this.testType);

    this.addSectionHeader(`About This Test: ${testDesc.title}`);

    // Objective
    doc.fontSize(fonts.heading)
      .fillColor(colors.primary)
      .text('Objective')
      .moveDown(0.3);

    doc.fontSize(fonts.body)
      .fillColor(colors.text)
      .text(testDesc.objective)
      .moveDown();

    // Description
    doc.fontSize(fonts.heading)
      .fillColor(colors.primary)
      .text('Description')
      .moveDown(0.3);

    doc.fontSize(fonts.body)
      .fillColor(colors.text)
      .text(testDesc.longDescription)
      .moveDown(1.5);

    // When to run
    if (testDesc.whenToRun && testDesc.whenToRun.length > 0) {
      doc.fontSize(fonts.heading)
        .fillColor(colors.primary)
        .text('When To Run This Test')
        .moveDown(0.3);

      testDesc.whenToRun.forEach((item) => {
        doc.fontSize(fonts.body)
          .fillColor(colors.text)
          .text(`  - ${item}`);
      });
      doc.moveDown(1.5);
    }

    // What it finds
    if (testDesc.whatItFinds && testDesc.whatItFinds.length > 0) {
      doc.fontSize(fonts.heading)
        .fillColor(colors.primary)
        .text('What This Test Identifies')
        .moveDown(0.3);

      testDesc.whatItFinds.forEach((item) => {
        doc.fontSize(fonts.body)
          .fillColor(colors.text)
          .text(`  - ${item}`);
      });
      doc.moveDown(1.5);
    }

    // Interpretation
    if (testDesc.interpretation) {
      doc.fontSize(fonts.heading)
        .fillColor(colors.primary)
        .text('How To Interpret Results')
        .moveDown(0.3);

      if (testDesc.interpretation.pass) {
        doc.fontSize(fonts.body)
          .fillColor(colors.passed)
          .text('If PASSED: ', { continued: true })
          .fillColor(colors.text)
          .text(testDesc.interpretation.pass);
      }

      if (testDesc.interpretation.fail) {
        doc.fontSize(fonts.body)
          .fillColor(colors.failed)
          .text('If FAILED: ', { continued: true })
          .fillColor(colors.text)
          .text(testDesc.interpretation.fail);
      }

      if (testDesc.interpretation.observe) {
        doc.fontSize(fonts.body)
          .fillColor(colors.warning)
          .text('Observe: ', { continued: true })
          .fillColor(colors.text)
          .text(testDesc.interpretation.observe);
      }
    }
  }

  /**
   * Add detailed results section
   */
  addDetailedResultsSection() {
    const doc = this.doc;
    const metrics = this.keyMetrics;

    this.addSectionHeader('Detailed Results');

    // Response Time Statistics
    doc.fontSize(fonts.heading)
      .fillColor(colors.primary)
      .text('Response Time Statistics')
      .moveDown(0.5);

    const responseTimeData = [
      ['Minimum', formatDuration(metrics.duration.min)],
      ['Maximum', formatDuration(metrics.duration.max)],
      ['Average', formatDuration(metrics.duration.avg)],
      ['Median (P50)', formatDuration(metrics.duration.p50)],
      ['P90', formatDuration(metrics.duration.p90)],
      ['P95', formatDuration(metrics.duration.p95)],
      ['P99', formatDuration(metrics.duration.p99)],
    ];

    this.addSimpleTable(responseTimeData);
    doc.moveDown(2);

    // Custom Metrics
    const customMetrics = extractCustomMetrics(this.data);
    if (Object.keys(customMetrics).length > 0) {
      doc.fontSize(fonts.heading)
        .fillColor(colors.primary)
        .text('Custom Application Metrics')
        .moveDown(0.5);

      const customData = [];
      for (const [name, metric] of Object.entries(customMetrics)) {
        if (metric.stats) {
          customData.push([name, `Count: ${metric.stats.count}, Sum: ${formatNumber(metric.stats.sum)}`]);
        }
      }

      if (customData.length > 0) {
        this.addSimpleTable(customData);
      }
      doc.moveDown(2);
    }

    // HTTP Status Distribution
    const statusCodes = extractStatusCodes(this.data);
    doc.fontSize(fonts.heading)
      .fillColor(colors.primary)
      .text('HTTP Status Code Distribution')
      .moveDown(0.5);

    const statusData = [
      ['2xx (Success)', statusCodes['2xx'].toString()],
      ['3xx (Redirect)', statusCodes['3xx'].toString()],
      ['4xx (Client Error)', statusCodes['4xx'].toString()],
      ['5xx (Server Error)', statusCodes['5xx'].toString()],
      ['Timeout', statusCodes['timeout'].toString()],
    ];

    this.addSimpleTable(statusData);
  }

  /**
   * Add interpretation section with recommendations
   */
  addInterpretationSection() {
    const doc = this.doc;
    const metrics = this.keyMetrics;
    const healthScore = calculateHealthScore(metrics, this.thresholdResults);

    this.addSectionHeader('Results Interpretation');

    // Overall assessment
    doc.fontSize(fonts.heading)
      .fillColor(colors.primary)
      .text('Overall Assessment')
      .moveDown(0.5);

    const healthColor = healthScore >= 75 ? colors.passed : healthScore >= 50 ? colors.warning : colors.failed;

    doc.fontSize(fonts.body)
      .fillColor(colors.text)
      .text('Based on the test results, the system health score is ')
      .fillColor(healthColor)
      .text(`${healthScore}/100 (${getHealthLabel(healthScore)})`, { continued: false })
      .moveDown(1.5);

    // Threshold analysis
    doc.fontSize(fonts.heading)
      .fillColor(colors.primary)
      .text('Threshold Analysis')
      .moveDown(0.5);

    const totalThresholds = Object.keys(this.thresholdResults).length;
    const passedThresholds = Object.values(this.thresholdResults).filter((r) => r.passed).length;
    const failedThresholds = totalThresholds - passedThresholds;

    doc.fontSize(fonts.body)
      .fillColor(colors.text)
      .text(`Total Thresholds: ${totalThresholds}`)
      .fillColor(colors.passed)
      .text(`Passed: ${passedThresholds}`)
      .fillColor(failedThresholds > 0 ? colors.failed : colors.passed)
      .text(`Failed: ${failedThresholds}`)
      .moveDown(1.5);

    // Recommendations
    doc.fontSize(fonts.heading)
      .fillColor(colors.primary)
      .text('Recommendations')
      .moveDown(0.5);

    const recommendations = generateRecommendations(metrics, this.testType);

    recommendations.forEach((rec, index) => {
      doc.fontSize(fonts.body)
        .fillColor(colors.text)
        .text(`${index + 1}. ${rec}`)
        .moveDown(0.5);
    });
  }

  /**
   * Add technical details section
   */
  addTechnicalDetailsSection() {
    const doc = this.doc;

    this.addSectionHeader('Technical Details');

    // Test Configuration
    doc.fontSize(fonts.heading)
      .fillColor(colors.primary)
      .text('Test Configuration')
      .moveDown(0.5);

    const configData = [
      ['Test Type', this.testType],
      ['Source File', path.basename(this.jsonFilePath)],
      ['Test Date', new Date(this.data.testDate).toLocaleString()],
      ['Total Duration', formatDuration(this.data.duration)],
      ['Max Virtual Users', this.keyMetrics.vusMax.toString()],
      ['Total Iterations', this.keyMetrics.iterations.toString()],
    ];

    this.addSimpleTable(configData);
    doc.moveDown(2);

    // Execution Environment
    doc.fontSize(fonts.heading)
      .fillColor(colors.primary)
      .text('Execution Environment')
      .moveDown(0.5);

    const envData = [
      ['Report Generated', new Date().toLocaleString()],
      ['Generator', 'K6 Performance Testing Framework'],
      ['Report Version', '1.0.0'],
    ];

    this.addSimpleTable(envData);
  }

  /**
   * Add section header
   * @param {string} title - Section title
   */
  addSectionHeader(title) {
    const doc = this.doc;

    doc.fontSize(fonts.subtitle)
      .fillColor(colors.primary)
      .text(title)
      .moveDown(0.5);

    // Underline
    doc.moveTo(50, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .strokeColor(colors.border)
      .lineWidth(1)
      .stroke();

    doc.moveDown(1);
  }

  /**
   * Add a simple two-column table
   * @param {string[][]} data - Array of [label, value] pairs
   */
  addSimpleTable(data) {
    const doc = this.doc;
    const startX = 50;
    const labelWidth = 200;
    const valueWidth = 200;
    const rowHeight = 20;

    data.forEach((row, index) => {
      const y = doc.y;

      // Alternate row background
      if (index % 2 === 0) {
        doc.rect(startX, y - 3, labelWidth + valueWidth, rowHeight)
          .fillColor(colors.tableRowEven)
          .fill();
      }

      doc.fontSize(fonts.body)
        .fillColor(colors.text)
        .text(row[0], startX + 5, y, { width: labelWidth - 10 });

      doc.fontSize(fonts.body)
        .fillColor(colors.text)
        .text(row[1], startX + labelWidth + 5, y, { width: valueWidth - 10 });

      doc.y = y + rowHeight;
    });
  }

  /**
   * Add a table with headers
   * @param {string[]} headers - Column headers
   * @param {string[][]} rows - Table data
   * @param {function} colorFn - Function to determine cell color
   */
  addTable(headers, rows, colorFn) {
    const doc = this.doc;
    const startX = 50;
    const colWidth = (doc.page.width - 100) / headers.length;
    const rowHeight = 22;

    // Headers
    let y = doc.y;
    doc.rect(startX, y - 3, doc.page.width - 100, rowHeight)
      .fillColor(colors.tableHeader)
      .fill();

    headers.forEach((header, i) => {
      doc.fontSize(fonts.body)
        .fillColor(colors.tableHeaderText)
        .text(header, startX + i * colWidth + 5, y, { width: colWidth - 10 });
    });

    doc.y = y + rowHeight;

    // Rows
    rows.forEach((row, rowIndex) => {
      y = doc.y;

      // Alternate row background
      if (rowIndex % 2 === 0) {
        doc.rect(startX, y - 3, doc.page.width - 100, rowHeight)
          .fillColor(colors.tableRowEven)
          .fill();
      }

      row.forEach((cell, colIndex) => {
        const cellColor = colorFn ? colorFn(row, colIndex) : colors.text;
        doc.fontSize(fonts.body)
          .fillColor(cellColor)
          .text(cell, startX + colIndex * colWidth + 5, y, { width: colWidth - 10 });
      });

      doc.y = y + rowHeight;
    });
  }

  /**
   * Add page numbers to all pages
   */
  addPageNumbers() {
    const doc = this.doc;
    const pages = doc.bufferedPageRange();

    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);

      doc.fontSize(fonts.tiny)
        .fillColor(colors.textLight)
        .text(
          `Page ${i + 1} of ${pages.count}`,
          50,
          doc.page.height - 30,
          { align: 'center', width: doc.page.width - 100 }
        );
    }
  }
}

module.exports = { PDFReportGenerator };
