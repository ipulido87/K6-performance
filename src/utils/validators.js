export function validateRequired(obj, requiredFields, context = "object") {
  const missing = requiredFields.filter(field => !obj[field]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required fields in ${context}: ${missing.join(", ")}`
    );
  }
}

export function validateEnvNumber(value, defaultValue, min = 0, max = Infinity) {
  const num = Number(value ?? defaultValue);

  if (isNaN(num)) {
    throw new Error(`Invalid number: ${value}`);
  }

  if (num < min || num > max) {
    throw new Error(`Number ${num} out of range [${min}, ${max}]`);
  }

  return num;
}

export function validateEnvString(value, defaultValue, allowedValues = []) {
  const str = String(value ?? defaultValue).toLowerCase();

  if (allowedValues.length > 0 && !allowedValues.includes(str)) {
    throw new Error(
      `Invalid value "${str}". Allowed: ${allowedValues.join(", ")}`
    );
  }

  return str;
}

export function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const urlPattern = /^https?:\/\/.+/i;
  return urlPattern.test(url);
}
