// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const eventListeners = vi.hoisted(() => new Map<string, (event: { payload: unknown }) => void>());
const settingsMocks = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn() }));
const todayMocks = vi.hoisted(() => ({ getDigest: vi.fn() }));
const projectMocks = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (event: string, callback: (event: { payload: unknown }) => void) => {
    eventListeners.set(event, callback);
    return () => eventListeners.delete(event);
  }),
}));

vi.mock("../features/today/todayClient", () => ({
  todayClient: {
    getDigest: todayMocks.getDigest,
  },
}));

vi.mock("../features/focus/focusClient", () => ({
  focusClient: {
    reconcile: vi.fn(async () => ({
      ok: true,
      data: { state: { state: "ready", serverTime: "2026-07-19T10:00:00Z" }, completedSession: null },
      version: 1,
    })),
    listHistory: vi.fn(async () => ({ ok: true, data: [], version: 1 })),
  },
}));

vi.mock("../features/settings/settingsClient", () => ({
  settingsClient: settingsMocks,
}));

vi.mock("../features/projects/projectClient", () => ({
  projectClient: {
    list: projectMocks.list,
  },
}));

import { App, applicationTitle } from "./App";

beforeEach(() => {
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["zh-CN"]);
  settingsMocks.get.mockResolvedValue({
    ok: true,
    data: { language: "system", appearance: "system", theme: "mint", backgroundRunning: true },
    version: 1,
  });
  settingsMocks.update.mockResolvedValue({
    ok: true,
    data: { language: "system", appearance: "dark", theme: "noir", backgroundRunning: true },
    version: 1,
  });
  todayMocks.getDigest.mockImplementation(async (date: string) => ({
    ok: true,
    data: { date, items: [] },
    version: 1,
  }));
  projectMocks.list.mockResolvedValue({ ok: true, data: [], version: 1 });
});

afterEach(() => {
  vi.restoreAllMocks();
  eventListeners.clear();
  Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
});

describe("App", () => {
  it("renders the application identity", () => {
    expect(applicationTitle).toBe("抵达 Focus");
  });

  it("renders an interactive primary navigation within the startup budget", () => {
    const startedAt = performance.now();
    render(<App />);

    const today = screen.getByRole("button", { name: "今日" });
    expect(performance.now() - startedAt).toBeLessThan(3_000);
    expect(today).toBeEnabled();
    today.focus();
    expect(today).toHaveFocus();
  });

  it("opens quick task and focus views from tray events", async () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", { configurable: true, value: {} });
    render(<App />);
    await waitFor(() => expect(eventListeners.has("tray://quick-task")).toBe(true));

    act(() => eventListeners.get("tray://quick-task")?.({ payload: null }));
    expect(screen.getByRole("dialog", { name: "创建任务" })).toBeInTheDocument();

    await act(async () => {
      eventListeners.get("tray://open-focus")?.({ payload: null });
      await Promise.resolve();
    });
    expect(screen.getByRole("heading", { name: "专注" })).toBeInTheDocument();
  });

  it("refreshes project summaries and the current digest after today data changes", async () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", { configurable: true, value: {} });
    render(<App />);
    await waitFor(() => expect(eventListeners.has("today://changed")).toBe(true));
    await waitFor(() => expect(todayMocks.getDigest).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(projectMocks.list).toHaveBeenCalledTimes(1));

    act(() => eventListeners.get("today://changed")?.({ payload: null }));

    await waitFor(() => expect(todayMocks.getDigest).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(projectMocks.list).toHaveBeenCalledTimes(2));
  });

  it("opens the calendar workspace from primary navigation", () => {
    render(<App />);
    const calendar = screen.getByRole("button", { name: "日历" });
    calendar.focus();
    fireEvent.click(calendar);

    expect(screen.getByRole("heading", { name: "日历" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "日历视图" })).toBeInTheDocument();
    expect(calendar).toHaveFocus();
    expect(calendar).toHaveAttribute("aria-current", "page");
    expect(screen.queryByLabelText("本周日期")).not.toBeInTheDocument();
  });

  it("applies shared settings events to the main window theme", async () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", { configurable: true, value: {} });
    const { container } = render(<App />);
    await waitFor(() => expect(eventListeners.has("settings://changed")).toBe(true));

    act(() => {
      eventListeners.get("settings://changed")?.({
        payload: { language: "en", appearance: "dark", theme: "noir", backgroundRunning: false },
      });
    });

    expect(container.querySelector(".app-shell")).toHaveAttribute("data-theme", "noir");
    expect(container.querySelector(".app-shell")).toHaveAttribute("data-mode", "dark");
    expect(container.querySelector(".app-shell")).toHaveAttribute("data-locale", "en-US");
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("lang", "en-US");
  });
});
