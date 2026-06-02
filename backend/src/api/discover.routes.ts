import { Router } from "express";

import { discoverCountriesHandler } from "../controllers/discover.controller.js";

export const discoverRouter = Router();

discoverRouter.get("/", discoverCountriesHandler);
