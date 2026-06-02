import { describe, expect, it } from "vitest";

import {
  projectRingToTangentPlaneFlat,
  ringSphericalCentroid,
  splitRingAtAntimeridian,
  triangulatePolygonFlat,
} from "@/lib/globe-polygon-triangulation";
import type { LatLng } from "react-native-maps";

/** Rough mainland China bbox — does not cross the antimeridian. */
const CHINA_MAINLAND_RING: LatLng[] = [
  { latitude: 53, longitude: 73 },
  { latitude: 53, longitude: 135 },
  { latitude: 20, longitude: 135 },
  { latitude: 20, longitude: 73 },
];

describe("ringSphericalCentroid", () => {
  it("places eastern-hemisphere rings near their geographic center", () => {
    const centroid = ringSphericalCentroid(CHINA_MAINLAND_RING);

    expect(centroid.lat).toBeGreaterThan(15);
    expect(centroid.lat).toBeLessThan(55);
    expect(centroid.lng).toBeGreaterThan(70);
    expect(centroid.lng).toBeLessThan(140);
  });
});

describe("projectRingToTangentPlaneFlat", () => {
  it("projects large eastern-hemisphere rings from unit-sphere vertices", () => {
    const flat = projectRingToTangentPlaneFlat(CHINA_MAINLAND_RING);

    expect(flat).toHaveLength(CHINA_MAINLAND_RING.length * 2);
    expect(flat.every((value) => Number.isFinite(value))).toBe(true);

    const indices = triangulatePolygonFlat(flat);
    expect(indices.length).toBeGreaterThan(0);
    expect(indices.length % 3).toBe(0);
  });
});

describe("splitRingAtAntimeridian", () => {
  it("does not split rings that stay east of the antimeridian", () => {
    const chains = splitRingAtAntimeridian(CHINA_MAINLAND_RING);

    expect(chains).toHaveLength(1);
    expect(chains[0]).toBe(CHINA_MAINLAND_RING);
  });
});
