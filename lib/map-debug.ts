import type { Region } from "react-native-maps";

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
