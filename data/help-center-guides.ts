export type HelpCenterGuide = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
};

export const HELP_CENTER_GUIDES: HelpCenterGuide[] = [
  {
    id: "explore-swipe-feed",
    title: "Explore the swipe feed",
    summary:
      "Discover countries TikTok-style with vertical and horizontal swipes.",
    steps: [
      "Open the Explore tab from the bottom navigation bar.",
      "Swipe up or down to move to the next or previous country.",
      "Swipe left or right on a country card to browse its photo and media carousel.",
      "Tap the country name or card actions to open the full country profile with AI facts and landmarks.",
      "Use the search icon in the header to jump to a specific country by name or region.",
    ],
  },
  {
    id: "world-map",
    title: "Navigate the world map",
    summary:
      "Find countries visually and jump from the map into rich country details.",
    steps: [
      "Open the Map tab to see the interactive flat world map.",
      "Pinch to zoom and drag to pan across regions.",
      "Tap a country marker to open a preview card with flag, name, and quick actions.",
      "From the preview, open the full country profile or focus the map on that country.",
      "When landmarks are available, tap a pin to preview it and open its detail sheet.",
    ],
  },
  {
    id: "save-places",
    title: "Save places for later",
    summary: "Bookmark countries and landmarks you want to revisit.",
    steps: [
      "While exploring, tap the bookmark icon on a country or landmark card.",
      "Open the Saved tab to see everything you've bookmarked.",
      "Switch between Countries and Landmarks using the tabs at the top of Saved.",
      "Tap a saved item to open its profile or jump to it on the map.",
      "Use the list or grid toggle on Saved countries to change how your collection is displayed.",
    ],
  },
  {
    id: "visited-countries",
    title: "Track visited countries",
    summary: "Mark where you've been and see it reflected on your profile.",
    steps: [
      "From a country profile or preview card, mark the country as visited when you've been there.",
      "Open Profile → Visited countries to review your travel list.",
      "Visited countries can appear on your travel map depending on legend settings.",
      "Remove a country from Visited anytime if you marked it by mistake.",
      "Pair Visited with Saved — Saved is for wishlist items, Visited is for places you've actually been.",
    ],
  },
  {
    id: "landmarks",
    title: "Browse country landmarks",
    summary:
      "Go deeper inside a country with monuments, parks, and cultural sites.",
    steps: [
      "Open any country profile from Explore, Map, or Saved.",
      "Scroll to the Landmarks section to see top places ranked for that country.",
      "Tap a landmark card to open its detail modal with photos and AI-generated facts.",
      "Use View on map from a landmark to see exactly where it sits inside the country.",
      "Save individual landmarks from their card or detail view to find them quickly later.",
    ],
  },
];
