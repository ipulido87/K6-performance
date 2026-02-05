/**
 * PDF Report Styles and Colors
 * Defines the visual appearance of generated PDF reports
 */

export const colors = {
  // Status colors
  passed: '#16a34a',      // Green-600
  failed: '#dc2626',      // Red-600
  warning: '#d97706',     // Amber-600

  // Metric status
  good: '#16a34a',
  caution: '#d97706',
  bad: '#dc2626',

  // Primary palette
  primary: '#1e40af',     // Blue-800
  primaryLight: '#3b82f6', // Blue-500
  primaryDark: '#1e3a5f',  // Navy
  accent: '#7c3aed',      // Violet-600

  // Neutral palette
  text: '#1e293b',        // Slate-800
  textLight: '#64748b',   // Slate-500
  textMuted: '#94a3b8',   // Slate-400
  background: '#f8fafc',  // Slate-50
  backgroundAlt: '#f1f5f9', // Slate-100
  white: '#ffffff',
  border: '#e2e8f0',      // Slate-200
  borderDark: '#cbd5e1',  // Slate-300

  // Table
  tableHeader: '#1e3a5f',
  tableHeaderText: '#ffffff',
  tableRowEven: '#f1f5f9',
  tableRowOdd: '#ffffff',

  // Chart section colors
  sectionOverview: '#1e40af',
  sectionLoad: '#7c3aed',
  sectionResponse: '#0891b2',
  sectionErrors: '#dc2626',
  sectionComparison: '#d97706',

  // Cover badge backgrounds
  coverBadgePassed: '#dcfce7',
  coverBadgeFailed: '#fef2f2',
};

export const fonts = {
  title: 28,
  subtitle: 20,
  heading: 14,
  subheading: 12,
  body: 10,
  small: 9,
  tiny: 7,
};

export const spacing = {
  margin: 50,
  sectionGap: 25,
  paragraphGap: 12,
  lineHeight: 1.4,
};

export const layout = {
  pageWidth: 595.28,
  pageHeight: 841.89,
  contentWidth: 495.28,
};

export const branding = {
  reportTitle: 'K6 Performance Test Report',
  companyName: 'Performance Engineering Team',
  footerText: 'K6 Performance Testing Framework',
};

export function getStatusColor(passed, value, threshold) {
  if (passed) {
    if (threshold && value) {
      const ratio = value / threshold;
      if (ratio > 0.8) return colors.caution;
    }
    return colors.good;
  }
  return colors.bad;
}

export function formatDuration(ms) {
  if (ms == null || isNaN(ms)) return 'N/A';
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

export function formatNumber(num, decimals = 2) {
  if (num === undefined || num === null) return 'N/A';
  if (Number.isInteger(num)) return num.toLocaleString();
  return num.toFixed(decimals);
}

export function formatPercentage(value) {
  if (value === undefined || value === null) return 'N/A';
  return `${(value * 100).toFixed(2)}%`;
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
