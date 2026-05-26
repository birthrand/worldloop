import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 3001),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  restCountriesBaseUrl:
    process.env.REST_COUNTRIES_BASE_URL ?? "https://restcountries.com/v3.1",
  unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY ?? "",
  pexelsApiKey: process.env.PEXELS_API_KEY ?? "",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiBaseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  internalApiKey: process.env.INTERNAL_API_KEY ?? "",
  nodeEnv: process.env.NODE_ENV ?? "development",
} as const;
