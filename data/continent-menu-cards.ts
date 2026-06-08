import type { Continent } from "@/constants/regions";

export type ContinentMenuCard = {
  region: Continent;
  snippet: string;
  imageUri: string;
};

/** Gamified picker tiles — evocative snippet + hero image per continent. */
export const CONTINENT_MENU_CARDS: ContinentMenuCard[] = [
  {
    region: "Africa",
    snippet: "Safari skies & ancient wonders",
    imageUri:
      "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=600&q=80",
  },
  {
    region: "North America",
    snippet: "Canyons, coasts & city lights",
    imageUri:
      "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=600&q=80",
  },
  {
    region: "South America",
    snippet: "Rainforests & Andean peaks",
    imageUri:
      "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=600&q=80",
  },
  {
    region: "Antarctic",
    snippet: "Ice frontiers at the edge",
    imageUri:
      "https://images.unsplash.com/photo-1582501929835-c004cf990e10?w=600&q=80",
  },
  {
    region: "Asia",
    snippet: "Temples, neon & spice routes",
    imageUri:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80",
  },
  {
    region: "Europe",
    snippet: "Castles, cobblestones & coasts",
    imageUri:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80",
  },
  {
    region: "Oceania",
    snippet: "Reefs, islands & dream beaches",
    imageUri:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
  },
];

export const WORLD_MENU_CARD = {
  snippet: "Spin the globe & discover everywhere",
  imageUri:
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80",
} as const;
