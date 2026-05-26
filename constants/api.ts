/**
 * Public backend base URL for the Expo app.
 * Set EXPO_PUBLIC_API_URL in `.env` (see `.env.example`).
 * On a physical device, use your machine's LAN IP instead of localhost.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";
