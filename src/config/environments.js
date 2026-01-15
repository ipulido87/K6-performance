export const environments = {
  local: {
    baseUrl: "https://efca-m3.altia-dev.es",
    path: "/DET-WS",
    timeout: "60s",
    soapTemplates: {
      base: "data/templates/soap/connector2bridge_base.xml",
      activity: "data/templates/soap/activity.xml",
    },
  },

  dev: {
    baseUrl: "https://efca-m3.altia-dev.es",
    path: "/DET-WS",
    timeout: "60s",
    soapTemplates: {
      base: "data/templates/soap/connector2bridge_base.xml",
      activity: "data/templates/soap/activity.xml",
    },
  },

  staging: {
    baseUrl: "https://efca-m3.altia-staging.es",
    path: "/DET-WS",
    timeout: "90s",
    soapTemplates: {
      base: "data/templates/soap/connector2bridge_base.xml",
      activity: "data/templates/soap/activity.xml",
    },
  },

  prod: {
    baseUrl: "https://efca-m3.altia.es",
    path: "/DET-WS",
    timeout: "120s",
    soapTemplates: {
      base: "data/templates/soap/connector2bridge_base.xml",
      activity: "data/templates/soap/activity.xml",
    },
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
