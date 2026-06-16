import { describe, expect, it } from "vitest";

import {
  normalizeSearchResults,
  rankCountrySearchMatch,
  resolveCountryCanonicalName,
} from "@/lib/country-name-aliases";

describe("resolveCountryCanonicalName", () => {
  it("maps Cape Verde to Cabo Verde", () => {
    expect(resolveCountryCanonicalName("Cape Verde")).toBe("Cabo Verde");
    expect(resolveCountryCanonicalName("cape verde")).toBe("Cabo Verde");
  });

  it("leaves canonical names unchanged", () => {
    expect(resolveCountryCanonicalName("Cabo Verde")).toBe("Cabo Verde");
    expect(resolveCountryCanonicalName("Canada")).toBe("Canada");
  });
});

describe("normalizeSearchResults", () => {
  it("rewrites alias rows and dedupes mixed ca results", () => {
    const cabo = { name: "Cabo Verde", capital: "Praia" };
    const cape = { name: "Cape Verde", capital: "Praia" };
    const canada = { name: "Canada", capital: "Ottawa" };

    expect(normalizeSearchResults([cape, cabo, canada])).toEqual([
      cabo,
      canada,
    ]);
  });
});

describe("rankCountrySearchMatch", () => {
  it("matches Cabo Verde via canonical and Cape Verde alias", () => {
    expect(rankCountrySearchMatch("Cabo Verde", "ca")).toBe(0);
    expect(rankCountrySearchMatch("Cabo Verde", "cap")).toBe(0);
    expect(rankCountrySearchMatch("Cabo Verde", "cape")).toBe(0);
    expect(rankCountrySearchMatch("Cabo Verde", "cape ver")).toBe(0);
  });
});
