import "dotenv/config";

export const env = {
  port: (() => {
    const parsed = Number(process.env.PORT);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 3001;
  })(),
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  restCountriesBaseUrl:
    process.env.REST_COUNTRIES_BASE_URL ??
    "https://api.restcountries.com/countries/v5",
  restCountriesApiKey: process.env.REST_COUNTRIES_API_KEY ?? "",
  unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY ?? "",
  pexelsApiKey: process.env.PEXELS_API_KEY ?? "",
  pixabayApiKey: process.env.PIXABAY_API_KEY ?? "",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiBaseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  internalApiKey: process.env.INTERNAL_API_KEY ?? "",
  gnewsApiKey: process.env.GNEWS_API_KEY ?? "",
  currentsApiKey: process.env.CURRENTS_API_KEY ?? "",
  nodeEnv: process.env.NODE_ENV ?? "development",
} as const;
