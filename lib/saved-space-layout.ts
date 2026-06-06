import type { SavedCategory } from "@/store/use-saved-countries-store";
import type { Country } from "@/types/country";

export type PlanetPalette = {
  core: string;
  band: string;
  glow: string;
  ring: string;
};

export type PlanetLayoutSlot = {
  offsetX: number;
  offsetY: number;
  size: number;
  ring?: boolean;
};

const BASE_SPREAD_X = 0.54;
const BASE_SPREAD_Y = 0.5;
const MIN_NODE_GAP = 16;
const TOP_EDGE_PADDING = 24;
const BOTTOM_EDGE_PADDING = 56;
const HORIZONTAL_EDGE_PADDING = 40;
const LABEL_STACK_HEIGHT = 36;
const MAX_SPREAD_SCALE = 3.2;
const MIN_WIDTH_OVERFLOW_RATIO = 1.06;
const PLANET_SIZES = [88, 94, 100, 106, 112, 118, 124];
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Legend swatch colors — keep in sync with `SavedSpaceLegend`. */
export const SAVED_LEGEND_COLORS = {
  favorites: "#f4a261",
  wantToVisit: "#7b9cff",
  recentlySaved: "#f472b6",
} as const;

export const RECENTLY_SAVED_LIMIT = 1;

const CATEGORY_PALETTES: Record<SavedCategory, PlanetPalette> = {
  favorites: {
    core: "#e8784a",
    band: "#f4a261",
    glow: "rgba(232, 120, 74, 0.45)",
    ring: SAVED_LEGEND_COLORS.favorites,
  },
  "want-to-visit": {
    core: "#2dd4bf",
    band: "#5eead4",
    glow: "rgba(45, 212, 191, 0.4)",
    ring: SAVED_LEGEND_COLORS.wantToVisit,
  },
};

const NEUTRAL_SAVED_SURFACE: Pick<
  PlanetPalette,
  "glow" | "ring" | "core" | "band"
> = {
  glow: "transparent",
  ring: "transparent",
  core: "#121a2c",
  band: "#121a2c",
};

const RECENTLY_SAVED_PALETTE: Pick<PlanetPalette, "glow" | "ring"> = {
  glow: "rgba(244, 114, 182, 0.42)",
  ring: SAVED_LEGEND_COLORS.recentlySaved,
};

const DEFAULT_PALETTE: PlanetPalette = {
  core: "#7b61ff",
  band: "#a78bfa",
  glow: "rgba(123, 97, 255, 0.4)",
  ring: SAVED_LEGEND_COLORS.recentlySaved,
};

export type SavedPlanetNode = {
  country: Country;
  slot: PlanetLayoutSlot;
  palette: PlanetPalette;
  category: SavedCategory;
  anchor: PlanetAnchor;
  center: PlanetCenter;
};

export type PlanetAnchor = {
  left: number;
  top: number;
};

export type PlanetCenter = {
  x: number;
  y: number;
};

export type NodeBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ResolvedMapLayout = {
  canvasWidth: number;
  canvasHeight: number;
  initialScrollX: number;
  initialScrollY: number;
  connectionPairs: [number, number][];
  planets: SavedPlanetNode[];
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function buildLayoutSeed(countries: Country[]): number {
  const names = countries
    .map((country) => country.name)
    .sort()
    .join("|");
  return hashString(names);
}

function pickPlanetSize(index: number, rng: () => number): number {
  const roll = rng();
  const sizeIndex =
    (index * 5 + Math.floor(roll * PLANET_SIZES.length)) % PLANET_SIZES.length;
  return PLANET_SIZES[sizeIndex];
}

/**
 * Organic scatter — golden-angle spiral with jitter, occasional outliers,
 * and a few off-axis drifts so the map feels hand-placed rather than gridded.
 */
export function generateCreativeSlots(
  countries: Country[],
): PlanetLayoutSlot[] {
  const count = countries.length;
  const rng = createSeededRng(buildLayoutSeed(countries));

  if (count === 1) {
    return [
      {
        offsetX: (rng() - 0.5) * 0.08,
        offsetY: (rng() - 0.5) * 0.1,
        size: pickPlanetSize(0, rng),
      },
    ];
  }

  return countries.map((_, index) => {
    const progress = (index + 0.62) / count;
    const spiralRadius = Math.sqrt(progress) * (0.72 + rng() * 0.16);
    const angle = index * GOLDEN_ANGLE + (rng() - 0.5) * 1.15;
    const isOutlier = rng() > 0.78;
    const radius = Math.min(
      spiralRadius + (isOutlier ? 0.14 + rng() * 0.12 : 0),
      0.98,
    );

    const offsetX =
      Math.cos(angle) * radius * (0.92 + rng() * 0.18) +
      (rng() > 0.7 ? (rng() - 0.5) * 0.22 : 0);
    const offsetY =
      Math.sin(angle) * radius * (0.86 + rng() * 0.2) +
      (rng() > 0.74 ? (rng() - 0.5) * 0.18 : 0);

    return {
      offsetX: Math.max(-0.98, Math.min(0.98, offsetX)),
      offsetY: Math.max(-0.92, Math.min(0.92, offsetY)),
      size: pickPlanetSize(index, rng),
    };
  });
}

export function getRecentlySavedNames(
  countries: Country[],
  savedAtByName: Record<string, number>,
  limit = RECENTLY_SAVED_LIMIT,
): Set<string> {
  return new Set(
    [...countries]
      .sort(
        (a, b) => (savedAtByName[b.name] ?? 0) - (savedAtByName[a.name] ?? 0),
      )
      .slice(0, limit)
      .map((country) => country.name),
  );
}

export function getPlanetPalette(
  category?: SavedCategory,
  isRecentlySaved = false,
): PlanetPalette {
  const base = category ? CATEGORY_PALETTES[category] : DEFAULT_PALETTE;

  if (isRecentlySaved) {
    return {
      ...base,
      ...RECENTLY_SAVED_PALETTE,
    };
  }

  return {
    ...base,
    ...NEUTRAL_SAVED_SURFACE,
  };
}

export function getSphereStageHeight(size: number): number {
  const glowSize = size + 10;
  const glowBleed = Math.ceil((glowSize - size) / 2) + 8;
  return size + glowBleed * 2;
}

export function getGlowBleed(size: number): number {
  const glowSize = size + 10;
  return Math.ceil((glowSize - size) / 2) + 8;
}

export function getNodeFootprint(size: number): {
  width: number;
  height: number;
} {
  const glowBleed = getGlowBleed(size);
  return {
    width: Math.max(size, 108) + glowBleed * 2,
    height: getSphereStageHeight(size) + LABEL_STACK_HEIGHT,
  };
}

function scaleSlots(
  slots: PlanetLayoutSlot[],
  spreadScale: number,
): PlanetLayoutSlot[] {
  return slots.map((slot) => ({
    ...slot,
    offsetX: slot.offsetX * spreadScale,
    offsetY: slot.offsetY * spreadScale,
  }));
}

export function resolvePlanetCenter(
  slot: PlanetLayoutSlot,
  mapWidth: number,
  mapHeight: number,
): PlanetCenter {
  return {
    x: mapWidth / 2 + slot.offsetX * mapWidth * BASE_SPREAD_X,
    y: mapHeight / 2 + slot.offsetY * mapHeight * BASE_SPREAD_Y,
  };
}

export function resolvePlanetAnchor(
  slot: PlanetLayoutSlot,
  mapWidth: number,
  mapHeight: number,
): PlanetAnchor {
  const center = resolvePlanetCenter(slot, mapWidth, mapHeight);
  const stageHeight = getSphereStageHeight(slot.size);
  const footprint = getNodeFootprint(slot.size);

  return {
    left: center.x - footprint.width / 2,
    top: center.y - stageHeight / 2,
  };
}

function getNodeBounds(
  anchor: PlanetAnchor,
  slot: PlanetLayoutSlot,
): NodeBounds {
  const footprint = getNodeFootprint(slot.size);
  return {
    left: anchor.left,
    top: anchor.top,
    width: footprint.width,
    height: footprint.height,
  };
}

function boundsOverlap(a: NodeBounds, b: NodeBounds, gap: number): boolean {
  return !(
    a.left + a.width + gap <= b.left ||
    b.left + b.width + gap <= a.left ||
    a.top + a.height + gap <= b.top ||
    b.top + b.height + gap <= a.top
  );
}

function hasOverlappingNodes(
  anchors: PlanetAnchor[],
  slots: PlanetLayoutSlot[],
): boolean {
  for (let i = 0; i < anchors.length; i += 1) {
    for (let j = i + 1; j < anchors.length; j += 1) {
      const a = getNodeBounds(anchors[i], slots[i]);
      const b = getNodeBounds(anchors[j], slots[j]);
      if (boundsOverlap(a, b, MIN_NODE_GAP)) {
        return true;
      }
    }
  }
  return false;
}

function resolveSpreadScale(
  slots: PlanetLayoutSlot[],
  viewportWidth: number,
  viewportHeight: number,
): number {
  let scale = 1;

  for (let attempt = 0; attempt < 28; attempt += 1) {
    const scaledSlots = scaleSlots(slots, scale);
    const anchors = scaledSlots.map((slot) =>
      resolvePlanetAnchor(slot, viewportWidth, viewportHeight),
    );

    if (!hasOverlappingNodes(anchors, scaledSlots)) {
      return scale;
    }

    scale = Math.min(scale * 1.05, MAX_SPREAD_SCALE);
  }

  return MAX_SPREAD_SCALE;
}

function resolveSpreadScaleWithOverflow(
  slots: PlanetLayoutSlot[],
  viewportWidth: number,
  viewportHeight: number,
): number {
  let scale = resolveSpreadScale(slots, viewportWidth, viewportHeight);

  if (slots.length <= 2) {
    return scale;
  }

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const scaledSlots = scaleSlots(slots, scale);
    const anchors = scaledSlots.map((slot) =>
      resolvePlanetAnchor(slot, viewportWidth, viewportHeight),
    );
    const union = getBoundsUnion(anchors, scaledSlots);

    if (union.width >= viewportWidth * MIN_WIDTH_OVERFLOW_RATIO) {
      return scale;
    }

    scale = Math.min(scale * 1.05, MAX_SPREAD_SCALE);
  }

  return scale;
}

function shiftAnchors(
  anchors: PlanetAnchor[],
  offsetX: number,
  offsetY: number,
): PlanetAnchor[] {
  return anchors.map((anchor) => ({
    left: anchor.left + offsetX,
    top: anchor.top + offsetY,
  }));
}

function getBoundsUnion(
  anchors: PlanetAnchor[],
  slots: PlanetLayoutSlot[],
): NodeBounds {
  const rects = anchors.map((anchor, index) =>
    getNodeBounds(anchor, slots[index]),
  );

  const minLeft = Math.min(...rects.map((rect) => rect.left));
  const minTop = Math.min(...rects.map((rect) => rect.top));
  const maxRight = Math.max(...rects.map((rect) => rect.left + rect.width));
  const maxBottom = Math.max(...rects.map((rect) => rect.top + rect.height));

  return {
    left: minLeft,
    top: minTop,
    width: maxRight - minLeft,
    height: maxBottom - minTop,
  };
}

function swapPlanetPositions(
  left: SavedPlanetNode,
  right: SavedPlanetNode,
): void {
  const tempSlot = left.slot;
  const tempAnchor = left.anchor;
  const tempCenter = left.center;

  left.slot = right.slot;
  left.anchor = right.anchor;
  left.center = right.center;

  right.slot = tempSlot;
  right.anchor = tempAnchor;
  right.center = tempCenter;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function computeInitialScrollToRecent(
  planets: SavedPlanetNode[],
  recentlySavedNames: Set<string>,
  canvasWidth: number,
  canvasHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): { initialScrollX: number; initialScrollY: number } {
  const maxScrollX = Math.max(0, canvasWidth - viewportWidth);
  const maxScrollY = Math.max(0, canvasHeight - viewportHeight);

  const recentPlanet = planets.find((planet) =>
    recentlySavedNames.has(planet.country.name),
  );

  if (!recentPlanet) {
    return {
      initialScrollX: Math.round(maxScrollX / 2),
      initialScrollY: Math.round(maxScrollY / 2),
    };
  }

  return {
    initialScrollX: Math.round(
      clamp(recentPlanet.center.x - viewportWidth / 2, 0, maxScrollX),
    ),
    initialScrollY: Math.round(
      clamp(recentPlanet.center.y - viewportHeight / 2, 0, maxScrollY),
    ),
  };
}

function placeRecentlySavedAtTop(
  planets: SavedPlanetNode[],
  recentlySavedNames: Set<string>,
): void {
  const recentIndex = planets.findIndex((planet) =>
    recentlySavedNames.has(planet.country.name),
  );
  if (recentIndex < 0) return;

  let topIndex = 0;
  for (let index = 1; index < planets.length; index += 1) {
    if (planets[index].anchor.top < planets[topIndex].anchor.top) {
      topIndex = index;
    }
  }

  if (recentIndex === topIndex) return;

  swapPlanetPositions(planets[recentIndex], planets[topIndex]);
}

/** Chain each saved country to the next — first saved through last saved. */
export function buildSavedChainConnections(count: number): [number, number][] {
  const pairs: [number, number][] = [];
  if (count <= 1) return pairs;

  for (let index = 0; index < count - 1; index += 1) {
    pairs.push([index, index + 1]);
  }

  return pairs;
}

export function resolveSavedMapLayout(
  countries: Country[],
  categoryByName: Record<string, SavedCategory>,
  savedAtByName: Record<string, number>,
  viewportWidth: number,
  viewportHeight: number,
): ResolvedMapLayout | null {
  if (countries.length === 0 || viewportWidth <= 0 || viewportHeight <= 0) {
    return null;
  }

  const baseSlots = generateCreativeSlots(countries);
  const spreadScale = resolveSpreadScaleWithOverflow(
    baseSlots,
    viewportWidth,
    viewportHeight,
  );
  const slots = scaleSlots(baseSlots, spreadScale);

  const anchors = slots.map((slot) =>
    resolvePlanetAnchor(slot, viewportWidth, viewportHeight),
  );

  const union = getBoundsUnion(anchors, slots);

  const shiftX = (viewportWidth - union.width) / 2 - union.left;
  const shiftY = -union.top;

  const shiftedAnchors = shiftAnchors(anchors, shiftX, shiftY);
  const shiftedUnion = getBoundsUnion(shiftedAnchors, slots);

  const normalizedAnchors = shiftAnchors(
    shiftedAnchors,
    -shiftedUnion.left,
    TOP_EDGE_PADDING - shiftedUnion.top,
  );
  const normalizedUnion = getBoundsUnion(normalizedAnchors, slots);

  const needsHorizontalPan =
    normalizedUnion.width + 2 * HORIZONTAL_EDGE_PADDING > viewportWidth;
  const canvasWidth = needsHorizontalPan
    ? normalizedUnion.width + 2 * HORIZONTAL_EDGE_PADDING
    : viewportWidth;
  const horizontalInset = needsHorizontalPan
    ? HORIZONTAL_EDGE_PADDING
    : (viewportWidth - normalizedUnion.width) / 2;

  const needsVerticalPan =
    normalizedUnion.height + TOP_EDGE_PADDING + BOTTOM_EDGE_PADDING >
    viewportHeight;
  const canvasHeight = needsVerticalPan
    ? normalizedUnion.height + TOP_EDGE_PADDING + BOTTOM_EDGE_PADDING
    : viewportHeight;
  const verticalInset = needsVerticalPan
    ? 0
    : (viewportHeight - normalizedUnion.height) / 2 - normalizedUnion.top;

  const finalAnchors = shiftAnchors(
    normalizedAnchors,
    horizontalInset,
    verticalInset,
  );

  const recentlySavedNames = getRecentlySavedNames(countries, savedAtByName);

  const planets = countries.slice(0, slots.length).map((country, index) => {
    const category = categoryByName[country.name] ?? "favorites";
    const isRecentlySaved = recentlySavedNames.has(country.name);
    const slot = slots[index];
    const anchor = finalAnchors[index];
    const footprint = getNodeFootprint(slot.size);

    return {
      country,
      slot,
      palette: getPlanetPalette(category, isRecentlySaved),
      category,
      anchor,
      center: {
        x: anchor.left + footprint.width / 2,
        y: anchor.top + getSphereStageHeight(slot.size) / 2,
      },
    };
  });

  placeRecentlySavedAtTop(planets, recentlySavedNames);

  const { initialScrollX, initialScrollY } = computeInitialScrollToRecent(
    planets,
    recentlySavedNames,
    canvasWidth,
    canvasHeight,
    viewportWidth,
    viewportHeight,
  );

  return {
    canvasWidth,
    canvasHeight,
    initialScrollX,
    initialScrollY,
    connectionPairs: buildSavedChainConnections(planets.length),
    planets,
  };
}

/** @deprecated Use resolveSavedMapLayout instead. */
export function buildPlanetNodes(
  countries: Country[],
  categoryByName: Record<string, SavedCategory>,
  mapWidth = 0,
  mapHeight = 0,
): SavedPlanetNode[] {
  const layout = resolveSavedMapLayout(
    countries,
    categoryByName,
    {},
    mapWidth,
    mapHeight,
  );
  return layout?.planets ?? [];
}
