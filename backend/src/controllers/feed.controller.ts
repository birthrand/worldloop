import type { NextFunction, Request, Response } from "express";

import { parseOptionalLimit } from "../lib/validation.js";
import { getFeedBatch } from "../services/feed.service.js";

export async function getFeedCountriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const cursor =
      typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const limit = parseOptionalLimit(req.query.limit);

    const batch = await getFeedBatch(cursor, limit);
    res.json(batch);
  } catch (error) {
    next(error);
  }
}
