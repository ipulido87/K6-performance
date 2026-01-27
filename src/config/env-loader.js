/**
 * Cargador de variables de entorno para k6
 * Lee el archivo .env y proporciona acceso a las variables
 */

// Cargar el archivo .env
const envFile = open('../../.env', 'r');

// Parsear el archivo .env
function parseEnvFile(content) {
  const env = {};
  const lines = content.split('\n');

  lines.forEach(line => {
    // Ignorar comentarios y líneas vacías
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    // Parsear KEY=VALUE
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remover comillas si existen
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      env[key] = value;
    }
  });

  return env;
}

// Exportar las variables de entorno
export const ENV = parseEnvFile(envFile);

/**
 * Obtener una variable de entorno con valor por defecto
 * @param {string} key - Nombre de la variable
 * @param {any} defaultValue - Valor por defecto si no existe
 * @returns {any} - Valor de la variable o el valor por defecto
 */
export function getEnv(key, defaultValue = null) {
  return ENV[key] !== undefined ? ENV[key] : defaultValue;
}

/**
 * Obtener una variable de entorno como número
 * @param {string} key - Nombre de la variable
 * @param {number} defaultValue - Valor por defecto si no existe
 * @returns {number} - Valor numérico
 */
export function getEnvNumber(key, defaultValue = 0) {
  const value = ENV[key];
  if (value === undefined) return defaultValue;
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Obtener una variable de entorno como booleano
 * @param {string} key - Nombre de la variable
 * @param {boolean} defaultValue - Valor por defecto si no existe
 * @returns {boolean} - Valor booleano
 */
export function getEnvBoolean(key, defaultValue = false) {
  const value = ENV[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}
