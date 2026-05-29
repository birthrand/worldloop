export type RgbColor = { r: number; g: number; b: number };

export function hslToRgb(hue: number, saturation: number, lightness: number): RgbColor {
  const h = ((hue % 360) + 360) % 360;
  const s = Math.min(1, Math.max(0, saturation));
  const l = Math.min(1, Math.max(0, lightness));

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function rgbToHex({ r, g, b }: RgbColor): string {
  const toHex = (value: number) =>
    Math.min(255, Math.max(0, value)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hueToHex(
  hue: number,
  saturation = 0.85,
  lightness = 0.58,
): string {
  return rgbToHex(hslToRgb(hue, saturation, lightness));
}

export function hexToRgb(hex: string): RgbColor | null {
  const cleaned = hex.replace("#", "").trim();
  const normalized =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((char) => char + char)
          .join("")
      : cleaned;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function rgbToHsl(
  red: number,
  green: number,
  blue: number,
): { h: number; s: number; l: number } {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness };
  }

  const saturation =
    delta / (1 - Math.abs(2 * lightness - 1));

  let hue = 0;
  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  hue *= 60;
  if (hue < 0) {
    hue += 360;
  }

  return { h: hue, s: saturation, l: lightness };
}

export function hexToHue(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return null;
  }

  return rgbToHsl(rgb.r, rgb.g, rgb.b).h;
}

const HUE_SPECTRUM_STOPS = [0, 45, 90, 135, 180, 225, 270, 315, 360] as const;

/** CSS linear-gradient matching boundary stroke/fill HSL tuning. */
export function getHueSpectrumGradient(
  saturation = 0.85,
  lightness = 0.58,
): string {
  const segments = HUE_SPECTRUM_STOPS.map((hue, index) => {
    const percent = Math.round((index / (HUE_SPECTRUM_STOPS.length - 1)) * 100);
    return `${hueToHex(hue, saturation, lightness)} ${percent}%`;
  });
  return `linear-gradient(to right, ${segments.join(", ")})`;
}
