import { describe, expect, it } from "vitest";

import { createI18n } from "../i18n/I18nContext";
import { domainErrorMessage } from "./domainError";

describe("domainErrorMessage", () => {
  it("maps actionable errors in both supported locales", () => {
    const error = { code: "TASK_DATE_IN_PAST", message: "internal detail", field: "scheduledDate" };

    expect(domainErrorMessage(error, createI18n("zh-CN").t)).toBe("任务日期不能早于今天。");
    expect(domainErrorMessage(error, createI18n("en-US").t)).toBe("Task dates cannot be earlier than today.");

    const pausedProject = { code: "FOCUS_PROJECT_PAUSED", message: "internal detail" };
    expect(domainErrorMessage(pausedProject, createI18n("zh-CN").t)).toBe("该项目已暂停，请恢复项目后开始专注。");
    expect(domainErrorMessage(pausedProject, createI18n("en-US").t)).toBe("This project is paused. Resume it before starting focus.");
  });

  it("maps storage failures to a safe message", () => {
    const error = {
      code: "DATABASE_ERROR",
      message: "C:\\Users\\private\\arrive-focus.sqlite3: secret task title",
    };
    const message = domainErrorMessage(error, createI18n("zh-CN").t);

    expect(message).toBe("本地数据暂时不可用，请稍后重试。");
    expect(message).not.toContain("private");
    expect(message).not.toContain("secret task title");
  });

  it("uses a safe fallback for unknown codes", () => {
    const error = { code: "FUTURE_INTERNAL_ERROR", message: "private note body" };

    expect(domainErrorMessage(error, createI18n("en-US").t)).toBe("The operation failed. Please try again.");
  });
});
