/** Disabled — globe camera traces are off in dev. */
export const GLOBE_CAMERA_DEBUG = false;

export type GlobeCameraLogPayload = {
  reason: string;
  from?: number;
  to?: number;
  target?: number;
  latitudeDelta?: number;
  tier?: string;
  source?: string;
  mode?: string;
  durationMs?: number;
  [key: string]: unknown;
};

function describeZoom(
  from?: number,
  to?: number,
): "in" | "out" | "hold" | undefined {
  if (from === undefined || to === undefined) return undefined;
  if (to < from - 0.001) return "in";
  if (to > from + 0.001) return "out";
  return "hold";
}

export function logGlobeCamera(payload: GlobeCameraLogPayload): void {
  if (!GLOBE_CAMERA_DEBUG) return;

  const { reason, from, to, target, ...rest } = payload;
  const zoom = describeZoom(from, to);

  console.log("[globe-camera]", reason, {
    ...(from !== undefined ? { from: +from.toFixed(3) } : {}),
    ...(to !== undefined ? { to: +to.toFixed(3) } : {}),
    ...(target !== undefined ? { target: +target.toFixed(3) } : {}),
    ...(zoom ? { zoom } : {}),
    ...rest,
  });
}
