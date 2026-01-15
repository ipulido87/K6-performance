import { check } from "k6";
import { isHttp200 } from "./http-checks.js";
import { safeJsonParse } from "../utils/files.js";

export function isSoapStatusOk(response) {
  return (
    response.body && response.body.includes("<urn:Status>OK</urn:Status>")
  );
}

export function soapContainsTag(response, tag) {
  return response.body && response.body.includes(tag);
}

export function extractErrorMessage(response) {
  if (!response.body) return "";

  const json = safeJsonParse(response.body);
  if (json && json.message) {
    return json.message;
  }

  const faultMatch = response.body.match(/<faultstring>(.*?)<\/faultstring>/);
  if (faultMatch) {
    return faultMatch[1];
  }

  return "";
}

export function detectErrorTypes(response) {
  const message = extractErrorMessage(response);

  return {
    isRejectedSemaphore: message === "REJECTED_SEMAPHORE_EXECUTION",
    isShortCircuit: message === "SHORTCIRCUIT",
    isTimeout: response.status === 0,
    isServerError: response.status >= 500,
    message,
  };
}

export function runSoapChecks(response, options = {}) {
  const { name = "SOAP Request", size = null } = options;

  const checks = {
    [`${name}: HTTP 200`]: (r) => isHttp200(r),
    [`${name}: SOAP Status OK`]: (r) => isSoapStatusOk(r),
  };

  if (size !== null) {
    checks[`${name}: HTTP 200 @ ${size}MB`] = (r) => isHttp200(r);
    checks[`${name}: SOAP OK @ ${size}MB`] = (r) => isSoapStatusOk(r);
  }

  return check(response, checks);
}

export function validateSoapResponse(response) {
  const httpOk = isHttp200(response);
  const soapOk = isSoapStatusOk(response);
  const errors = detectErrorTypes(response);

  return {
    isValid: httpOk && soapOk,
    httpOk,
    soapOk,
    errors,
    shouldRetry: errors.isTimeout || response.status === 503,
  };
}
