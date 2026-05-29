import Constants from "expo-constants";
import { Platform } from "react-native";

const DEFAULT_API_PORT = "3002";
const DEFAULT_PRODUCTION_API_URL = "http://localhost:3001";

function parseHostFromUri(uri: string | undefined | null): string | null {
  if (!uri) return null;

  const withoutScheme = uri
    .replace(/^exp(?:\+[\w-]+)?:\/\//, "")
    .replace(/^https?:\/\//, "");

  const host = withoutScheme.split(":")[0]?.trim();
  return host || null;
}

/** Same machine IP Metro uses — works on a phone over Wi‑Fi without hardcoding .env. */
function resolveDevApiHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.experienceUrl ??
    Constants.linkingUri;

  const host = parseHostFromUri(hostUri);
  if (!host) return null;

  if (
    Platform.OS === "android" &&
    (host === "localhost" || host === "127.0.0.1")
  ) {
    return "10.0.2.2";
  }

  return host;
}

/**
 * Resolves the backend base URL.
 *
 * - **Dev (default):** uses Metro's host + `EXPO_PUBLIC_API_PORT` (no LAN IP in `.env`).
 * - **Dev override:** set `EXPO_PUBLIC_API_URL` (e.g. ngrok or a deployed API).
 * - **Production:** set `EXPO_PUBLIC_API_URL` in EAS / CI.
 */
export function resolveApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    const url = envUrl.replace(/\/$/, "");
    if (__DEV__) {
      console.log("[API] Using EXPO_PUBLIC_API_URL:", url);
    }
    return url;
  }

  if (__DEV__) {
    const hostUri =
      Constants.expoConfig?.hostUri ??
      Constants.experienceUrl ??
      Constants.linkingUri;
    const host = resolveDevApiHost();
    if (host) {
      const port = process.env.EXPO_PUBLIC_API_PORT?.trim() || DEFAULT_API_PORT;
      const url = `http://${host}:${port}`;
      console.log("[API] Metro hostUri:", hostUri);
      console.log("[API] Resolved from Metro host:", url);
      return url;
    }
  }

  if (__DEV__) {
    console.log("[API] Using fallback URL:", DEFAULT_PRODUCTION_API_URL);
  }

  return DEFAULT_PRODUCTION_API_URL;
}
