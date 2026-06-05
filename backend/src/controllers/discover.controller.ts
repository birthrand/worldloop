import type { NextFunction, Request, Response } from "express";

import { validateBBox } from "../lib/geo-bbox.js";
import { HttpError } from "../lib/http.js";
import {
  parseCursor,
  parseLimit,
  parseOptionalRegion,
} from "../lib/validation.js";
import { discoverCountries } from "../services/discover.service.js";

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

function parseOptionalRegionFilter(value: unknown): string | null {
  const region = parseOptionalRegion(value);
  return region ?? null;
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
    const region = parseOptionalRegionFilter(req.query.region);
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
