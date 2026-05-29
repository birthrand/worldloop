import type { MapCountry } from "@/types/country";
export type MapClusterActivity = "rising" | "quiet";

export function getClusterActivity(
  clusterCountries: MapCountry[],
  globalCountries: MapCountry[],
): MapClusterActivity {
  if (clusterCountries.length === 0) return "quiet";

  // Rising: cluster contains any country in the global top 20% by population.
  const sorted = [...globalCountries].sort(
    (a, b) => b.population - a.population,
  );
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.2));
  const topNames = new Set(sorted.slice(0, topCount).map((c) => c.name));

  return clusterCountries.some((c) => topNames.has(c.name))
    ? "rising"
    : "quiet";
}

export function getActivityVisual(activity: MapClusterActivity) {
  switch (activity) {
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
