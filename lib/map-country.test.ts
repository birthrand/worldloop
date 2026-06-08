import { describe, expect, it } from "vitest";

import {
  equirectangularCoverCenteringZoom,
  latLngToEquirectangularContainPosition,
  latLngToEquirectangularCoverCenteredLayout,
  latLngToEquirectangularCoverPosition,
} from "@/lib/map-country";

describe("latLngToEquirectangularCoverPosition", () => {
  it("places the prime meridian and equator at the map center for a 2:1 container", () => {
    const position = latLngToEquirectangularCoverPosition(0, 0, 360, 180);

    expect(position.left).toBeCloseTo(180, 5);
    expect(position.top).toBeCloseTo(90, 5);
  });

  it("places Japan on the right side of a wide cover crop", () => {
    const position = latLngToEquirectangularCoverPosition(36, 138, 350, 132);

    expect(position.left).toBeGreaterThan(250);
    expect(position.top).toBeGreaterThan(10);
    expect(position.top).toBeLessThan(80);
  });
});

describe("equirectangularCoverCenteringZoom", () => {
  const width = 350;
  const height = 132;

  it("uses base zoom for countries near the map center", () => {
    expect(equirectangularCoverCenteringZoom(0, 0, width, height, 2, 1)).toBe(
      1,
    );
  });

  it("zooms in for countries near the horizontal edge", () => {
    const zoom = equirectangularCoverCenteringZoom(
      36,
      138,
      width,
      height,
      2,
      1,
    );

    expect(zoom).toBeGreaterThan(3);
  });
});

describe("latLngToEquirectangularCoverCenteredLayout", () => {
  const width = 350;
  const height = 132;

  function assertCoversContainer(
    layout: ReturnType<typeof latLngToEquirectangularCoverCenteredLayout>,
  ) {
    expect(layout.imageLeft).toBeLessThanOrEqual(0);
    expect(layout.imageTop).toBeLessThanOrEqual(0);
    expect(layout.imageLeft + layout.imageWidth).toBeGreaterThanOrEqual(width);
    expect(layout.imageTop + layout.imageHeight).toBeGreaterThanOrEqual(height);
  }

  it("fills the viewport for equatorial countries", () => {
    assertCoversContainer(
      latLngToEquirectangularCoverCenteredLayout(0, 0, width, height, 2, 1),
    );
  });

  it("fills the viewport for Japan", () => {
    assertCoversContainer(
      latLngToEquirectangularCoverCenteredLayout(36, 138, width, height, 2, 1),
    );
  });

  it("fills the viewport for the United States", () => {
    assertCoversContainer(
      latLngToEquirectangularCoverCenteredLayout(39, -98, width, height, 2, 1),
    );
  });
});

describe("latLngToEquirectangularContainPosition", () => {
  it("keeps Japan inside the contained map bounds on a wide card", () => {
    const width = 350;
    const height = 132;
    const position = latLngToEquirectangularContainPosition(
      36,
      138,
      width,
      height,
    );
    const horizontalPadding = (width - height * 2) / 2;

    expect(position.left).toBeGreaterThan(horizontalPadding);
    expect(position.left).toBeLessThan(width - horizontalPadding);
    expect(position.top).toBeGreaterThan(0);
    expect(position.top).toBeLessThan(height);
  });
});
