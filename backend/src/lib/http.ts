import { logger } from "../utils/logger.js";

export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export async function fetchJson<T>(url: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url);
  } catch (error) {
    logger.error("External API request failed", {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new HttpError("Failed to reach external data service", 502);
  }

  if (response.status === 404) {
    throw new HttpError("Resource not found", 404, "NOT_FOUND");
  }

  if (!response.ok) {
    logger.error("External API returned error", {
      url,
      status: response.status,
    });
    throw new HttpError("External data service error", 502);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new HttpError("Invalid response from external data service", 502);
  }
}
