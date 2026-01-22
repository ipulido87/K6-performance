import { getEnv } from './env-loader.js';

/**
 * Configuración de ambientes parametrizada
 * Los valores se cargan desde el archivo .env
 */
export const environments = {
  local: {
    baseUrl: getEnv('LOCAL_BASE_URL'),
    path: getEnv('LOCAL_PATH'),
    timeout: getEnv('LOCAL_TIMEOUT'),
    soapTemplates: {
      base: "data/templates/soap/connector2bridge_base.xml",
      activity: "data/templates/soap/activity.xml",
    },
    // Traffic Monitoring REST API
    authUrl: getEnv('LOCAL_AUTH_URL'),
    trafficUrl: getEnv('LOCAL_TRAFFIC_URL'),
    clientId: getEnv('LOCAL_CLIENT_ID'),
    clientSecret: getEnv('LOCAL_CLIENT_SECRET'),
    authGrantType: getEnv('LOCAL_AUTH_GRANT_TYPE'),
    authUsername: getEnv('LOCAL_AUTH_USERNAME'),
    authPassword: getEnv('LOCAL_AUTH_PASSWORD'),
  },

  dev: {
    baseUrl: getEnv('DEV_BASE_URL'),
    path: getEnv('DEV_PATH'),
    timeout: getEnv('DEV_TIMEOUT'),
    soapTemplates: {
      base: "data/templates/soap/connector2bridge_base.xml",
      activity: "data/templates/soap/activity.xml",
    },
    // Traffic Monitoring REST API
    authUrl: getEnv('DEV_AUTH_URL'),
    trafficUrl: getEnv('DEV_TRAFFIC_URL'),
    clientId: getEnv('DEV_CLIENT_ID'),
    clientSecret: getEnv('DEV_CLIENT_SECRET'),
    authGrantType: getEnv('DEV_AUTH_GRANT_TYPE'),
    authUsername: getEnv('DEV_AUTH_USERNAME'),
    authPassword: getEnv('DEV_AUTH_PASSWORD'),
  },

  staging: {
    baseUrl: getEnv('STAGING_BASE_URL'),
    path: getEnv('STAGING_PATH'),
    timeout: getEnv('STAGING_TIMEOUT'),
    soapTemplates: {
      base: "data/templates/soap/connector2bridge_base.xml",
      activity: "data/templates/soap/activity.xml",
    },
    // Traffic Monitoring REST API
    authUrl: getEnv('STAGING_AUTH_URL'),
    trafficUrl: getEnv('STAGING_TRAFFIC_URL'),
    clientId: getEnv('STAGING_CLIENT_ID'),
    clientSecret: getEnv('STAGING_CLIENT_SECRET'),
    authGrantType: getEnv('STAGING_AUTH_GRANT_TYPE'),
    authUsername: getEnv('STAGING_AUTH_USERNAME'),
    authPassword: getEnv('STAGING_AUTH_PASSWORD'),
  },

  prod: {
    baseUrl: getEnv('PROD_BASE_URL'),
    path: getEnv('PROD_PATH'),
    timeout: getEnv('PROD_TIMEOUT'),
    soapTemplates: {
      base: "data/templates/soap/connector2bridge_base.xml",
      activity: "data/templates/soap/activity.xml",
    },
    // Traffic Monitoring REST API
    authUrl: getEnv('PROD_AUTH_URL'),
    trafficUrl: getEnv('PROD_TRAFFIC_URL'),
    clientId: getEnv('PROD_CLIENT_ID'),
    clientSecret: getEnv('PROD_CLIENT_SECRET'),
    authGrantType: getEnv('PROD_AUTH_GRANT_TYPE'),
    authUsername: getEnv('PROD_AUTH_USERNAME'),
    authPassword: getEnv('PROD_AUTH_PASSWORD'),
  },
};

export function getEnvironment(envName = "local") {
  const env = environments[envName.toLowerCase()];

  if (!env) {
    throw new Error(
      `Unknown environment: ${envName}. Available: ${Object.keys(environments).join(", ")}`
    );
  }

  return env;
}
