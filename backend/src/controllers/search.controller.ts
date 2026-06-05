import type { NextFunction, Request, Response } from "express";

import {
  parseOptionalRegion,
  parseOptionalSearchQuery,
} from "../lib/validation.js";
import { searchCountries } from "../services/search.service.js";

export async function searchCountriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = parseOptionalSearchQuery(req.query.query);
    const region = parseOptionalRegion(req.query.region);

    const result = await searchCountries(query, region);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
