import http from "k6/http";
import { Counter } from "k6/metrics";

const authFailures = new Counter("traffic_auth_failures");
const authRefreshSuccess = new Counter("traffic_auth_refresh_success");
const proactiveRefresh = new Counter("traffic_proactive_refresh");

/**
 * Manages OAuth2 token lifecycle with proactive refresh.
 *
 * @param {object} config - Configuration object
 * @param {string} config.authUrl
 * @param {string} config.clientId
 * @param {string} config.clientSecret
 * @param {string} config.authGrantType
 * @param {string} config.authUsername
 * @param {string} config.authPassword
 * @param {object} [opts]
 * @param {number} [opts.lifetimeMs=300000] - Token lifetime in ms
 * @param {number} [opts.refreshMarginMs=60000] - Refresh margin before expiry
 * @param {Function} [opts.onWarn] - Warning callback (message, data)
 */
export class OAuth2Manager {
  constructor(config, opts = {}) {
    this.authUrl = config.authUrl;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.grantType = config.authGrantType;
    this.username = config.authUsername;
    this.password = config.authPassword;

    this.lifetimeMs = opts.lifetimeMs ?? 300000;
    this.refreshMarginMs = opts.refreshMarginMs ?? 60000;
    this.onWarn = opts.onWarn ?? (() => {});

    this.token = null;
    this.tokenObtainedAt = 0;
  }

  authenticate() {
    if (!this.authUrl || !this.clientId) return null;

    const payload = {
      grant_type: this.grantType,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      username: this.username,
      password: this.password,
    };

    const response = http.post(this.authUrl, payload, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      tags: { name: "OAuth2_Token" },
    });

    if (response.status !== 200) {
      authFailures.add(1, { reason: "token_request_failed" });
      this.onWarn("Authentication failed", { status: response.status });
      return null;
    }

    try {
      const data = JSON.parse(response.body);
      const token = data.access_token ?? null;
      if (token) {
        this.token = token;
        this.tokenObtainedAt = Date.now();
      }
      return token;
    } catch {
      authFailures.add(1, { reason: "token_response_invalid" });
      this.onWarn("Authentication response is not valid JSON");
      return null;
    }
  }

  needsRefresh() {
    if (!this.tokenObtainedAt) return false;
    const age = Date.now() - this.tokenObtainedAt;
    return age > (this.lifetimeMs - this.refreshMarginMs);
  }

  refreshIfNeeded() {
    if (!this.needsRefresh()) return;
    const newToken = this.authenticate();
    if (newToken) proactiveRefresh.add(1);
  }

  handleUnauthorized(response) {
    if (response.status !== 401 && response.status !== 403) return false;

    authFailures.add(1, { reason: classifyAuthReason(response) });
    const newToken = this.authenticate();
    if (newToken) {
      authRefreshSuccess.add(1);
      return true;
    }
    authFailures.add(1, { reason: "token_refresh_failed" });
    return false;
  }

  getAuthHeaders() {
    const headers = { "Content-Type": "application/json" };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    return headers;
  }

  initFromSetupData(data) {
    if (!this.token && data?.authToken) {
      this.token = data.authToken;
      this.tokenObtainedAt = Date.now();
    }
  }
}

function classifyAuthReason(response) {
  if (response.status === 401) return "unauthorized_401";
  if (response.status === 403) {
    const body = String(response.body || "").toLowerCase();
    if (body.includes("token is not active")) return "token_not_active";
    if (body.includes("token") && body.includes("expired")) return "token_expired";
    return "forbidden_403";
  }
  return "auth_error_other";
}
