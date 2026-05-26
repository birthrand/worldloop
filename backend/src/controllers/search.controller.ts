import type { Request, Response, NextFunction } from "express";

import { searchCountries } from "../services/search.service.js";

function parseOptionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  return value;
}

export async function searchCountriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = parseOptionalString(req.query.query);
    const region = parseOptionalString(req.query.region);

    const result = await searchCountries(query, region);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
