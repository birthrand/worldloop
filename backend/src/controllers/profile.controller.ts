import type { NextFunction, Request, Response } from "express";

import { parseCountryName } from "../lib/validation.js";
import { enrichCountryWithAi } from "../services/ai.service.js";
import { getCountryByName } from "../services/country.service.js";
import { enrichCountryWithImages } from "../services/image.service.js";
import { getLandmarksForCountry } from "../services/landmarks.service.js";
import { enrichCountryWithVideos } from "../services/video.service.js";
import { getWikipediaForCountry } from "../services/wikipedia.service.js";

/** Country profile for AI explorer — images + Wikipedia, no news. */
export async function getCountryProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const name = parseCountryName(req.params.name);

    const country = await getCountryByName(name);
    const withImages = await enrichCountryWithImages(country);
    const withVideos = await enrichCountryWithVideos(withImages);
    const withAi = await enrichCountryWithAi(withVideos);
    const [wikipedia, landmarks] = await Promise.all([
      getWikipediaForCountry(withAi.name),
      getLandmarksForCountry(withAi.name, withAi.images ?? [], {
        cca2: withAi.cca2,
        countryName: withAi.name,
        capital: withAi.capital,
        latlng: withAi.latlng,
        area: withAi.area,
      }),
    ]);

    res.json({
      data: {
        country: withAi,
        wikipedia,
        landmarks,
      },
    });
  } catch (error) {
    next(error);
  }
}
