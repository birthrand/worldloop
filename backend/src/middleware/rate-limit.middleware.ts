import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";

function rateLimitResponse(_req: Request, res: Response): void {
  res.status(429).json({
    error: {
      message: "Too many requests, please try again later",
      code: "RATE_LIMIT_EXCEEDED",
    },
  });
}

/** General limit for public read endpoints. */
export const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
});

/** Stricter limit for AI generation (costly). */
export const aiGenerateRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
});
