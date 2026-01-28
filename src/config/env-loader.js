/**
 * Environment variable loader for k6
 * Reads the .env file and provides access to variables
 */

// Load the .env file
const envFile = open('../../.env', 'r');

// Parse the .env file
function parseEnvFile(content) {
  const env = {};
  const lines = content.split('\n');

  lines.forEach(line => {
    // Ignore comments and empty lines
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    // Parse KEY=VALUE
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      env[key] = value;
    }
  });

  return env;
}

// Export environment variables
export const ENV = parseEnvFile(envFile);

/**
 * Get an environment variable with a default value
 * @param {string} key - Variable name
 * @param {any} defaultValue - Default value if missing
 * @returns {any} - Variable value or default value
 */
export function getEnv(key, defaultValue = null) {
  return ENV[key] !== undefined ? ENV[key] : defaultValue;
}

/**
 * Get an environment variable as a number
 * @param {string} key - Variable name
 * @param {number} defaultValue - Default value if missing
 * @returns {number} - Numeric value
 */
export function getEnvNumber(key, defaultValue = 0) {
  const value = ENV[key];
  if (value === undefined) return defaultValue;
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Get an environment variable as a boolean
 * @param {string} key - Variable name
 * @param {boolean} defaultValue - Default value if missing
 * @returns {boolean} - Boolean value
 */
export function getEnvBoolean(key, defaultValue = false) {
  const value = ENV[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}
