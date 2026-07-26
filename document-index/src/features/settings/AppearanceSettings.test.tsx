import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppearanceSettings } from "./AppearanceSettings";

describe("AppearanceSettings", () => {
  it("shows both themes and marks the current selection", () => {
    render(<AppearanceSettings onThemeChange={vi.fn()} theme="parchment" />);

    expect(screen.getByRole("button", { name: /羊皮卷/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /极简黑白/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("selects a theme through the native button interaction", () => {
    const onThemeChange = vi.fn();
    render(<AppearanceSettings onThemeChange={onThemeChange} theme="parchment" />);

    fireEvent.click(screen.getByRole("button", { name: /极简黑白/ }));
    expect(onThemeChange).toHaveBeenCalledWith("minimal");
  });
});
