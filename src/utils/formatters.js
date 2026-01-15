export function byteSize(str = "") {
  return (str || "").length;
}

export function toMB(bytes) {
  return bytes / (1024 * 1024);
}

export function toBytes(mb) {
  return Math.floor(mb * 1024 * 1024);
}

export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function sanitizeForLog(str, maxLength = 200) {
  return String(str || "")
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}
