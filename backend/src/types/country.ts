/** Full country shape (images + ai added in later prompts). */
export type Country = {
  name: string;
  capital: string;
  region: string;
  population: number;
  /** ISO 3166-1 alpha-2 (e.g. AF for Afghanistan). */
  cca2: string;
  /** Always https://flagcdn.com/w320/{cca2}.png — not Wikimedia. */
  flag: string;
  latlng: [number, number];
  images?: string[];
  ai?: {
    /** Primary fact (same as `facts[0]`). */
    fact: string;
    /** One fact per carousel image (up to 5). */
    facts: string[];
    caption: string;
    narration: string;
  };
};

/** Basic metadata returned by Feature 1 endpoints. */
export type CountryBasic = Pick<
  Country,
  "name" | "capital" | "region" | "population" | "cca2" | "flag" | "latlng"
>;
