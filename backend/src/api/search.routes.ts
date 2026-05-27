import { Router } from "express";

import { searchCountriesHandler } from "../controllers/search.controller.js";

export const searchRouter = Router();

searchRouter.get("/", searchCountriesHandler);
