import type { CameraZoomTier } from "@/lib/map-camera-zoom";
import type { MapCountry } from "@/types/country";
import type { MapPresentationMode } from "@/types/map-presentation";

const NAV_DEBUG_ENABLED = __DEV__;

/** Tab / stack route the user is on. */
export type AppScreenId =
  | "explore"
  | "map"
  | "home"
  | "profile"
  | "saved"
  | "dev"
  | "unknown";

/** In-map UI “screen” (presentation), not a separate route. */
export type MapSceneId =
  | "map:world"
  | "map:continent"
  | "map:country-focus"
  | "map:country-preview"
  | "map:onboarding";

export type ScreenSwitchInfo = {
  kind: "app" | "map";
  from: string;
  to: string;
  causedBy: string;
};

type NavigationDebugState = {
  currentAppScreen: AppScreenId;
  previousAppScreen: AppScreenId | null;
  currentMapScene: MapSceneId | null;
  previousMapScene: MapSceneId | null;
  lastPressedButton: string | null;
  pendingScreenSwitch: ScreenSwitchInfo | null;
};

const state: NavigationDebugState = {
  currentAppScreen: "unknown",
  previousAppScreen: null,
  currentMapScene: null,
  previousMapScene: null,
  lastPressedButton: null,
  pendingScreenSwitch: null,
};

export function formatAppScreenFromPathname(pathname: string): AppScreenId {
  const segment = pathname.replace(/^\//, "").split("/").filter(Boolean)[0];
  switch (segment) {
    case "explore":
      return "explore";
    case "map":
      return "map";
    case "index":
    case "":
      return "home";
    case "profile":
      return "profile";
    case "saved":
      return "saved";
    case "dev":
      return "dev";
    default:
      if (pathname.includes("explore")) return "explore";
      if (pathname.includes("map")) return "map";
      if (pathname.includes("profile")) return "profile";
      return "unknown";
  }
}

export function deriveMapScene(input: {
  showOnboarding: boolean;
  isPreviewOpen: boolean;
  presentationMode: MapPresentationMode;
  activeCountry: MapCountry | null;
  focusedRegion: string | null;
  cameraTier: CameraZoomTier;
}): MapSceneId {
  if (input.showOnboarding) return "map:onboarding";
  if (input.isPreviewOpen) return "map:country-preview";
  if (input.activeCountry && input.presentationMode === "focus") {
    return "map:country-focus";
  }
  if (input.focusedRegion && input.cameraTier !== "world") {
    return "map:continent";
  }
  return "map:world";
}

/** Record the control the user pressed (tab item, map FAB, chip, etc.). */
export function recordPressedButton(buttonId: string): void {
  if (!NAV_DEBUG_ENABLED) return;
  state.lastPressedButton = buttonId;
}

function queueScreenSwitch(info: ScreenSwitchInfo): void {
  state.pendingScreenSwitch = info;
}

/** Sync active tab route — call from a pathname listener. */
export function syncAppScreenFromPathname(pathname: string): void {
  if (!NAV_DEBUG_ENABLED) return;

  const next = formatAppScreenFromPathname(pathname);
  if (next === state.currentAppScreen) return;

  const from = state.currentAppScreen;
  const causedBy = state.lastPressedButton;

  state.previousAppScreen = from === "unknown" ? null : from;
  state.currentAppScreen = next;

  if (causedBy) {
    queueScreenSwitch({
      kind: "app",
      from,
      to: next,
      causedBy,
    });
  }
}

/** Sync in-map scene — call when map presentation / focus changes. */
export function syncMapScene(next: MapSceneId, causedBy?: string | null): void {
  if (!NAV_DEBUG_ENABLED) return;

  const from = state.currentMapScene;
  if (from === next) return;

  state.previousMapScene = from;
  state.currentMapScene = next;

  const button = causedBy ?? state.lastPressedButton;
  if (button && from) {
    queueScreenSwitch({
      kind: "map",
      from,
      to: next,
      causedBy: button,
    });
  }
}

export function getCurrentMapScene(): MapSceneId | null {
  return state.currentMapScene;
}

/** Predicted switch for the interaction log when state has not caught up yet. */
export function buildPredictedMapSceneSwitch(
  to: MapSceneId,
  causedBy: string,
): ScreenSwitchInfo {
  return {
    kind: "map",
    from: state.currentMapScene ?? "map:world",
    to,
    causedBy,
  };
}

/** Consumed by the next map interaction log (if any). */
export function consumePendingScreenSwitch(): ScreenSwitchInfo | null {
  const pending = state.pendingScreenSwitch;
  state.pendingScreenSwitch = null;
  return pending;
}

export type NavigationDebugLogFields = {
  currentScreen: AppScreenId;
  previousScreen: AppScreenId | null;
  mapScene: MapSceneId | null;
  previousMapScene: MapSceneId | null;
  pressedButton: string | null;
  screenSwitch: ScreenSwitchInfo | null;
};

export function buildNavigationDebugLogFields(input?: {
  pressedButton?: string | null;
  screenSwitch?: ScreenSwitchInfo | null;
}): NavigationDebugLogFields {
  const explicitSwitch = input?.screenSwitch ?? null;
  const pendingSwitch = consumePendingScreenSwitch();
  const screenSwitch = explicitSwitch ?? pendingSwitch;

  return {
    currentScreen: state.currentAppScreen,
    previousScreen: state.previousAppScreen,
    mapScene: state.currentMapScene,
    previousMapScene: state.previousMapScene,
    pressedButton:
      input?.pressedButton ??
      state.lastPressedButton ??
      screenSwitch?.causedBy ??
      null,
    screenSwitch,
  };
}

/** Map interaction trigger → stable button id for logs. */
export function mapTriggerToPressedButton(trigger?: string): string | null {
  switch (trigger) {
    case "mapPress":
      return "map:surface-tap";
    case "boundaryPress":
      return "map:country-boundary";
    case "markerPress":
      return "map:country-marker";
    case "fab":
      return "map:fab-random";
    case "shuffle":
      return "map:shuffle-next";
    case "deselection":
      return "map:deselect-country";
    case "selection":
      return "map:select-country";
    default:
      return null;
  }
}
