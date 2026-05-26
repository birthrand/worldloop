import { env } from "../config/env.js";

type LogLevel = "info" | "warn" | "error" | "debug";

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const payload = {
    level,
    message,
    ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(payload));
    return;
  }

  if (level === "debug" && env.nodeEnv !== "development") {
    return;
  }

  console.log(JSON.stringify(payload));
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) =>
    log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    log("error", message, meta),
  debug: (message: string, meta?: Record<string, unknown>) =>
    log("debug", message, meta),
};
