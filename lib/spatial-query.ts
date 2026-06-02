import type { BBox, GeoEntity } from "@/types/geo";

/**
 * Antimeridian: when `west > east`, the bbox wraps across ±180° longitude.
 * We split into two non-wrapping boxes so intersection and point tests stay correct.
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

export function bboxesIntersect(a: BBox, b: BBox): boolean {
  const aParts = splitBBoxOnAntimeridian(a);
  const bParts = splitBBoxOnAntimeridian(b);

  return aParts.some((aPart) =>
    bParts.some((bPart) => bboxesIntersectNormal(aPart, bPart)),
  );
}

export function countryIntersectsBBox(entity: GeoEntity, bbox: BBox): boolean {
  if (bboxesIntersect(entity.bbox, bbox)) return true;

  const [lat, lng] = entity.centroid;
  return bboxContainsPoint(bbox, lat, lng);
}

export function countriesInBBox(index: GeoEntity[], bbox: BBox): GeoEntity[] {
  return index.filter((entity) => countryIntersectsBBox(entity, bbox));
}

function centroidDistanceSq(
  entity: GeoEntity,
  center: { lat: number; lng: number },
): number {
  const [lat, lng] = entity.centroid;
  const dLat = lat - center.lat;
  let dLng = lng - center.lng;

  if (dLng > 180) dLng -= 360;
  if (dLng < -180) dLng += 360;

  return dLat * dLat + dLng * dLng;
}

export function rankCountriesByViewportCenter(
  matches: GeoEntity[],
  center: { lat: number; lng: number },
  populationByName?: Readonly<Record<string, number>>,
): GeoEntity[] {
  return [...matches].sort((a, b) => {
    const distA = centroidDistanceSq(a, center);
    const distB = centroidDistanceSq(b, center);
    if (distA !== distB) return distA - distB;

    const popA = populationByName?.[a.name] ?? 0;
    const popB = populationByName?.[b.name] ?? 0;
    return popB - popA;
  });
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

export function countriesNearPoint(
  index: GeoEntity[],
  lat: number,
  lng: number,
  limit: number,
): GeoEntity[] {
  if (limit <= 0) return [];

  return [...index]
    .map((entity) => {
      const [entityLat, entityLng] = entity.centroid;
      return {
        entity,
        distanceKm: haversineKm(lat, lng, entityLat, entityLng),
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit)
    .map(({ entity }) => entity);
}
