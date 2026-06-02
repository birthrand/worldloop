import type { NextFunction, Request, Response } from "express";

import { validateBBox } from "../lib/geo-bbox.js";
import { HttpError } from "../lib/http.js";
import { discoverCountries } from "../services/discover.service.js";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

function parseRequiredFloat(value: unknown, field: string): number {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(
      `${field} is required`,
      400,
      `MISSING_${field.toUpperCase()}`,
    );
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new HttpError(
      `${field} must be a number`,
      400,
      `INVALID_${field.toUpperCase()}`,
    );
  }

  return parsed;
}

function parseOptionalFloat(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") return undefined;

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new HttpError(
      `${field} must be a number`,
      400,
      `INVALID_${field.toUpperCase()}`,
    );
  }

  return parsed;
}

function parseOptionalString(value: unknown): string | null {
  if (value === undefined) return null;
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

function parseLimit(value: unknown): number {
  if (value === undefined) return DEFAULT_LIMIT;

  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError("limit must be a number", 400, "INVALID_LIMIT");
  }

  if (!/^\d+$/.test(value)) {
    throw new HttpError("limit must be a number", 400, "INVALID_LIMIT");
  }

  const parsed = Number.parseInt(value, 10);
  if (parsed > MAX_LIMIT) {
    throw new HttpError(
      `limit must be at most ${MAX_LIMIT}`,
      400,
      "LIMIT_TOO_LARGE",
    );
  }

  if (parsed <= 0) {
    throw new HttpError("limit must be greater than 0", 400, "INVALID_LIMIT");
  }

  return parsed;
}

function parseCursor(value: unknown): number {
  if (value === undefined) return 0;

  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError("cursor must be a number", 400, "INVALID_CURSOR");
  }

  if (!/^\d+$/.test(value)) {
    throw new HttpError("cursor must be a number", 400, "INVALID_CURSOR");
  }

  return Number.parseInt(value, 10);
}

export async function discoverCountriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const west = parseRequiredFloat(req.query.west, "west");
    const south = parseRequiredFloat(req.query.south, "south");
    const east = parseRequiredFloat(req.query.east, "east");
    const north = parseRequiredFloat(req.query.north, "north");

    const bboxError = validateBBox({ west, south, east, north });
    if (bboxError) {
      throw new HttpError(bboxError, 400, "INVALID_BBOX");
    }

    const centerLat = parseOptionalFloat(req.query.centerLat, "centerLat");
    const centerLng = parseOptionalFloat(req.query.centerLng, "centerLng");
    const region = parseOptionalString(req.query.region);
    const limit = parseLimit(req.query.limit);
    const cursor = parseCursor(req.query.cursor);

    const result = await discoverCountries({
      west,
      south,
      east,
      north,
      centerLat,
      centerLng,
      region,
      limit,
      cursor,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}
