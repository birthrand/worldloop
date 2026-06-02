export type BBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

/**
 * Antimeridian: when `west > east`, the bbox wraps across ±180° longitude.
 * Split into two non-wrapping boxes so intersection and point tests stay correct.
 */
function splitBBoxOnAntimeridian(bbox: BBox): BBox[] {
  if (bbox.west <= bbox.east) return [bbox];

  return [
    { west: bbox.west, south: bbox.south, east: 180, north: bbox.north },
    { west: -180, south: bbox.south, east: bbox.east, north: bbox.north },
  ];
}

function bboxesIntersectNormal(a: BBox, b: BBox): boolean {
  return (
    a.west <= b.east &&
    a.east >= b.west &&
    a.south <= b.north &&
    a.north >= b.south
  );
}

export function bboxesIntersect(a: BBox, b: BBox): boolean {
  const aParts = splitBBoxOnAntimeridian(a);
  const bParts = splitBBoxOnAntimeridian(b);

  return aParts.some((aPart) =>
    bParts.some((bPart) => bboxesIntersectNormal(aPart, bPart)),
  );
}

export function bboxContainsPoint(
  bbox: BBox,
  lat: number,
  lng: number,
): boolean {
  if (lat < bbox.south || lat > bbox.north) return false;

  if (bbox.west <= bbox.east) {
    return lng >= bbox.west && lng <= bbox.east;
  }

  return lng >= bbox.west || lng <= bbox.east;
}

export function bboxCenter(bbox: BBox): { lat: number; lng: number } {
  const lat = (bbox.south + bbox.north) / 2;

  if (bbox.west <= bbox.east) {
    return { lat, lng: (bbox.west + bbox.east) / 2 };
  }

  const span = 360 - bbox.west + bbox.east;
  let lng = bbox.west + span / 2;
  if (lng > 180) lng -= 360;

  return { lat, lng };
}

export function validateBBox(bbox: BBox): string | null {
  const { west, south, east, north } = bbox;

  if (
    !Number.isFinite(west) ||
    !Number.isFinite(south) ||
    !Number.isFinite(east) ||
    !Number.isFinite(north)
  ) {
    return "bbox coordinates must be finite numbers";
  }

  if (south < -90 || south > 90 || north < -90 || north > 90) {
    return "latitude must be between -90 and 90";
  }

  if (west < -180 || west > 180 || east < -180 || east > 180) {
    return "longitude must be between -180 and 180";
  }

  if (south > north) {
    return "south must be less than or equal to north";
  }

  return null;
}

export type GeoIndexedCountry = {
  name: string;
  capital: string;
  region: string;
  population: number;
  cca2: string;
  flag: string;
  centroid: [number, number];
  bbox: BBox;
};

export function countryIntersectsBBox(
  entity: GeoIndexedCountry,
  query: BBox,
): boolean {
  if (bboxesIntersect(entity.bbox, query)) return true;

  const [lat, lng] = entity.centroid;
  return bboxContainsPoint(query, lat, lng);
}

function centroidDistanceSq(
  entity: GeoIndexedCountry,
  center: { lat: number; lng: number },
): number {
  const [lat, lng] = entity.centroid;
  const dLat = lat - center.lat;
  let dLng = lng - center.lng;

  if (dLng > 180) dLng -= 360;
  if (dLng < -180) dLng += 360;

  return dLat * dLat + dLng * dLng;
}

export function rankCountriesByCenter(
  matches: GeoIndexedCountry[],
  center: { lat: number; lng: number },
): GeoIndexedCountry[] {
  return [...matches].sort((a, b) => {
    const distA = centroidDistanceSq(a, center);
    const distB = centroidDistanceSq(b, center);
    if (distA !== distB) return distA - distB;
    return b.population - a.population;
  });
}
