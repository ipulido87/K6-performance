/**
 * Reports Module
 * Exports all report generation utilities
 */

const { PDFReportGenerator } = require('./pdf-generator');
const {
  parseK6JSON,
  extractKeyMetrics,
  extractThresholdResults,
  checkTestPassed,
  extractCustomMetrics,
  extractStatusCodes,
  calculateMetricStats,
  percentile,
} = require('./k6-json-parser');

const {
  calculateDetailedStats,
  calculateRPS,
  calculateErrorRate,
  evaluateThreshold,
  analyzeTrend,
  generateRecommendations,
  calculateHealthScore,
  getHealthLabel,
} = require('./metrics-calculator');

const {
  colors,
  fonts,
  spacing,
  layout,
  branding,
  getStatusColor,
  formatDuration,
  formatNumber,
  formatPercentage,
  formatBytes,
} = require('./templates/styles');

const {
  metricsGlossary,
  getMetricExplanation,
  getAllCategories,
} = require('./templates/glossary');

const {
  testDescriptions,
  getTestDescription,
  getAllTestTypes,
} = require('./templates/test-descriptions');

const {
  capturePanel,
  captureAllPanels,
  isRendererAvailable,
  getPanelConfig,
  PANELS,
} = require('./grafana-capture');

module.exports = {
  // Main generator
  PDFReportGenerator,

  // Parser
  parseK6JSON,
  extractKeyMetrics,
  extractThresholdResults,
  checkTestPassed,
  extractCustomMetrics,
  extractStatusCodes,
  calculateMetricStats,
  percentile,

  // Calculator
  calculateDetailedStats,
  calculateRPS,
  calculateErrorRate,
  evaluateThreshold,
  analyzeTrend,
  generateRecommendations,
  calculateHealthScore,
  getHealthLabel,

  // Styles
  colors,
  fonts,
  spacing,
  layout,
  branding,
  getStatusColor,
  formatDuration,
  formatNumber,
  formatPercentage,
  formatBytes,

  // Glossary
  metricsGlossary,
  getMetricExplanation,
  getAllCategories,

  // Test descriptions
  testDescriptions,
  getTestDescription,
  getAllTestTypes,

  // Grafana capture
  capturePanel,
  captureAllPanels,
  isRendererAvailable,
  getPanelConfig,
  PANELS,
};
