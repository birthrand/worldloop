export type OnboardingSlideVariant = "hero";

export type OnboardingHeadlineSegment = {
  text: string;
  accent?: boolean;
};

export type OnboardingHeadlineLine = {
  segments: OnboardingHeadlineSegment[];
};

export type OnboardingSlideData = {
  id: string;
  variant: OnboardingSlideVariant;
  headlineLines: OnboardingHeadlineLine[];
  subheadline: string;
  ctaLabel: string;
  secondaryCta: string;
};

export const ONBOARDING_SLIDES: OnboardingSlideData[] = [
  {
    id: "discover-countries",
    variant: "hero",
    headlineLines: [
      { segments: [{ text: "Discover" }] },
      { segments: [{ text: "Countries", accent: true }] },
    ],
    subheadline: "Explore culture, landmarks, and history in one app",
    ctaLabel: "Get Started",
    secondaryCta: "",
  },
];

/** @deprecated Use ONBOARDING_SLIDES[0] */
export type OnboardingHeroSlideData = OnboardingSlideData;

/** @deprecated Use ONBOARDING_SLIDES[0] */
export const ONBOARDING_HERO_SLIDE = ONBOARDING_SLIDES[0];
