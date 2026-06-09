import type { NextFunction, Request, Response } from "express";

import { parseCountryName } from "../lib/validation.js";
import { enrichCountryWithAi } from "../services/ai.service.js";
import { getCountryByName } from "../services/country.service.js";
import { enrichCountryWithImages } from "../services/image.service.js";
import { enrichCountryWithVideos } from "../services/video.service.js";

export async function getCountry(
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
    res.json({ data: withAi });
  } catch (error) {
    next(error);
  }
}
