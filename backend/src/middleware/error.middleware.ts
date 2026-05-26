import type { Request, Response, NextFunction } from "express";

import { HttpError } from "../lib/http.js";
import { logger } from "../utils/logger.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: {
        message: err.message,
        code: err.code ?? "HTTP_ERROR",
      },
    });
    return;
  }

  logger.error("Unhandled error", {
    error: err instanceof Error ? err.message : String(err),
  });

  res.status(500).json({
    error: {
      message: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
    },
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: {
      message: "Route not found",
      code: "NOT_FOUND",
    },
  });
}
