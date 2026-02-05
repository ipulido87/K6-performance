import { getEnv } from './env-loader.js';

const SOAP_TEMPLATES = {
  base: "data/templates/soap/connector2bridge_base.xml",
  activity: "data/templates/soap/activity.xml",
};

const VALID_ENVS = ['local', 'dev', 'staging', 'prod'];

function buildEnvConfig(prefix) {
  return {
    baseUrl: getEnv(`${prefix}_BASE_URL`),
    path: getEnv(`${prefix}_PATH`),
    timeout: getEnv(`${prefix}_TIMEOUT`),
    soapTemplates: { ...SOAP_TEMPLATES },
    authUrl: getEnv(`${prefix}_AUTH_URL`),
    trafficUrl: getEnv(`${prefix}_TRAFFIC_URL`),
    clientId: getEnv(`${prefix}_CLIENT_ID`),
    clientSecret: getEnv(`${prefix}_CLIENT_SECRET`),
    authGrantType: getEnv(`${prefix}_AUTH_GRANT_TYPE`),
    authUsername: getEnv(`${prefix}_AUTH_USERNAME`),
    authPassword: getEnv(`${prefix}_AUTH_PASSWORD`),
  };
}

export const environments = Object.fromEntries(
  VALID_ENVS.map(env => [env, buildEnvConfig(env.toUpperCase())])
);

export function getEnvironment(envName = "local") {
  const env = environments[envName.toLowerCase()];

  if (!env) {
    throw new Error(
      `Unknown environment: ${envName}. Available: ${VALID_ENVS.join(", ")}`
    );
  }

  return env;
}
