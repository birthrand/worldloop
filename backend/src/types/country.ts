/** Full country shape (images + ai added in later prompts). */
export type Country = {
  name: string;
  capital: string;
  region: string;
  population: number;
  flag: string;
  latlng: [number, number];
  images?: string[];
  ai?: {
    fact: string;
    caption: string;
    narration: string;
  };
};

/** Basic metadata returned by Feature 1 endpoints. */
export type CountryBasic = Pick<
  Country,
  "name" | "capital" | "region" | "population" | "flag" | "latlng"
>;
