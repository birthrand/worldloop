/**
 * WorldLoop gradient tokens
 * @see prompt_material/design-system.png
 */
export const gradients = {
  glow: ["#1565FF", "#00D4C7", "#7B61FF"] as const,
  ocean: ["#1565FF", "#00D4C7"] as const,
  aurora: ["#7B61FF", "#00D4C7"] as const,
  nightSky: ["#0B132B", "#1565FF"] as const,
} as const;

export type Gradients = typeof gradients;
