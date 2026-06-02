import cors from "cors";
import express from "express";

import { aiRouter } from "./api/ai.routes.js";
import { countryRouter } from "./api/country.routes.js";
import { discoverRouter } from "./api/discover.routes.js";
import { feedRouter } from "./api/feed.routes.js";
import { healthRouter } from "./api/health.routes.js";
import { mapRouter } from "./api/map.routes.js";
import { searchRouter } from "./api/search.routes.js";
import { env } from "./config/env.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";
import { connectCache, disconnectCache } from "./services/cache.service.js";
import { logger } from "./utils/logger.js";

const app = express();

app.use(cors());
app.use(express.json());

logger.info("ENV CHECK", {
  nodeEnv: env.nodeEnv,
});

app.use("/health", healthRouter);
app.use("/country", countryRouter);
app.use("/feed", feedRouter);
app.use("/search", searchRouter);
app.use("/map", mapRouter);
app.use("/discover", discoverRouter);
app.use("/ai", aiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  await connectCache();

  const server = app.listen(env.port, () => {
    logger.info("WorldLoop backend listening", { port: env.port });
  });

  const shutdown = async () => {
    logger.info("Shutting down");
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await disconnectCache();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error) => {
  logger.error("Failed to start server", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
