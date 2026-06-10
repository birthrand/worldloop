import { Router } from "express";

import {
  getCultureFeedCountriesHandler,
  getFeedCountriesHandler,
} from "../controllers/feed.controller.js";

export const feedRouter = Router();

feedRouter.get("/countries", getFeedCountriesHandler);
feedRouter.get("/culture/countries", getCultureFeedCountriesHandler);
