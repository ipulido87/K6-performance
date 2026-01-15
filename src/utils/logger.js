import { sanitizeForLog } from "./formatters.js";

export const LogLevel = {
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
};

export class Logger {
  constructor(context = {}) {
    this.context = context;
  }

  log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...data,
    };

    console.log(JSON.stringify(logEntry));
  }

  debug(message, data = {}) {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message, data = {}) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message, data = {}) {
    this.log(LogLevel.WARN, message, data);
  }

  error(message, data = {}) {
    this.log(LogLevel.ERROR, message, data);
  }

  logBadResponse(response, context = {}) {
    const snippet = sanitizeForLog(response.body, 250);

    this.error("Bad response received", {
      status: response.status,
      snippet,
      ...context,
    });
  }
}

export function createLogger(testName, additionalContext = {}) {
  return new Logger({
    test: testName,
    ...additionalContext,
  });
}
