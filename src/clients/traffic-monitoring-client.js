import http from 'k6/http';
import { check } from 'k6';
import { getOAuth2Token, createAuthHeaders } from '../utils/oauth2.js';

/**
 * Traffic Monitoring API client
 */
export class TrafficMonitoringClient {
  constructor(
    authUrl,
    trafficUrl,
    clientId,
    clientSecret,
    authGrantType,
    authUsername,
    authPassword
  ) {
    this.authUrl = authUrl;
    this.trafficUrl = trafficUrl;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.authGrantType = authGrantType;
    this.authUsername = authUsername;
    this.authPassword = authPassword;
    this.token = null;
  }

  /**
   * Authenticate and get the access token
   */
  authenticate() {
    this.token = getOAuth2Token(
      this.authUrl,
      this.clientId,
      this.clientSecret,
      this.authGrantType,
      this.authUsername,
      this.authPassword
    );
    return this.token;
  }

  /**
   * Get Traffic Monitoring domain data
   * @returns {object} k6 HTTP response
   */
  getDataDomain() {
    if (!this.token) {
      this.authenticate();
    }

    const params = {
      headers: createAuthHeaders(this.token),
      tags: { name: 'TrafficMonitoring_GetDataDomain' },
    };

    const response = http.get(this.trafficUrl, params);

    if (response.status !== 200) {
      const preview = response.body ? response.body.slice(0, 200) : '';
      console.log(`Traffic Monitoring error status=${response.status} body=${preview}`);
    }

    check(response, {
      'Traffic Monitoring: status 200': (r) => r.status === 200,
      'Traffic Monitoring: has response': (r) => r.body && r.body.length > 0,
    });

    return response;
  }

  /**
   * Re-authenticate if the token expired (status 401)
   * @param {object} response - HTTP response
   * @returns {boolean} true if re-authenticated
   */
  handleUnauthorized(response) {
    if (response.status === 401) {
      console.log('Token expired, re-authenticating...');
      this.authenticate();
      return true;
    }
    return false;
  }
}

/**
 * Factory to create a Traffic Monitoring client for an environment
 * @param {object} env - Environment configuration
 * @returns {TrafficMonitoringClient}
 */
export function createTrafficMonitoringClient(env) {
  return new TrafficMonitoringClient(
    env.authUrl,
    env.trafficUrl,
    env.clientId,
    env.clientSecret,
    env.authGrantType,
    env.authUsername,
    env.authPassword
  );
}
