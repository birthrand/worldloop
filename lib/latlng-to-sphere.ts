/** Convert WGS84 lat/lng to a point on a sphere (Three.js Y-up). */
export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number,
): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return [x, y, z];
}

/** Inverse of `latLngToVector3` for a point on a unit sphere (Y-up). */
export function vector3ToLatLng(
  x: number,
  y: number,
  z: number,
): [lat: number, lng: number] {
  const lat = (Math.asin(Math.max(-1, Math.min(1, y))) * 180) / Math.PI;
  const thetaDeg = (Math.atan2(z, -x) * 180) / Math.PI;
  const lng = ((thetaDeg % 360) + 360) % 360 - 180;
  return [lat, lng];
}
