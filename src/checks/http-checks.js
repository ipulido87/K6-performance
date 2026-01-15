import { check } from "k6";

export function isHttp200(response) {
  return response.status === 200;
}

export function isHttp2xx(response) {
  return response.status >= 200 && response.status < 300;
}

export function isHttpSuccess(response) {
  return response.status < 400;
}

export function isTimeout(response) {
  return response.status === 0;
}

export function isServerError(response) {
  return response.status >= 500 && response.status < 600;
}

export function runHttpChecks(response, options = {}) {
  const { name = "Request", expectStatus = 200 } = options;

  return check(response, {
    [`${name}: HTTP ${expectStatus}`]: (r) => r.status === expectStatus,
    [`${name}: No timeout`]: (r) => r.status !== 0,
    [`${name}: Response body exists`]: (r) => r.body && r.body.length > 0,
  });
}
