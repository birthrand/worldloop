import { Router } from "express";

import { getMapCountriesHandler } from "../controllers/map.controller.js";

export const mapRouter = Router();

mapRouter.get("/countries", getMapCountriesHandler);
