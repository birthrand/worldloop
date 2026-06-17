import type { NextFunction, Request, Response } from "express";

import {
  parseCountryName,
  parseOptionalDisplayWidth,
  parseOptionalSearchQuery,
  parseRequiredSearchQuery,
} from "../lib/validation.js";
import {
  enrichCountryWithAi,
  getAiForLandmark,
} from "../services/ai.service.js";
import { getCountryByName } from "../services/country.service.js";
import { enrichCountryWithImages } from "../services/image.service.js";
import { getLandmarksForCountry } from "../services/landmarks.service.js";
import { enrichCountryWithVideos } from "../services/video.service.js";
import {
  getWikipediaForCountry,
  getWikipediaForLandmark,
} from "../services/wikipedia.service.js";

/** Country profile for AI explorer — images + Wikipedia, no news. */
export async function getCountryProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const name = parseCountryName(req.params.name);

    const displayWidthPx = parseOptionalDisplayWidth(req.query.displayWidth);
    const country = await getCountryByName(name);
    const withImages = await enrichCountryWithImages(country, {
      displayWidthPx,
    });
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

/** Wikipedia first paragraph for a landmark — used by the detail modal only. */
export async function getLandmarkWikipedia(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const countryName = parseCountryName(req.params.name);
    const landmarkName = parseRequiredSearchQuery(
      req.query.landmark,
      "landmark",
    );

    const wikipedia = await getWikipediaForLandmark(landmarkName, countryName);

    res.json({ data: wikipedia });
  } catch (error) {
    next(error);
  }
}

/** AI fun fact + inferred city for a landmark — used by the detail modal only. */
export async function getLandmarkAi(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const countryName = parseCountryName(req.params.name);
    const landmarkName = parseRequiredSearchQuery(
      req.query.landmark,
      "landmark",
    );
    const type = parseOptionalSearchQuery(req.query.type);
    const description = parseOptionalSearchQuery(req.query.description);
    const knownCity = parseOptionalSearchQuery(req.query.city);

    const latitudeRaw = parseOptionalSearchQuery(req.query.lat);
    const longitudeRaw = parseOptionalSearchQuery(req.query.lng);
    const latitude =
      latitudeRaw !== undefined ? Number.parseFloat(latitudeRaw) : null;
    const longitude =
      longitudeRaw !== undefined ? Number.parseFloat(longitudeRaw) : null;

    const ai = await getAiForLandmark({
      landmarkName,
      countryName,
      type,
      description,
      knownCity,
      latitude:
        latitude !== null && Number.isFinite(latitude) ? latitude : null,
      longitude:
        longitude !== null && Number.isFinite(longitude) ? longitude : null,
    });

    res.json({ data: ai });
  } catch (error) {
    next(error);
  }
}
