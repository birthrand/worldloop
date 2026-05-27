/** Lightweight country shape for the interactive map screen. */
export type MapCountry = {
  name: string;
  capital: string;
  region: string;
  population: number;
  flag: string;
  latlng: [number, number];
  /** First image URL only — null when none cached yet. */
  image: string | null;
};

export type MapCountriesResponse = {
  data: MapCountry[];
};
