import type { NextFunction, Request, Response } from "express";

import { getMapCountries } from "../services/map.service.js";

export async function getMapCountriesHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await getMapCountries();
    res.json(result);
  } catch (error) {
    next(error);
  }
}
