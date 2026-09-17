// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => undefined),
}));

import { decorateTaskList } from "../today/todayModel";
import { FocusWorkspace } from "./FocusWorkspace";
import type { FocusCommandClient } from "./focusClient";
import type { FocusSession } from "./types";

const tasks = decorateTaskList([{
  project: { id: "focus", name: "抵达 Focus", color: "#4eaa98", icon: "AF", status: "active" },
  task: { id: "task-1", projectId: "focus", title: "完成专注空间", category: "work", priority: 3, scheduledDate: "2026-07-19", scheduledTime: "10:30", status: "pending", completedAt: null, createdAt: "2026-07-19T08:00:00Z", updatedAt: "2026-07-19T08:00:00Z" },
}], "2026-07-19");

const historicalSession: FocusSession = {
  id: "session-history",
  taskId: "task-1",
  taskInstanceId: null,
  projectId: "focus",
  plannedSeconds: 1500,
  actualSeconds: 1200,
  interruptionCount: 1,
  completionKind: "early",
  startedAt: "2026-07-18T09:00:00Z",
  endedAt: "2026-07-18T09:20:00Z",
  createdAt: "2026-07-18T09:20:00Z",
};

function createClient(overrides: Partial<FocusCommandClient> = {}): FocusCommandClient {
  const ready = { state: "ready" as const, serverTime: "2026-07-19T10:00:00Z" };
  return {
    getState: async () => ({ ok: true, data: ready, version: 1 }),
    reconcile: async () => ({ ok: true, data: { state: ready }, version: 1 }),
    listHistory: async () => ({ ok: true, data: [], version: 1 }),
    start: async () => ({ ok: true, data: ready, version: 1 }),
    pause: async () => ({ ok: true, data: ready, version: 1 }),
    resume: async () => ({ ok: true, data: ready, version: 1 }),
    reset: async () => ({ ok: true, data: ready, version: 1 }),
    finish: async () => ({ ok: true, data: historicalSession, version: 1 }),
    ...overrides,
  };
}

function desktopRuntime() {
  Object.defineProperty(window, "__TAURI_INTERNALS__", {
    configurable: true,
    value: {},
  });
}

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
});

describe("FocusWorkspace", () => {
  it("selects duration and transitions through running and paused states", async () => {
    render(<FocusWorkspace tasks={tasks} initialTask={tasks[0]} />);

    expect(screen.getByLabelText("剩余时间 25:00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "15 分钟" }));
    expect(screen.getByLabelText("剩余时间 15:00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "开始专注" }));
    await screen.findByText("专注进行中");
    await waitFor(() => expect(screen.getByRole("button", { name: "暂停" })).toBeEnabled());
    fireEvent.keyDown(window, { code: "Space" });
    await screen.findByText("已暂停");
    fireEvent.click(screen.getByRole("button", { name: "继续" }));
    await screen.findByText("专注进行中");
  });

  it("keeps space key behavior inside task inputs", async () => {
    render(<FocusWorkspace tasks={tasks} initialTask={tasks[0]} />);

    const taskSelect = screen.getByRole("combobox", { name: "选择任务" });
    fireEvent.keyDown(taskSelect, { code: "Space" });
    expect(screen.getByText("准备就绪")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始专注" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "自定义" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: /分钟数/ }), { target: { value: "181" } });
    expect(screen.getByRole("button", { name: "开始专注" })).toBeDisabled();
  });

  it("confirms early completion and records the session", async () => {
    render(<FocusWorkspace tasks={tasks} initialTask={tasks[0]} />);
    fireEvent.click(screen.getByRole("button", { name: "开始专注" }));
    await screen.findByText("专注进行中");
    fireEvent.click(screen.getByRole("button", { name: "提前完成" }));
    expect(screen.getByRole("dialog", { name: "提前完成本轮专注？" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "确认完成" }));

    await waitFor(() => expect(screen.getByText("准备就绪")).toBeInTheDocument());
    expect(screen.getByText("完成专注空间", { selector: ".focus-sessions strong" })).toBeInTheDocument();
  });

  it("finishes naturally when the persisted deadline is reached", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T10:00:00Z"));
    render(<FocusWorkspace tasks={tasks} initialTask={tasks[0]} />);
    fireEvent.click(screen.getByRole("button", { name: "自定义" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: /分钟数/ }), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "开始专注" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_500);
    });

    expect(screen.getByText("准备就绪")).toBeInTheDocument();
    expect(screen.getByText("完成专注空间", { selector: ".focus-sessions strong" })).toBeInTheDocument();
  });

  it("loads persisted focus history in the desktop runtime", async () => {
    desktopRuntime();
    const listHistory = vi.fn(async () => ({ ok: true as const, data: [historicalSession], version: 1 }));

    render(<FocusWorkspace tasks={tasks} initialTask={tasks[0]} client={createClient({ listHistory })} />);

    expect(await screen.findByText("完成专注空间", { selector: ".focus-sessions strong" })).toBeInTheDocument();
    expect(screen.getByText("20:00")).toBeInTheDocument();
    expect(listHistory).toHaveBeenCalledTimes(1);
  });

  it("shows a recoverable error when persisted history fails to load", async () => {
    desktopRuntime();
    const client = createClient({ listHistory: async () => { throw new Error("database unavailable"); } });

    render(<FocusWorkspace tasks={tasks} initialTask={tasks[0]} client={client} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("无法读取专注状态");
  });
});
