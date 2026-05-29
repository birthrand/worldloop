import { resolveApiBaseUrl } from "@/lib/resolve-api-base-url";

/**
 * Public backend base URL for the Expo app.
 *
 * In dev, this follows Metro's host (see `lib/resolve-api-base-url.ts`).
 * Override with `EXPO_PUBLIC_API_URL` for tunnels or production builds.
 */
export const API_BASE_URL = resolveApiBaseUrl();
