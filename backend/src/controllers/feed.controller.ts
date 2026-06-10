import type { NextFunction, Request, Response } from "express";

import {
  parseOptionalDisplayWidth,
  parseOptionalLimit,
} from "../lib/validation.js";
import { getCultureFeedBatch } from "../services/culture-feed.service.js";
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
    const displayWidthPx = parseOptionalDisplayWidth(req.query.displayWidth);

    const batch = await getFeedBatch(cursor, limit, { displayWidthPx });
    res.json(batch);
  } catch (error) {
    next(error);
  }
}

export async function getCultureFeedCountriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const cursor =
      typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const limit = parseOptionalLimit(req.query.limit);
    const seed =
      typeof req.query.seed === "string" ? req.query.seed : undefined;
    const displayWidthPx = parseOptionalDisplayWidth(req.query.displayWidth);

    const batch = await getCultureFeedBatch(seed, cursor, limit, {
      displayWidthPx,
    });
    res.json(batch);
  } catch (error) {
    next(error);
  }
}
