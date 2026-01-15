import { getEnv } from './env-loader.js';

/**
 * Configuración de ambientes parametrizada
 * Los valores se cargan desde el archivo .env
 */
export const environments = {
  local: {
    baseUrl: getEnv('LOCAL_BASE_URL', 'https://efca-m3.altia-dev.es'),
    path: getEnv('LOCAL_PATH', '/DET-WS'),
    timeout: getEnv('LOCAL_TIMEOUT', '60s'),
    soapTemplates: {
      base: "data/templates/soap/connector2bridge_base.xml",
      activity: "data/templates/soap/activity.xml",
    },
    // Traffic Monitoring REST API
    authUrl: getEnv('LOCAL_AUTH_URL', 'https://efca-auth.altia.es/auth/realms/efca-test/protocol/openid-connect/token'),
    trafficUrl: getEnv('LOCAL_TRAFFIC_URL', 'https://efca-gateway.altia.es/trafficMonitoring/incoming/domain==1?page=0&size=15'),
    clientId: getEnv('LOCAL_CLIENT_ID', 'test-client'),
    clientSecret: getEnv('LOCAL_CLIENT_SECRET', ''),
    authGrantType: getEnv('LOCAL_AUTH_GRANT_TYPE', 'client_credentials'),
    authUsername: getEnv('LOCAL_AUTH_USERNAME', ''),
    authPassword: getEnv('LOCAL_AUTH_PASSWORD', ''),
  },

  dev: {
    baseUrl: getEnv('DEV_BASE_URL', 'https://efca-m3.altia-dev.es'),
    path: getEnv('DEV_PATH', '/DET-WS'),
    timeout: getEnv('DEV_TIMEOUT', '60s'),
    soapTemplates: {
      base: "data/templates/soap/connector2bridge_base.xml",
      activity: "data/templates/soap/activity.xml",
    },
    // Traffic Monitoring REST API
    authUrl: getEnv('DEV_AUTH_URL', 'https://efca-auth.altia.es/auth/realms/efca-test/protocol/openid-connect/token'),
    trafficUrl: getEnv('DEV_TRAFFIC_URL', 'https://efca-gateway.altia.es/trafficMonitoring/incoming/domain==1?page=0&size=15'),
    clientId: getEnv('DEV_CLIENT_ID', 'test-client'),
    clientSecret: getEnv('DEV_CLIENT_SECRET', ''),
    authGrantType: getEnv('DEV_AUTH_GRANT_TYPE', 'client_credentials'),
    authUsername: getEnv('DEV_AUTH_USERNAME', ''),
    authPassword: getEnv('DEV_AUTH_PASSWORD', ''),
  },

  staging: {
    baseUrl: getEnv('STAGING_BASE_URL', 'https://efca-m3.altia-staging.es'),
    path: getEnv('STAGING_PATH', '/DET-WS'),
    timeout: getEnv('STAGING_TIMEOUT', '90s'),
    soapTemplates: {
      base: "data/templates/soap/connector2bridge_base.xml",
      activity: "data/templates/soap/activity.xml",
    },
    // Traffic Monitoring REST API
    authUrl: getEnv('STAGING_AUTH_URL', 'https://efca-auth.altia.es/auth/realms/efca-staging/protocol/openid-connect/token'),
    trafficUrl: getEnv('STAGING_TRAFFIC_URL', 'https://efca-gateway.altia.es/trafficMonitoring/incoming/domain==1?page=0&size=15'),
    clientId: getEnv('STAGING_CLIENT_ID', 'test-client'),
    clientSecret: getEnv('STAGING_CLIENT_SECRET', ''),
    authGrantType: getEnv('STAGING_AUTH_GRANT_TYPE', 'client_credentials'),
    authUsername: getEnv('STAGING_AUTH_USERNAME', ''),
    authPassword: getEnv('STAGING_AUTH_PASSWORD', ''),
  },

  prod: {
    baseUrl: getEnv('PROD_BASE_URL', 'https://efca-m3.altia.es'),
    path: getEnv('PROD_PATH', '/DET-WS'),
    timeout: getEnv('PROD_TIMEOUT', '120s'),
    soapTemplates: {
      base: "data/templates/soap/connector2bridge_base.xml",
      activity: "data/templates/soap/activity.xml",
    },
    // Traffic Monitoring REST API
    authUrl: getEnv('PROD_AUTH_URL', 'https://efca-auth.altia.es/auth/realms/efca-prod/protocol/openid-connect/token'),
    trafficUrl: getEnv('PROD_TRAFFIC_URL', 'https://efca-gateway.altia.es/trafficMonitoring/incoming/domain==1?page=0&size=15'),
    clientId: getEnv('PROD_CLIENT_ID', 'test-client'),
    clientSecret: getEnv('PROD_CLIENT_SECRET', ''),
    authGrantType: getEnv('PROD_AUTH_GRANT_TYPE', 'client_credentials'),
    authUsername: getEnv('PROD_AUTH_USERNAME', ''),
    authPassword: getEnv('PROD_AUTH_PASSWORD', ''),
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
