import http from 'k6/http';
import { check } from 'k6';
import { getOAuth2Token, createAuthHeaders } from '../utils/oauth2.js';

/**
 * Cliente para Traffic Monitoring API
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
   * Autentica y obtiene el token de acceso
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
   * Obtiene los datos del dominio de Traffic Monitoring
   * @returns {object} Respuesta HTTP de k6
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
      'Traffic Monitoring: tiene respuesta': (r) => r.body && r.body.length > 0,
    });

    return response;
  }

  /**
   * Re-autentica si el token expiró (status 401)
   * @param {object} response - Respuesta HTTP
   * @returns {boolean} true si se re-autenticó
   */
  handleUnauthorized(response) {
    if (response.status === 401) {
      console.log('Token expirado, re-autenticando...');
      this.authenticate();
      return true;
    }
    return false;
  }
}

/**
 * Factory para crear cliente de Traffic Monitoring según el ambiente
 * @param {object} env - Configuración del ambiente
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
