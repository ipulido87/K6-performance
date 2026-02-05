import http from 'k6/http';
import { check } from 'k6';
import { getOAuth2Token, createAuthHeaders } from '../utils/oauth2.js';

export class TrafficMonitoringClient {
  constructor(config) {
    this.authUrl = config.authUrl;
    this.trafficUrl = config.trafficUrl;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.authGrantType = config.authGrantType;
    this.authUsername = config.authUsername;
    this.authPassword = config.authPassword;
    this.token = null;
  }

  authenticate() {
    this.token = getOAuth2Token(
      this.authUrl, this.clientId, this.clientSecret,
      this.authGrantType, this.authUsername, this.authPassword,
    );
    return this.token;
  }

  getDataDomain() {
    if (!this.token) this.authenticate();

    const response = http.get(this.trafficUrl, {
      headers: createAuthHeaders(this.token),
      tags: { name: 'TrafficMonitoring_GetDataDomain' },
    });

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

  handleUnauthorized(response) {
    if (response.status === 401) {
      console.log('Token expired, re-authenticating...');
      this.authenticate();
      return true;
    }
    return false;
  }
}

export function createTrafficMonitoringClient(envConfig) {
  return new TrafficMonitoringClient(envConfig);
}
