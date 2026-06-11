import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type ProfileSettingsState = {
  darkModeEnabled: boolean;
  languageCode: string;
  setDarkModeEnabled: (enabled: boolean) => void;
  setLanguageCode: (code: string) => void;
};

export const useProfileSettingsStore = create<ProfileSettingsState>()(
  persist(
    (set) => ({
      darkModeEnabled: true,
      languageCode: "en",
      setDarkModeEnabled: (enabled) => set({ darkModeEnabled: enabled }),
      setLanguageCode: (code) => set({ languageCode: code }),
    }),
    {
      name: "worldloop-profile-settings",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export function getLanguageLabel(code: string): string {
  const labels: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
  };
  return labels[code] ?? "English";
}
