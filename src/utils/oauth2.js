import http from 'k6/http';
import { check, fail } from 'k6';

/**
 * Obtiene un token de acceso OAuth2 usando client_credentials
 * @param {string} authUrl - URL del endpoint de autenticación
 * @param {string} clientId - Client ID
 * @param {string} clientSecret - Client Secret
 * @returns {string} Access token
 */
export function getOAuth2Token(
  authUrl,
  clientId,
  clientSecret,
  grantType = 'client_credentials',
  username = null,
  password = null
) {
  const payload = {
    grant_type: grantType,
    client_id: clientId,
  };

  if (clientSecret) {
    payload.client_secret = clientSecret;
  }

  if (grantType === 'password') {
    payload.username = username;
    payload.password = password;
  }

  const params = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    tags: { name: 'OAuth2_Token' },
  };

  const response = http.post(authUrl, payload, params);

  const authCheck = check(response, {
    'OAuth2: status 200': (r) => r.status === 200,
    'OAuth2: tiene access_token': (r) => r.json('access_token') !== undefined,
  });

  if (!authCheck) {
    console.error(`OAuth2 Error: ${response.status} - ${response.body}`);
    fail('No se pudo obtener el token de autenticación');
  }

  return response.json('access_token');
}

/**
 * Crea headers con autenticación Bearer
 * @param {string} token - Access token
 * @returns {object} Headers con Authorization
 */
export function createAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
