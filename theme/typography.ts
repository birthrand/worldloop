/**
 * WorldLoop typography scale
 * @see prompt_material/design-system.png
 */
export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
    lineHeight: 1.2,
    fontFamily: "Poppins-Bold",
  },
  h2: {
    fontSize: 24,
    fontWeight: "700" as const,
    lineHeight: 1.3,
    fontFamily: "Poppins-Bold",
  },
  h3: {
    fontSize: 20,
    fontWeight: "600" as const,
    lineHeight: 1.3,
    fontFamily: "Poppins-SemiBold",
  },
  h4: {
    fontSize: 16,
    fontWeight: "500" as const,
    lineHeight: 1.4,
    fontFamily: "Poppins-Medium",
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 1.6,
    fontFamily: "Poppins-Regular",
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 1.6,
    fontFamily: "Poppins-Regular",
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: "400" as const,
    lineHeight: 1.6,
    fontFamily: "Poppins-Regular",
  },
  caption: {
    fontSize: 11,
    fontWeight: "400" as const,
    lineHeight: 1.4,
    fontFamily: "Poppins-Regular",
  },
} as const;

export type Typography = typeof typography;
