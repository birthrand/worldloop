import type { MapCountry } from "@/types/country";

import { TRENDING_COUNTRY_NAMES } from "@/constants/trending-countries";

export type MapClusterActivity = "trending" | "rising" | "quiet";

export function getClusterActivity(countries: MapCountry[]): MapClusterActivity {
  if (countries.some((c) => TRENDING_COUNTRY_NAMES.has(c.name))) {
    return "trending";
  }

  // Rising: cluster contains any country in the top 20% by population (within cluster).
  const sorted = [...countries].sort((a, b) => b.population - a.population);
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.2));
  const topNames = new Set(sorted.slice(0, topCount).map((c) => c.name));

  if (countries.some((c) => topNames.has(c.name))) {
    return "rising";
  }

  return "quiet";
}

export function getActivityVisual(activity: MapClusterActivity) {
  switch (activity) {
    case "trending":
      return {
        borderColor: "rgba(239,68,68,0.75)",
        bgColor: "rgba(239,68,68,0.16)",
        textColor: "#fb7185",
        ringColor: "rgba(239,68,68,0.9)",
        icon: "flame" as const,
      };
    case "rising":
      return {
        borderColor: "rgba(251,191,36,0.8)",
        bgColor: "rgba(251,191,36,0.14)",
        textColor: "#fbbf24",
        ringColor: "rgba(251,191,36,0.95)",
        icon: "sparkles" as const,
      };
    case "quiet":
    default:
      return {
        borderColor: "rgba(255,255,255,0.28)",
        bgColor: "rgba(255,255,255,0.06)",
        textColor: "#94a3b8",
        ringColor: "rgba(148,163,184,0.25)",
        icon: "globe-outline" as const,
      };
  }
}

