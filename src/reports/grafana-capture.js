/**
 * Grafana Panel Capture
 * Captures panel images from Grafana dashboard using the image renderer
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const GRAFANA_URL = process.env.GRAFANA_URL || 'http://localhost:3000';
const DASHBOARD_UID = 'k6-performance';

// Panel IDs from the K6 dashboard (adjust based on your dashboard)
const PANELS = {
  vus: { id: 5, title: 'Virtual Users Over Time', width: 800, height: 300 },
  rps: { id: 6, title: 'Requests per Second', width: 800, height: 300 },
  responseTime: { id: 7, title: 'Response Time (Mean, P90, P95, P99)', width: 800, height: 400 },
  responseTimeBreakdown: { id: 8, title: 'Response Time Breakdown', width: 800, height: 400 },
};

/**
 * Wait for a specified time
 * @param {number} ms - Milliseconds to wait
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if Grafana renderer is available
 * @returns {Promise<boolean>}
 */
async function isRendererAvailable() {
  return new Promise((resolve) => {
    const url = new URL(GRAFANA_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: '/api/health',
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Capture a single panel as PNG
 * @param {string} panelKey - Key from PANELS object
 * @param {string} outputDir - Directory to save the image
 * @param {string} from - Start time (e.g., 'now-15m')
 * @param {string} to - End time (e.g., 'now')
 * @returns {Promise<string|null>} Path to saved image or null if failed
 */
async function capturePanel(panelKey, outputDir, from = 'now-1h', to = 'now') {
  const panel = PANELS[panelKey];
  if (!panel) {
    console.error(`Unknown panel: ${panelKey}`);
    return null;
  }

  const renderPath = `/render/d-solo/${DASHBOARD_UID}/k6-performance` +
    `?orgId=1&panelId=${panel.id}&width=${panel.width}&height=${panel.height}` +
    `&from=${from}&to=${to}&tz=Europe/Madrid`;

  return new Promise((resolve) => {
    const url = new URL(GRAFANA_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: renderPath,
      method: 'GET',
      timeout: 30000,
    };

    const req = http.request(options, (res) => {
      if (res.statusCode !== 200) {
        console.error(`Failed to capture ${panelKey}: HTTP ${res.statusCode}`);
        resolve(null);
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const filePath = path.join(outputDir, `${panelKey}.png`);

        try {
          fs.writeFileSync(filePath, buffer);
          resolve(filePath);
        } catch (err) {
          console.error(`Failed to save ${panelKey}: ${err.message}`);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error(`Failed to capture ${panelKey}: ${err.message}`);
      resolve(null);
    });

    req.on('timeout', () => {
      req.destroy();
      console.error(`Timeout capturing ${panelKey}`);
      resolve(null);
    });

    req.end();
  });
}

/**
 * Capture all dashboard panels
 * @param {string} outputDir - Directory to save images
 * @param {number} testDurationMs - Test duration in milliseconds (to set time range)
 * @returns {Promise<object>} Object with panel paths
 */
async function captureAllPanels(outputDir, testDurationMs = 900000) {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Check if renderer is available
  const available = await isRendererAvailable();
  if (!available) {
    console.log('   Grafana renderer not available, skipping panel captures');
    return null;
  }

  // Wait a bit for data to be fully written to InfluxDB
  console.log('   Waiting for metrics to settle...');
  await sleep(3000);

  // Calculate time range based on test duration
  const bufferMs = 60000; // 1 minute buffer
  const totalMs = testDurationMs + bufferMs;
  const from = `now-${Math.ceil(totalMs / 60000)}m`;
  const to = 'now';

  const captures = {};
  const panelKeys = Object.keys(PANELS);

  console.log(`   Capturing ${panelKeys.length} panels from Grafana...`);

  for (const key of panelKeys) {
    process.stdout.write(`   - ${PANELS[key].title}... `);
    const filePath = await capturePanel(key, outputDir, from, to);
    if (filePath) {
      captures[key] = filePath;
      console.log('OK');
    } else {
      console.log('FAILED');
    }
  }

  const successCount = Object.keys(captures).length;
  console.log(`   Captured ${successCount}/${panelKeys.length} panels`);

  return successCount > 0 ? captures : null;
}

/**
 * Get panel configuration
 * @returns {object} Panel configuration
 */
function getPanelConfig() {
  return PANELS;
}

module.exports = {
  capturePanel,
  captureAllPanels,
  isRendererAvailable,
  getPanelConfig,
  PANELS,
};
