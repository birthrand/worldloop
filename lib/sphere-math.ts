import { latLngToVector3 } from "@/lib/latlng-to-sphere";
import type { LatLng } from "react-native-maps";

export type UnitVector3 = { x: number; y: number; z: number };

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export function latLngToUnitVector(lat: number, lng: number): UnitVector3 {
  const [x, y, z] = latLngToVector3(lat, lng, 1);
  return { x, y, z };
}

export function latLngRingToUnitVectors(ring: LatLng[]): UnitVector3[] {
  return ring.map((point) =>
    latLngToUnitVector(point.latitude, point.longitude),
  );
}

export function dotUnit(a: UnitVector3, b: UnitVector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function sphericalCentroidUnit(vectors: UnitVector3[]): UnitVector3 {
  let x = 0;
  let y = 0;
  let z = 0;

  for (const vector of vectors) {
    x += vector.x;
    y += vector.y;
    z += vector.z;
  }

  const len = Math.hypot(x, y, z);
  if (len < 1e-8) return vectors[0] ?? { x: 0, y: 1, z: 0 };

  return { x: x / len, y: y / len, z: z / len };
}

/** Orthonormal basis on the tangent plane at `normal` (unit vector). */
export function tangentBasisAtNormal(normal: UnitVector3): {
  u: UnitVector3;
  v: UnitVector3;
} {
  const ref =
    Math.abs(normal.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };

  const ux = ref.y * normal.z - ref.z * normal.y;
  const uy = ref.z * normal.x - ref.x * normal.z;
  const uz = ref.x * normal.y - ref.y * normal.x;
  const uLen = Math.hypot(ux, uy, uz);
  const u = { x: ux / uLen, y: uy / uLen, z: uz / uLen };
  const v = {
    x: normal.y * u.z - normal.z * u.y,
    y: normal.z * u.x - normal.x * u.z,
    z: normal.x * u.y - normal.y * u.x,
  };

  return { u, v };
}

/**
 * Project unit-sphere vertices onto the tangent plane at `normal`.
 * Earcut runs in this 2D plane; triangle indices map back to the same 3D vertices.
 */
export function projectUnitVectorsToTangentPlane(
  vectors: UnitVector3[],
  normal: UnitVector3,
): number[] {
  const { u, v } = tangentBasisAtNormal(normal);
  const flat: number[] = [];

  for (const point of vectors) {
    flat.push(dotUnit(point, u), dotUnit(point, v));
  }

  return flat;
}

export function slerpUnit(
  a: UnitVector3,
  b: UnitVector3,
  t: number,
): UnitVector3 {
  const dot = clamp(dotUnit(a, b), -1, 1);
  const omega = Math.acos(dot);

  if (omega < 1e-6) {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    };
  }

  const sinOmega = Math.sin(omega);
  const w0 = Math.sin((1 - t) * omega) / sinOmega;
  const w1 = Math.sin(t * omega) / sinOmega;

  return {
    x: a.x * w0 + b.x * w1,
    y: a.y * w0 + b.y * w1,
    z: a.z * w0 + b.z * w1,
  };
}

/** Minimum dot(vertex, centroidNormal) — low values mean vertices curve away from the projection pole. */
export function minVertexNormalAlignment(
  vectors: UnitVector3[],
  normal: UnitVector3,
): number {
  let minAlignment = Infinity;

  for (const vector of vectors) {
    const alignment = dotUnit(vector, normal);
    if (alignment < minAlignment) minAlignment = alignment;
  }

  return Number.isFinite(minAlignment) ? minAlignment : 1;
}

/** Max angular step between interpolated points along each edge (~2°). */
export const GREAT_CIRCLE_MAX_SEGMENT_RADIANS = Math.PI / 90;

export function greatCircleSegmentCount(
  a: UnitVector3,
  b: UnitVector3,
  maxSegmentRadians = GREAT_CIRCLE_MAX_SEGMENT_RADIANS,
): number {
  const dot = clamp(dotUnit(a, b), -1, 1);
  const omega = Math.acos(dot);
  return Math.max(1, Math.ceil(omega / maxSegmentRadians));
}

/** Open polyline along great-circle arcs (for boundary strokes). */
export function buildGreatCircleChainPositions(
  chain: LatLng[],
  radius: number,
  maxSegmentRadians = GREAT_CIRCLE_MAX_SEGMENT_RADIANS,
): Float32Array {
  if (chain.length < 2) return new Float32Array(0);

  const positions: number[] = [];

  for (let i = 0; i < chain.length - 1; i += 1) {
    const start = latLngToUnitVector(chain[i]!.latitude, chain[i]!.longitude);
    const end = latLngToUnitVector(
      chain[i + 1]!.latitude,
      chain[i + 1]!.longitude,
    );
    const steps = greatCircleSegmentCount(start, end, maxSegmentRadians);

    for (let step = 0; step <= steps; step += 1) {
      if (step === 0 && i > 0) continue;

      const t = step / steps;
      const point = slerpUnit(start, end, t);
      positions.push(point.x * radius, point.y * radius, point.z * radius);
    }
  }

  return new Float32Array(positions);
}
