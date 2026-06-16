/** Direct MP4 (or HLS) URL from backend — never a page link. */
export type CountryVideo = {
  url: string;
  poster?: string;
  provider?: string;
  duration?: number;
};

/** Lightweight country shape from GET /map/countries. */
export type MapCountry = {
  name: string;
  capital: string;
  region: string;
  population: number;
  flag: string;
  latlng: [number, number];
  image: string | null;
  /** Total area in km² — optional; used for adaptive country-focus zoom. */
  area?: number;
  /** Official language names — optional on older cached map payloads. */
  languages?: string[];
};

/** Country shape aligned with the backend feed API. */
export type Country = {
  name: string;
  capital: string;
  region: string;
  population: number;
  /** ISO 3166-1 alpha-2 (e.g. AF for Afghanistan). */
  cca2: string;
  /** Always https://flagcdn.com/w320/{cca2}.png */
  flag: string;
  latlng: [number, number];
  subregion?: string;
  area?: number;
  landlocked?: boolean;
  timezones?: string[];
  /** Official language names (REST Countries). */
  languages?: string[];
  images?: string[];
  videos?: CountryVideo[];
  ai?: {
    /** Primary fact (same as `facts[0]`). */
    fact: string;
    /** One fact per carousel image (up to 5). */
    facts: string[];
    caption: string;
    narration: string;
  };
};
