import { Router } from "express";

import { getFeedCountriesHandler } from "../controllers/feed.controller.js";

export const feedRouter = Router();

feedRouter.get("/countries", getFeedCountriesHandler);
