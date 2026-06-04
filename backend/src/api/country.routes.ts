import { Router } from "express";

import { getCountry } from "../controllers/country.controller.js";
import { getCountryExplorer } from "../controllers/explorer.controller.js";
import { getCountryProfile } from "../controllers/profile.controller.js";

export const countryRouter = Router();

countryRouter.get("/:name/explorer", getCountryExplorer);
countryRouter.get("/:name/profile", getCountryProfile);
countryRouter.get("/:name", getCountry);
