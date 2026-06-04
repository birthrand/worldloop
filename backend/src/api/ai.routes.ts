import { Router } from "express";

import { generateAiContent } from "../controllers/ai.controller.js";
import { aiGenerateRateLimiter } from "../middleware/rate-limit.middleware.js";

export const aiRouter = Router();

aiRouter.post("/generate", aiGenerateRateLimiter, generateAiContent);
