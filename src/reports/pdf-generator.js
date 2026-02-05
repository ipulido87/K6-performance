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
  branding,
  formatDuration,
  formatNumber,
  formatPercentage,
} = require('./templates/styles');

const { getAllCategories } = require('./templates/glossary');
const { getTestDescription } = require('./templates/test-descriptions');

// Charts relevant to each test type (keys match PANELS in grafana-capture.js)
const CHART_PROFILES = {
  smoke: {
    sections: [
      { title: 'Overview', color: colors.sectionOverview, charts: ['activeVus', 'totalRequests', 'currentRps', 'successRate'] },
      { title: 'Response Times', color: colors.sectionResponse, charts: ['percentiles', 'timingBreakdown'] },
      { title: 'Errors', color: colors.sectionErrors, charts: ['errorRate'] },
    ],
  },
  load: {
    sections: [
      { title: 'Overview', color: colors.sectionOverview, charts: ['activeVus', 'totalRequests', 'currentRps', 'successRate'] },
      { title: 'Load Profile', color: colors.sectionLoad, charts: ['vusOverTime', 'throughput'] },
      { title: 'Response Times', color: colors.sectionResponse, charts: ['percentiles', 'timingBreakdown'] },
      { title: 'Errors', color: colors.sectionErrors, charts: ['errorRate', 'errorBreakdown'] },
    ],
  },
  stress: {
    sections: [
      { title: 'Overview', color: colors.sectionOverview, charts: ['activeVus', 'totalRequests', 'currentRps', 'successRate'] },
      { title: 'Load Profile', color: colors.sectionLoad, charts: ['vusOverTime', 'throughput'] },
      { title: 'Response Times', color: colors.sectionResponse, charts: ['percentiles', 'timingBreakdown'] },
      { title: 'Errors', color: colors.sectionErrors, charts: ['errorRate', 'errorBreakdown', 'circuitBreaker'] },
    ],
  },
  capacity: {
    sections: [
      { title: 'Overview', color: colors.sectionOverview, charts: ['activeVus', 'totalRequests', 'currentRps', 'successRate'] },
      { title: 'Load Profile', color: colors.sectionLoad, charts: ['vusOverTime', 'throughput'] },
      { title: 'Response Times', color: colors.sectionResponse, charts: ['percentiles', 'timingBreakdown'] },
      { title: 'Errors', color: colors.sectionErrors, charts: ['errorRate', 'errorBreakdown', 'circuitBreaker'] },
    ],
  },
  spike: {
    sections: [
      { title: 'Overview', color: colors.sectionOverview, charts: ['activeVus', 'totalRequests', 'currentRps', 'successRate'] },
      { title: 'Load Profile', color: colors.sectionLoad, charts: ['vusOverTime', 'throughput'] },
      { title: 'Response Times', color: colors.sectionResponse, charts: ['percentiles', 'timingBreakdown'] },
      { title: 'Errors', color: colors.sectionErrors, charts: ['errorRate', 'errorBreakdown'] },
    ],
  },
  soak: {
    sections: [
      { title: 'Overview', color: colors.sectionOverview, charts: ['activeVus', 'totalRequests', 'currentRps', 'successRate'] },
      { title: 'Load Profile', color: colors.sectionLoad, charts: ['vusOverTime', 'throughput'] },
      { title: 'Response Times', color: colors.sectionResponse, charts: ['percentiles', 'timingBreakdown'] },
      { title: 'Errors', color: colors.sectionErrors, charts: ['errorRate', 'errorBreakdown'] },
    ],
  },
  size: {
    sections: [
      { title: 'Overview', color: colors.sectionOverview, charts: ['activeVus', 'totalRequests', 'successRate'] },
      { title: 'Response Times', color: colors.sectionResponse, charts: ['percentiles', 'timingBreakdown'] },
      { title: 'Errors', color: colors.sectionErrors, charts: ['errorRate'] },
    ],
  },
  combined: {
    sections: [
      { title: 'Overview', color: colors.sectionOverview, charts: ['activeVus', 'totalRequests', 'currentRps', 'successRate'] },
      { title: 'Load Profile', color: colors.sectionLoad, charts: ['vusOverTime', 'throughput'] },
      { title: 'Response Times', color: colors.sectionResponse, charts: ['percentiles', 'timingBreakdown'] },
      { title: 'Errors', color: colors.sectionErrors, charts: ['errorRate', 'errorBreakdown', 'circuitBreaker'] },
      { title: 'Scenario Comparison', color: colors.sectionComparison, charts: ['p95ByScenario', 'errorByScenario', 'rpsByScenario'] },
    ],
  },
  'traffic-smoke': {
    sections: [
      { title: 'Overview', color: colors.sectionOverview, charts: ['activeVus', 'totalRequests', 'currentRps', 'successRate'] },
      { title: 'Response Times', color: colors.sectionResponse, charts: ['percentiles'] },
      { title: 'Errors', color: colors.sectionErrors, charts: ['errorRate'] },
    ],
  },
  'traffic-load': {
    sections: [
      { title: 'Overview', color: colors.sectionOverview, charts: ['activeVus', 'totalRequests', 'currentRps', 'successRate'] },
      { title: 'Load Profile', color: colors.sectionLoad, charts: ['vusOverTime', 'throughput'] },
      { title: 'Response Times', color: colors.sectionResponse, charts: ['percentiles', 'timingBreakdown'] },
      { title: 'Errors', color: colors.sectionErrors, charts: ['errorRate', 'errorBreakdown'] },
    ],
  },
  'traffic-stress': {
    sections: [
      { title: 'Overview', color: colors.sectionOverview, charts: ['activeVus', 'totalRequests', 'currentRps', 'successRate'] },
      { title: 'Load Profile', color: colors.sectionLoad, charts: ['vusOverTime', 'throughput'] },
      { title: 'Response Times', color: colors.sectionResponse, charts: ['percentiles', 'timingBreakdown'] },
      { title: 'Errors', color: colors.sectionErrors, charts: ['errorRate', 'errorBreakdown'] },
    ],
  },
};

// All charts (fallback for unknown test types)
const DEFAULT_CHART_PROFILE = {
  sections: [
    { title: 'Overview', color: colors.sectionOverview, charts: ['activeVus', 'totalRequests', 'currentRps', 'successRate', 'p95ResponseTime', 'p99ResponseTime'] },
    { title: 'Load Profile', color: colors.sectionLoad, charts: ['vusOverTime', 'throughput'] },
    { title: 'Response Times', color: colors.sectionResponse, charts: ['percentiles', 'timingBreakdown'] },
    { title: 'Errors', color: colors.sectionErrors, charts: ['errorRate', 'errorBreakdown', 'circuitBreaker'] },
    { title: 'Scenario Comparison', color: colors.sectionComparison, charts: ['p95ByScenario', 'errorByScenario', 'rpsByScenario'] },
  ],
};

// Human-readable titles for each chart panel
const CHART_TITLES = {
  activeVus: 'Active Virtual Users',
  totalRequests: 'Total Requests',
  currentRps: 'Current RPS',
  successRate: 'Success Rate',
  p95ResponseTime: 'P95 Response Time',
  p99ResponseTime: 'P99 Response Time',
  vusOverTime: 'Virtual Users Over Time',
  throughput: 'Throughput (Requests/s & Iterations)',
  percentiles: 'Response Time Percentiles (P50/P90/P95/P99)',
  timingBreakdown: 'HTTP Timing Breakdown (Stacked Phases)',
  errorRate: 'Error Rate % Over Time',
  errorBreakdown: 'Error Breakdown by HTTP Status',
  circuitBreaker: 'Circuit Breaker & Semaphore Events',
  p95ByScenario: 'P95 Response Time by Scenario',
  errorByScenario: 'Error Rate % by Scenario',
  rpsByScenario: 'RPS by Scenario',
};

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

  generate(outputPath) {
    this.data = parseK6JSON(this.jsonFilePath);
    this.keyMetrics = extractKeyMetrics(this.data);
    this.thresholdResults = extractThresholdResults(this.data);
    this.testPassed = checkTestPassed(this.data);

    this.doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bufferPages: true,
      info: {
        Title: `K6 Performance Report - ${this.testType} [${this.environment.toUpperCase()}]`,
        Author: branding.companyName,
        Subject: 'Performance Test Results',
        Creator: 'K6 Performance Testing Framework',
      },
    });

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const stream = fs.createWriteStream(outputPath);
    this.doc.pipe(stream);

    // --- Report sections ---
    this.addCoverPage();

    this.doc.addPage();
    this.addExecutiveSummary();

    if (this.grafanaImages) {
      this.addGrafanaChartsSection();
    }

    this.doc.addPage();
    this.addDetailedResultsSection();

    this.doc.addPage();
    this.addInterpretationSection();

    this.doc.addPage();
    this.addTestDescriptionSection();

    this.doc.addPage();
    this.addGlossarySection();

    this.doc.addPage();
    this.addTechnicalDetailsSection();

    this.addPageFooters();
    this.doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    });
  }

  // ─── COVER PAGE ──────────────────────────────────────────────

  addCoverPage() {
    const doc = this.doc;
    const pageW = doc.page.width;
    const contentW = pageW - 100;

    // Top colored band
    doc.rect(0, 0, pageW, 200).fill(colors.primaryDark);

    // Title text on band
    doc.fontSize(fonts.title + 4)
      .fillColor(colors.white)
      .text('PERFORMANCE', 50, 55, { align: 'center', width: contentW })
      .text('TEST REPORT', { align: 'center', width: contentW });

    // Subtitle on band
    const testDesc = getTestDescription(this.testType);
    doc.fontSize(fonts.subtitle - 2)
      .fillColor('#93c5fd')
      .text(testDesc.title, 50, 130, { align: 'center', width: contentW });

    // Environment badge on band
    doc.fontSize(fonts.small)
      .fillColor('#bfdbfe')
      .text(`Environment: ${this.environment.toUpperCase()}`, 50, 160, { align: 'center', width: contentW });

    // Status badge
    const statusY = 230;
    const badgeW = 200;
    const badgeH = 50;
    const badgeX = (pageW - badgeW) / 2;
    const statusColor = this.testPassed ? colors.passed : colors.failed;
    const badgeBg = this.testPassed ? colors.coverBadgePassed : colors.coverBadgeFailed;
    const statusText = this.testPassed ? 'PASSED' : 'FAILED';

    doc.roundedRect(badgeX, statusY, badgeW, badgeH, 8)
      .fillColor(badgeBg)
      .fill();
    doc.roundedRect(badgeX, statusY, badgeW, badgeH, 8)
      .strokeColor(statusColor)
      .lineWidth(2)
      .stroke();
    doc.fontSize(fonts.subtitle)
      .fillColor(statusColor)
      .text(statusText, badgeX, statusY + 14, { width: badgeW, align: 'center' });

    // Dates
    doc.fontSize(fonts.body)
      .fillColor(colors.textLight)
      .text(`Test Date: ${new Date(this.data.testDate).toLocaleString()}`, 50, 300, { align: 'center', width: contentW })
      .text(`Report Generated: ${new Date().toLocaleString()}`, { align: 'center', width: contentW })
      .text(`Duration: ${formatDuration(this.data.duration)}`, { align: 'center', width: contentW });

    // Key metrics - 3 columns x 2 rows
    this.addCoverMetrics();

    // Footer
    doc.fontSize(fonts.tiny)
      .fillColor(colors.textMuted)
      .text(branding.footerText, 50, doc.page.height - 50, { align: 'center', width: contentW });
  }

  addCoverMetrics() {
    const doc = this.doc;
    const metrics = this.keyMetrics;
    const startY = 380;
    const cols = 3;
    const rows = 2;
    const boxW = 145;
    const boxH = 65;
    const gapX = 15;
    const gapY = 12;
    const totalW = cols * boxW + (cols - 1) * gapX;
    const startX = (doc.page.width - totalW) / 2;

    const boxes = [
      { label: 'Total Requests', value: formatNumber(metrics.totalRequests, 0), color: colors.primaryLight },
      { label: 'Error Rate', value: formatPercentage(metrics.errorRate), color: metrics.errorRate > 0.05 ? colors.failed : metrics.errorRate > 0.01 ? colors.warning : colors.passed },
      { label: 'Requests/s', value: formatNumber(metrics.rps, 2), color: colors.primaryLight },
      { label: 'P95 Response', value: formatDuration(metrics.duration.p95), color: colors.primaryLight },
      { label: 'P99 Response', value: formatDuration(metrics.duration.p99), color: colors.primaryLight },
      { label: 'Max VUs', value: metrics.vusMax.toString(), color: colors.accent },
    ];

    boxes.forEach((box, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (boxW + gapX);
      const y = startY + row * (boxH + gapY);

      // Box background
      doc.roundedRect(x, y, boxW, boxH, 4)
        .fillColor(colors.backgroundAlt)
        .fill();

      // Left accent bar
      doc.rect(x, y, 3, boxH)
        .fillColor(box.color)
        .fill();

      // Label
      doc.fontSize(fonts.small)
        .fillColor(colors.textLight)
        .text(box.label, x + 12, y + 12, { width: boxW - 20 });

      // Value
      doc.fontSize(fonts.heading + 2)
        .fillColor(box.color)
        .text(box.value, x + 12, y + 30, { width: boxW - 20 });
    });
  }

  // ─── EXECUTIVE SUMMARY ───────────────────────────────────────

  addExecutiveSummary() {
    const doc = this.doc;
    const metrics = this.keyMetrics;
    const healthScore = calculateHealthScore(metrics, this.thresholdResults);
    const healthLabel = getHealthLabel(healthScore);

    this.addSectionHeader('Executive Summary');

    // Health score bar
    const barY = doc.y;
    const barW = 300;
    const barH = 24;
    const barX = 50;

    doc.fontSize(fonts.heading)
      .fillColor(colors.text)
      .text('Health Score', barX, barY);
    const labelY = doc.y + 5;

    // Background bar
    doc.roundedRect(barX, labelY, barW, barH, 4)
      .fillColor(colors.border)
      .fill();

    // Filled bar
    const healthColor = healthScore >= 75 ? colors.passed : healthScore >= 50 ? colors.warning : colors.failed;
    const fillW = Math.max(4, (healthScore / 100) * barW);
    doc.roundedRect(barX, labelY, fillW, barH, 4)
      .fillColor(healthColor)
      .fill();

    // Score text
    doc.fontSize(fonts.body + 1)
      .fillColor(colors.white)
      .text(`${healthScore}/100`, barX + 8, labelY + 7, { width: fillW - 16 });

    // Label to the right
    doc.fontSize(fonts.heading)
      .fillColor(healthColor)
      .text(healthLabel, barX + barW + 15, labelY + 5);

    doc.y = labelY + barH + 20;

    // Test result
    doc.fontSize(fonts.heading)
      .fillColor(colors.text)
      .text('Test Result: ', { continued: true })
      .fillColor(this.testPassed ? colors.passed : colors.failed)
      .text(this.testPassed ? 'ALL THRESHOLDS PASSED' : 'SOME THRESHOLDS FAILED')
      .moveDown(1.5);

    // Threshold results table
    this.addThresholdTable();

    // Quick statistics
    doc.moveDown(1.5);
    if (doc.y > doc.page.height - 300) doc.addPage();

    doc.fontSize(fonts.heading)
      .fillColor(colors.primary)
      .text('Performance Overview')
      .moveDown(0.5);

    const stats = [
      ['Total Requests', formatNumber(metrics.totalRequests, 0)],
      ['Failed Requests', formatNumber(metrics.failedRequests, 0)],
      ['Error Rate', formatPercentage(metrics.errorRate)],
      ['Test Duration', formatDuration(this.data.duration)],
      ['Max VUs', metrics.vusMax.toString()],
      ['Avg Response Time', formatDuration(metrics.duration.avg)],
      ['P50 (Median)', formatDuration(metrics.duration.p50)],
      ['P90', formatDuration(metrics.duration.p90)],
      ['P95', formatDuration(metrics.duration.p95)],
      ['P99', formatDuration(metrics.duration.p99)],
      ['Requests/Second', formatNumber(metrics.rps, 2)],
    ];
    if (metrics.messageSizeMB) {
      stats.push(['Avg Payload Size', `${formatNumber(metrics.messageSizeMB.avg, 2)} MB`]);
      stats.push(['Max Payload Size', `${formatNumber(metrics.messageSizeMB.max, 2)} MB`]);
    }

    this.addKeyValueTable(stats);
  }

  addThresholdTable() {
    const doc = this.doc;
    const entries = Object.entries(this.thresholdResults);

    if (entries.length === 0) {
      doc.fontSize(fonts.body)
        .fillColor(colors.textLight)
        .text('No thresholds defined for this test.')
        .moveDown();
      return;
    }

    doc.fontSize(fonts.heading)
      .fillColor(colors.primary)
      .text('Threshold Results')
      .moveDown(0.5);

    const startX = 50;
    const colWidths = [200, 180, 60];
    const totalW = colWidths.reduce((a, b) => a + b, 0);
    const rowH = 20;

    // Header
    let y = doc.y;
    doc.rect(startX, y - 2, totalW, rowH)
      .fillColor(colors.tableHeader)
      .fill();

    const headers = ['Metric', 'Threshold', 'Status'];
    headers.forEach((h, i) => {
      const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 5;
      doc.fontSize(fonts.body)
        .fillColor(colors.tableHeaderText)
        .text(h, x, y + 4, { width: colWidths[i] - 10 });
    });
    y += rowH;

    // Rows
    entries.forEach(([metric, result], idx) => {
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 50;
      }

      const bgColor = idx % 2 === 0 ? colors.tableRowEven : colors.tableRowOdd;
      doc.rect(startX, y - 2, totalW, rowH).fillColor(bgColor).fill();

      // Metric name
      doc.fontSize(fonts.body)
        .fillColor(colors.text)
        .text(metric, startX + 5, y + 4, { width: colWidths[0] - 10 });

      // Threshold expression
      doc.text(result.threshold, startX + colWidths[0] + 5, y + 4, { width: colWidths[1] - 10 });

      // Status badge
      const statusX = startX + colWidths[0] + colWidths[1] + 5;
      const badgeColor = result.passed ? colors.passed : colors.failed;
      const badgeText = result.passed ? 'PASS' : 'FAIL';
      doc.roundedRect(statusX, y + 2, 40, 14, 3).fillColor(badgeColor).fill();
      doc.fontSize(fonts.small)
        .fillColor(colors.white)
        .text(badgeText, statusX + 2, y + 4, { width: 36, align: 'center' });

      y += rowH;
    });

    doc.y = y + 5;
  }

  // ─── GRAFANA CHARTS ──────────────────────────────────────────

  addGrafanaChartsSection() {
    const profile = CHART_PROFILES[this.testType] || DEFAULT_CHART_PROFILE;

    for (const section of profile.sections) {
      const availableCharts = section.charts.filter(
        (key) => this.grafanaImages[key] && fs.existsSync(this.grafanaImages[key])
      );
      if (availableCharts.length === 0) continue;

      this.doc.addPage();
      this.addChartSectionHeader(section.title, section.color);

      for (const chartKey of availableCharts) {
        if (this.doc.y > this.doc.page.height - 340) {
          this.doc.addPage();
        }

        // Chart title
        this.doc.fontSize(fonts.subheading)
          .fillColor(section.color)
          .text(CHART_TITLES[chartKey] || chartKey)
          .moveDown(0.3);

        // Chart image
        try {
          this.doc.image(this.grafanaImages[chartKey], {
            fit: [495, 280],
            align: 'center',
          });
        } catch (err) {
          this.doc.fontSize(fonts.small)
            .fillColor(colors.textLight)
            .text(`Could not load chart: ${err.message}`);
        }

        this.doc.moveDown(1.5);
      }
    }
  }

  addChartSectionHeader(title, color) {
    const doc = this.doc;

    // Colored left bar + title
    doc.rect(50, doc.y - 2, 4, 22).fillColor(color).fill();
    doc.fontSize(fonts.subtitle)
      .fillColor(color)
      .text(`  ${title}`, 56, doc.y - 2);

    // Separator
    doc.moveTo(50, doc.y + 4)
      .lineTo(doc.page.width - 50, doc.y + 4)
      .strokeColor(colors.border)
      .lineWidth(0.5)
      .stroke();

    doc.moveDown(1);
  }

  // ─── DETAILED RESULTS ────────────────────────────────────────

  addDetailedResultsSection() {
    const doc = this.doc;
    const metrics = this.keyMetrics;

    this.addSectionHeader('Detailed Results');

    // Response Time Statistics
    doc.fontSize(fonts.heading)
      .fillColor(colors.primary)
      .text('Response Time Statistics')
      .moveDown(0.5);

    this.addKeyValueTable([
      ['Minimum', formatDuration(metrics.duration.min)],
      ['Maximum', formatDuration(metrics.duration.max)],
      ['Average', formatDuration(metrics.duration.avg)],
      ['Median (P50)', formatDuration(metrics.duration.p50)],
      ['P90', formatDuration(metrics.duration.p90)],
      ['P95', formatDuration(metrics.duration.p95)],
      ['P99', formatDuration(metrics.duration.p99)],
    ]);
    doc.moveDown(1.5);

    // Response time visual bar chart
    this.addPercentileBarChart(metrics.duration);
    doc.moveDown(1.5);

    // Message Size (if applicable)
    if (metrics.messageSizeMB) {
      if (doc.y > doc.page.height - 150) doc.addPage();
      doc.fontSize(fonts.heading)
        .fillColor(colors.primary)
        .text('Message Size')
        .moveDown(0.5);

      this.addKeyValueTable([
        ['Average Payload', `${formatNumber(metrics.messageSizeMB.avg, 2)} MB`],
        ['Maximum Payload', `${formatNumber(metrics.messageSizeMB.max, 2)} MB`],
      ]);
      doc.moveDown(1.5);
    }

    // Custom Metrics
    const customMetrics = extractCustomMetrics(this.data);
    const customEntries = Object.entries(customMetrics).filter(([, m]) => m.stats && m.stats.count > 0);
    if (customEntries.length > 0) {
      if (doc.y > doc.page.height - 200) doc.addPage();
      doc.fontSize(fonts.heading)
        .fillColor(colors.primary)
        .text('Custom Application Metrics')
        .moveDown(0.5);

      const customRows = customEntries.map(([name, metric]) => {
        const s = metric.stats;
        return [name, `Count: ${formatNumber(s.count, 0)}  |  Avg: ${formatNumber(s.avg)}  |  P95: ${formatNumber(s.p95 || 0)}  |  Max: ${formatNumber(s.max)}`];
      });
      this.addKeyValueTable(customRows);
      doc.moveDown(1.5);
    }

    // HTTP Status Distribution
    if (doc.y > doc.page.height - 200) doc.addPage();
    const statusCodes = extractStatusCodes(this.data);
    doc.fontSize(fonts.heading)
      .fillColor(colors.primary)
      .text('HTTP Status Code Distribution')
      .moveDown(0.5);

    const statusRows = [
      ['2xx (Success)', statusCodes['2xx'].toString()],
      ['3xx (Redirect)', statusCodes['3xx'].toString()],
      ['4xx (Client Error)', statusCodes['4xx'].toString()],
      ['5xx (Server Error)', statusCodes['5xx'].toString()],
      ['Timeout', statusCodes['timeout'].toString()],
    ];

    this.addKeyValueTable(statusRows, (row) => {
      const val = parseInt(row[1]);
      if (row[0].startsWith('2xx')) return val > 0 ? colors.passed : colors.textLight;
      if (row[0].startsWith('4xx') || row[0].startsWith('5xx') || row[0] === 'Timeout')
        return val > 0 ? colors.failed : colors.textLight;
      return colors.text;
    });
  }

  addPercentileBarChart(duration) {
    const doc = this.doc;
    if (doc.y > doc.page.height - 180) doc.addPage();

    doc.fontSize(fonts.heading)
      .fillColor(colors.primary)
      .text('Response Time Distribution')
      .moveDown(0.5);

    const maxVal = Math.max(duration.p99, 1);
    const barMaxW = 350;
    const startX = 110;
    const barH = 16;
    const gap = 6;
    const items = [
      { label: 'Avg', value: duration.avg, color: colors.primaryLight },
      { label: 'P50', value: duration.p50, color: '#22d3ee' },
      { label: 'P90', value: duration.p90, color: colors.accent },
      { label: 'P95', value: duration.p95, color: colors.warning },
      { label: 'P99', value: duration.p99, color: colors.failed },
    ];

    items.forEach((item) => {
      const y = doc.y;
      const w = Math.max(4, (item.value / maxVal) * barMaxW);

      // Label
      doc.fontSize(fonts.body)
        .fillColor(colors.text)
        .text(item.label, 50, y + 2, { width: 50 });

      // Bar background
      doc.roundedRect(startX, y, barMaxW, barH, 3)
        .fillColor(colors.backgroundAlt)
        .fill();

      // Filled bar
      doc.roundedRect(startX, y, w, barH, 3)
        .fillColor(item.color)
        .fill();

      // Value
      doc.fontSize(fonts.small)
        .fillColor(colors.text)
        .text(formatDuration(item.value), startX + barMaxW + 10, y + 3);

      doc.y = y + barH + gap;
    });
  }

  // ─── INTERPRETATION ──────────────────────────────────────────

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
      .text(`Based on the test results, the system health score is `, { continued: true })
      .fillColor(healthColor)
      .text(`${healthScore}/100 (${getHealthLabel(healthScore)}).`)
      .moveDown(1.5);

    // Threshold analysis
    doc.fontSize(fonts.heading)
      .fillColor(colors.primary)
      .text('Threshold Analysis')
      .moveDown(0.5);

    const total = Object.keys(this.thresholdResults).length;
    const passed = Object.values(this.thresholdResults).filter((r) => r.passed).length;
    const failed = total - passed;

    doc.fontSize(fonts.body)
      .fillColor(colors.text)
      .text(`Total Thresholds: ${total}`)
      .fillColor(colors.passed)
      .text(`Passed: ${passed}`)
      .fillColor(failed > 0 ? colors.failed : colors.passed)
      .text(`Failed: ${failed}`)
      .moveDown(1.5);

    // Recommendations
    doc.fontSize(fonts.heading)
      .fillColor(colors.primary)
      .text('Recommendations')
      .moveDown(0.5);

    const recommendations = generateRecommendations(metrics, this.testType);
    recommendations.forEach((rec, i) => {
      if (doc.y > doc.page.height - 60) doc.addPage();
      doc.fontSize(fonts.body)
        .fillColor(colors.text)
        .text(`${i + 1}. ${rec}`)
        .moveDown(0.4);
    });
  }

  // ─── TEST DESCRIPTION (APPENDIX A) ──────────────────────────

  addTestDescriptionSection() {
    const doc = this.doc;
    const testDesc = getTestDescription(this.testType);

    this.addSectionHeader(`Appendix A: About This Test - ${testDesc.title}`);

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
    if (testDesc.whenToRun?.length > 0) {
      if (doc.y > doc.page.height - 120) doc.addPage();
      doc.fontSize(fonts.heading)
        .fillColor(colors.primary)
        .text('When To Run This Test')
        .moveDown(0.3);
      testDesc.whenToRun.forEach((item) => {
        doc.fontSize(fonts.body).fillColor(colors.text).text(`  - ${item}`);
      });
      doc.moveDown(1.5);
    }

    // What it finds
    if (testDesc.whatItFinds?.length > 0) {
      if (doc.y > doc.page.height - 120) doc.addPage();
      doc.fontSize(fonts.heading)
        .fillColor(colors.primary)
        .text('What This Test Identifies')
        .moveDown(0.3);
      testDesc.whatItFinds.forEach((item) => {
        doc.fontSize(fonts.body).fillColor(colors.text).text(`  - ${item}`);
      });
      doc.moveDown(1.5);
    }

    // Interpretation
    if (testDesc.interpretation) {
      if (doc.y > doc.page.height - 120) doc.addPage();
      doc.fontSize(fonts.heading)
        .fillColor(colors.primary)
        .text('How To Interpret Results')
        .moveDown(0.3);

      if (testDesc.interpretation.pass) {
        doc.fontSize(fonts.body)
          .fillColor(colors.passed).text('PASSED: ', { continued: true })
          .fillColor(colors.text).text(testDesc.interpretation.pass);
      }
      if (testDesc.interpretation.fail) {
        doc.fontSize(fonts.body)
          .fillColor(colors.failed).text('FAILED: ', { continued: true })
          .fillColor(colors.text).text(testDesc.interpretation.fail);
      }
      if (testDesc.interpretation.observe) {
        doc.fontSize(fonts.body)
          .fillColor(colors.warning).text('OBSERVE: ', { continued: true })
          .fillColor(colors.text).text(testDesc.interpretation.observe);
      }
    }
  }

  // ─── GLOSSARY (APPENDIX B) ──────────────────────────────────

  addGlossarySection() {
    const doc = this.doc;
    this.addSectionHeader('Appendix B: Metrics Glossary');

    doc.fontSize(fonts.body)
      .fillColor(colors.textLight)
      .text('Reference guide for all performance metrics used in this report.')
      .moveDown(1.5);

    const categories = getAllCategories();
    for (const category of categories) {
      if (!category.metrics) continue;
      if (doc.y > doc.page.height - 120) doc.addPage();

      doc.fontSize(fonts.heading)
        .fillColor(colors.primary)
        .text(category.title)
        .moveDown(0.3);

      if (category.description) {
        doc.fontSize(fonts.small)
          .fillColor(colors.textLight)
          .text(category.description)
          .moveDown(0.3);
      }

      for (const [, metric] of Object.entries(category.metrics)) {
        if (doc.y > doc.page.height - 60) doc.addPage();
        doc.fontSize(fonts.body)
          .fillColor(colors.text)
          .text(metric.name, { continued: true })
          .fillColor(colors.textLight)
          .text(` - ${metric.short}`)
          .moveDown(0.2);
      }

      doc.moveDown(0.8);
    }
  }

  // ─── TECHNICAL DETAILS ───────────────────────────────────────

  addTechnicalDetailsSection() {
    const doc = this.doc;
    this.addSectionHeader('Technical Details');

    doc.fontSize(fonts.heading)
      .fillColor(colors.primary)
      .text('Test Configuration')
      .moveDown(0.5);

    this.addKeyValueTable([
      ['Test Type', this.testType],
      ['Environment', this.environment.toUpperCase()],
      ['Source File', path.basename(this.jsonFilePath)],
      ['Test Date', new Date(this.data.testDate).toLocaleString()],
      ['Total Duration', formatDuration(this.data.duration)],
      ['Max Virtual Users', this.keyMetrics.vusMax.toString()],
      ['Total Iterations', this.keyMetrics.iterations.toString()],
    ]);

    doc.moveDown(2);

    doc.fontSize(fonts.heading)
      .fillColor(colors.primary)
      .text('Report Information')
      .moveDown(0.5);

    const chartProfile = CHART_PROFILES[this.testType] || DEFAULT_CHART_PROFILE;
    const chartCount = this.grafanaImages
      ? chartProfile.sections.reduce((sum, s) =>
          sum + s.charts.filter((k) => this.grafanaImages[k] && fs.existsSync(this.grafanaImages[k])).length, 0)
      : 0;

    this.addKeyValueTable([
      ['Report Generated', new Date().toLocaleString()],
      ['Generator', branding.footerText],
      ['Charts Included', `${chartCount} (${chartProfile.sections.length} sections)`],
      ['Chart Profile', this.testType],
    ]);
  }

  // ─── SHARED HELPERS ──────────────────────────────────────────

  addSectionHeader(title) {
    const doc = this.doc;

    // Colored top bar
    doc.rect(50, doc.y, doc.page.width - 100, 3)
      .fillColor(colors.primary)
      .fill();

    doc.moveDown(0.5);

    doc.fontSize(fonts.subtitle)
      .fillColor(colors.primaryDark)
      .text(title);

    doc.moveDown(0.8);
  }

  addKeyValueTable(data, valueColorFn) {
    const doc = this.doc;
    const startX = 50;
    const labelW = 200;
    const valueW = 280;
    const totalW = labelW + valueW;
    const rowH = 18;

    data.forEach((row, i) => {
      if (doc.y > doc.page.height - 40) {
        doc.addPage();
      }
      const y = doc.y;
      const bgColor = i % 2 === 0 ? colors.tableRowEven : colors.tableRowOdd;

      doc.rect(startX, y - 2, totalW, rowH).fillColor(bgColor).fill();

      doc.fontSize(fonts.body)
        .fillColor(colors.text)
        .text(row[0], startX + 8, y + 3, { width: labelW - 16 });

      const vColor = valueColorFn ? valueColorFn(row) : colors.text;
      doc.fontSize(fonts.body)
        .fillColor(vColor)
        .text(row[1], startX + labelW + 8, y + 3, { width: valueW - 16 });

      doc.y = y + rowH;
    });
  }

  addPageFooters() {
    const doc = this.doc;
    const pages = doc.bufferedPageRange();

    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);

      // Bottom line
      doc.moveTo(50, doc.page.height - 40)
        .lineTo(doc.page.width - 50, doc.page.height - 40)
        .strokeColor(colors.border)
        .lineWidth(0.5)
        .stroke();

      // Page number
      doc.fontSize(fonts.tiny)
        .fillColor(colors.textMuted)
        .text(
          `${branding.footerText}  |  ${this.testType.toUpperCase()} [${this.environment.toUpperCase()}]  |  Page ${i + 1} of ${pages.count}`,
          50,
          doc.page.height - 32,
          { align: 'center', width: doc.page.width - 100 }
        );
    }
  }
}

module.exports = { PDFReportGenerator };
