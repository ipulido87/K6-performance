import { openJsonFromRoot } from "../utils/files.js";
import { validateRequired, isValidUrl } from "../utils/validators.js";
import { getEnvironment } from "./environments.js";
import { getEnv } from "./env-loader.js";
import { getThresholds } from "./thresholds.js";

export class Config {
  constructor(environment = "local") {
    this.environment = environment;
    this.envConfig = getEnvironment(environment);
    this.customConfig = this.loadCustomConfig();
    this.merged = this.mergeConfig();
    this.validate();
  }

  loadCustomConfig() {
    try {
      return openJsonFromRoot(`config/${this.environment}.json`);
    } catch (error) {
      console.warn(`No custom config found for ${this.environment}, using defaults`);
      return {};
    }
  }

  mergeConfig() {
    return {
      ...this.envConfig,
      ...this.customConfig,
      url: this.buildUrl(),
    };
  }

  buildUrl() {
    const baseUrl = this.customConfig.baseUrl || this.envConfig.baseUrl;
    const path = this.customConfig.path || this.envConfig.path;
    return `${baseUrl}${path}`;
  }

  validate() {
    validateRequired(
      this.merged,
      ["baseUrl", "path", "timeout"],
      `config for ${this.environment}`
    );

    if (!isValidUrl(this.merged.url)) {
      throw new Error(`Invalid URL: ${this.merged.url}`);
    }

    if (this.merged.soapTemplates) {
      validateRequired(
        this.merged.soapTemplates,
        ["base"],
        "soapTemplates config"
      );
    }
  }

  get(key, defaultValue = undefined) {
    return this.merged[key] ?? defaultValue;
  }

  getAll() {
    return { ...this.merged };
  }
}

export function loadConfig(environment = getEnv("ENVIRONMENT")) {
  return new Config(environment);
}

export { getThresholds } from "./thresholds.js";
