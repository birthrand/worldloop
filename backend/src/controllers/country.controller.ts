import type { Request, Response, NextFunction } from "express";

import { HttpError } from "../lib/http.js";
import { enrichCountryWithAi } from "../services/ai.service.js";
import { getCountryByName } from "../services/country.service.js";
import { enrichCountryWithImages } from "../services/image.service.js";

export async function getCountry(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const raw = req.params.name;
    const name = Array.isArray(raw) ? raw[0] : raw;
    if (!name?.trim()) {
      throw new HttpError("Country name is required", 400, "INVALID_NAME");
    }

    const country = await getCountryByName(name.trim());
    const withImages = await enrichCountryWithImages(country);
    const withAi = await enrichCountryWithAi(withImages);
    res.json({ data: withAi });
  } catch (error) {
    next(error);
  }
}
