import { AppMode } from "@/components/ModeSelectionModal";

const MODE_STORAGE_KEY = "appMode";

export function getSavedMode(): AppMode {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem(MODE_STORAGE_KEY);
  return saved === "card" || saved === "book" ? saved : null;
}

export function saveMode(mode: AppMode): void {
  if (typeof window === "undefined") return;
  if (mode) {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  } else {
    localStorage.removeItem(MODE_STORAGE_KEY);
  }
}

export function clearMode(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MODE_STORAGE_KEY);
}
