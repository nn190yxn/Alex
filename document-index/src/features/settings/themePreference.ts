export const APP_THEMES = ["parchment", "minimal"] as const;

export type AppTheme = (typeof APP_THEMES)[number];

export const DEFAULT_THEME: AppTheme = "parchment";
export const THEME_STORAGE_KEY = "document-index.appearance-theme";

export function readTheme(): AppTheme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isAppTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
}

export function saveTheme(theme: AppTheme) {
  applyTheme(theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The selected theme remains active for the current session.
  }
}

function isAppTheme(value: string | null): value is AppTheme {
  return value === "parchment" || value === "minimal";
}
