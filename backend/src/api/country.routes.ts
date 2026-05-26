import { Router } from "express";

import { getCountry } from "../controllers/country.controller.js";

export const countryRouter = Router();

countryRouter.get("/:name", getCountry);
