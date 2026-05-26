import type { Region } from "react-native-maps";

export const WORLD_INITIAL_REGION: Region = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 120,
  longitudeDelta: 120,
};

export function regionForCountry(
  latlng: [number, number],
  delta = 18,
): Region {
  return {
    latitude: latlng[0],
    longitude: latlng[1],
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}
