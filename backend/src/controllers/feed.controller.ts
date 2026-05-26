import type { NextFunction, Request, Response } from "express";

import { HttpError } from "../lib/http.js";
import { getFeedBatch } from "../services/feed.service.js";

function parseOptionalInt(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(
      `${field} must be a number`,
      400,
      `INVALID_${field.toUpperCase()}`,
    );
  }

  if (!/^\d+$/.test(value)) {
    throw new HttpError(
      `${field} must be a number`,
      400,
      `INVALID_${field.toUpperCase()}`,
    );
  }
  const parsed = Number.parseInt(value, 10);
  return parsed;
}

export async function getFeedCountriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const cursor =
      typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const limit = parseOptionalInt(req.query.limit, "limit");

    const batch = await getFeedBatch(cursor, limit);
    res.json(batch);
  } catch (error) {
    next(error);
  }
}
