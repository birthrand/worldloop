/** Deterministic demo weather for map place chrome (no API yet). */
export function mapPlaceWeatherSummary(latlng: [number, number]): {
  tempC: number;
  condition: string;
} {
  const [lat] = latlng;
  const tempC = Math.round(32 - Math.abs(lat) * 0.42);
  const conditions = ["Clear", "Partly cloudy", "Cloudy"] as const;
  const index =
    Math.abs(Math.floor(lat * 11 + latlng[1] * 3)) % conditions.length;
  return { tempC, condition: conditions[index] };
}
