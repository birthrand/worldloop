import type { Region } from "react-native-maps";

const MAP_MODE_HANDOFF_LOG = "[MapModeHandoff]";

/** Dev-only logs for 2D ↔ 3D crossfade camera handoff. Filter Metro by `MapModeHandoff`. */
export function logMapModeHandoff(
  event: string,
  payload?: Record<string, unknown>,
) {
  if (!__DEV__) return;
  if (payload) {
    console.log(MAP_MODE_HANDOFF_LOG, event, payload);
    return;
  }
  console.log(MAP_MODE_HANDOFF_LOG, event);
}

export function summarizeRegion(region: Region) {
  const finite =
    Number.isFinite(region.latitude) &&
    Number.isFinite(region.longitude) &&
    Number.isFinite(region.latitudeDelta) &&
    Number.isFinite(region.longitudeDelta);

  return {
    lat: region.latitude,
    lng: region.longitude,
    latDelta: region.latitudeDelta,
    lngDelta: region.longitudeDelta,
    finite,
  };
}
