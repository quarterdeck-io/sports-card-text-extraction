/**
 * Utility functions for managing export preferences in sessionStorage
 */

export type ExportType = "csv" | "sheets";

const PREFERENCE_KEY = "exportPreference";

/**
 * Save the user's export preference
 */
export function saveExportPreference(type: ExportType): void {
  sessionStorage.setItem(PREFERENCE_KEY, type);
}

/**
 * Get the user's saved export preference
 */
export function getExportPreference(): ExportType | null {
  const preference = sessionStorage.getItem(PREFERENCE_KEY);
  return preference === "csv" || preference === "sheets" ? preference : null;
}

/**
 * Clear the export preference
 */
export function clearExportPreference(): void {
  sessionStorage.removeItem(PREFERENCE_KEY);
}

