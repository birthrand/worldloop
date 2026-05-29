import type { SelectionSource } from "@/store/use-identity-store";

export type MapPresentationMode = "idle" | "focus" | "preview";

export type MapPresentationIntent = {
  countryName: string;
  mode: Extract<MapPresentationMode, "focus" | "preview">;
  source: Exclude<SelectionSource, null>;
};
