import type { NextFunction, Request, Response } from "express";

import { parseCountryName } from "../lib/validation.js";
import { enrichCountryWithAi } from "../services/ai.service.js";
import { getCountryByName } from "../services/country.service.js";
import { enrichCountryWithImages } from "../services/image.service.js";
import { getNewsForCountry } from "../services/news.service.js";
import { getWikipediaForCountry } from "../services/wikipedia.service.js";

export async function getCountryExplorer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const name = parseCountryName(req.params.name);

    const country = await getCountryByName(name);
    const withImages = await enrichCountryWithImages(country);
    const withAi = await enrichCountryWithAi(withImages);
    const [explorer, wikipedia] = await Promise.all([
      getNewsForCountry(withAi.name, withAi.cca2, {
        capital: withAi.capital,
        region: withAi.region,
      }),
      getWikipediaForCountry(withAi.name),
    ]);

    res.json({
      data: {
        country: withAi,
        explorer,
        wikipedia,
      },
    });
  } catch (error) {
    next(error);
  }
}
