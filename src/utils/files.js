export function openFromRoot(path) {
  if (!path) {
    throw new Error("Path cannot be empty");
  }

  let normalized = String(path).trim().replace(/^\.\//, "");

  if (!normalized.startsWith("../")) {
    normalized = `../../${normalized}`;
  }

  return open(normalized);
}

export function openJsonFromRoot(path) {
  const content = openFromRoot(path);
  return JSON.parse(content);
}

export function safeJsonParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}
