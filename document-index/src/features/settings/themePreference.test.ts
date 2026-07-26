import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyTheme,
  DEFAULT_THEME,
  readTheme,
  saveTheme,
  THEME_STORAGE_KEY,
} from "./themePreference";

describe("themePreference", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    vi.restoreAllMocks();
  });

  it("uses parchment for a missing or unknown preference", () => {
    expect(readTheme()).toBe(DEFAULT_THEME);

    window.localStorage.setItem(THEME_STORAGE_KEY, "unknown");
    expect(readTheme()).toBe(DEFAULT_THEME);
  });

  it("reads both supported themes", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "parchment");
    expect(readTheme()).toBe("parchment");

    window.localStorage.setItem(THEME_STORAGE_KEY, "minimal");
    expect(readTheme()).toBe("minimal");
  });

  it("applies and saves the selected theme", () => {
    saveTheme("minimal");

    expect(document.documentElement).toHaveAttribute("data-theme", "minimal");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("minimal");

    applyTheme("parchment");
    expect(document.documentElement).toHaveAttribute("data-theme", "parchment");
  });

  it("falls back safely when storage cannot be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    expect(readTheme()).toBe(DEFAULT_THEME);
  });

  it("keeps the current-session theme when storage cannot be written", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    saveTheme("minimal");
    expect(document.documentElement).toHaveAttribute("data-theme", "minimal");
  });
});
