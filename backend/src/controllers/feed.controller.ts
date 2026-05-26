import type { Request, Response, NextFunction } from "express";

import { getFeedCountries } from "../services/country.service.js";
import { enrichCountriesWithImages } from "../services/image.service.js";

export async function getFeedCountriesHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const countries = await getFeedCountries();
    const enriched = await enrichCountriesWithImages(countries);
    res.json({
      data: enriched,
      meta: { count: enriched.length },
    });
  } catch (error) {
    next(error);
  }
}
