import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";
import { HttpError } from "../lib/http.js";
import { parseCountryName } from "../lib/validation.js";
import { getAiForCountry } from "../services/ai.service.js";
import { getCountryByName } from "../services/country.service.js";

type AiGenerateBody = {
  countryName?: string;
  country?: {
    name?: string;
    capital?: string;
    region?: string;
    population?: number;
  };
};

function requireInternalApiKey(req: Request): void {
  const provided = req.header("x-internal-api-key");
  if (!env.internalApiKey || !provided || provided !== env.internalApiKey) {
    throw new HttpError("Unauthorized", 401, "UNAUTHORIZED");
  }
}

export async function generateAiContent(
  req: Request<Record<string, string>, unknown, AiGenerateBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    requireInternalApiKey(req);

    const nameFromBody = req.body?.countryName?.trim();
    const metadata = req.body?.country;
    const metadataName = metadata?.name?.trim();
    const countryName = nameFromBody || metadataName;

    if (!countryName) {
      throw new HttpError(
        "countryName or country.name is required",
        400,
        "INVALID_AI_INPUT",
      );
    }

    parseCountryName(countryName);

    const country =
      metadataName && metadata
        ? {
            name: metadataName,
            capital: metadata.capital ?? "N/A",
            region: metadata.region ?? "Unknown",
            population: metadata.population ?? 0,
          }
        : await getCountryByName(countryName);

    const ai = await getAiForCountry({
      name: country.name,
      capital: country.capital,
      region: country.region,
      population: country.population,
    });

    res.json({ data: ai });
  } catch (error) {
    next(error);
  }
}
