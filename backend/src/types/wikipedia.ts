export type CountryWikipediaSummary = {
  title: string;
  extract: string;
  description: string | null;
  pageUrl: string;
  thumbnailUrl: string | null;
};

/** First-paragraph Wikipedia copy for landmark detail modal only. */
export type LandmarkWikipediaSummary = {
  title: string;
  extract: string;
  pageUrl: string;
};
