import http from 'k6/http';
import { check, fail } from 'k6';

/**
 * Get an OAuth2 access token using client_credentials
 * @param {string} authUrl - Authentication endpoint URL
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
    'OAuth2: has access_token': (r) => r.json('access_token') !== undefined,
  });

  if (!authCheck) {
    console.error(`OAuth2 Error: ${response.status} - ${response.body}`);
    fail('Failed to obtain authentication token');
  }

  return response.json('access_token');
}

/**
 * Create headers with Bearer authentication
 * @param {string} token - Access token
 * @returns {object} Headers with Authorization
 */
export function createAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
