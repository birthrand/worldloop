import { create } from "zustand";

const DEFAULT_TOAST_DURATION_MS = 500;

type ToastState = {
  message: string | null;
  showToast: (message: string, durationMs?: number) => void;
  hideToast: () => void;
};

let hideTimer: ReturnType<typeof setTimeout> | null = null;

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,

  showToast: (message, durationMs = DEFAULT_TOAST_DURATION_MS) => {
    clearHideTimer();
    set({ message });
    hideTimer = setTimeout(() => {
      set({ message: null });
      hideTimer = null;
    }, durationMs);
  },

  hideToast: () => {
    clearHideTimer();
    set({ message: null });
  },
}));
