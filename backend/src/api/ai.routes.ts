import { Router } from "express";

import { generateAiContent } from "../controllers/ai.controller.js";

export const aiRouter = Router();

aiRouter.post("/generate", generateAiContent);
