import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Header } from "./Header";

describe("Header", () => {
  it("プロジェクト名を見出しとして表示する", () => {
    render(<Header projectName="マイプロジェクト" onOpenSettings={vi.fn()} />);
    expect(
      screen.getByRole("heading", { name: "マイプロジェクト" }),
    ).toBeInTheDocument();
  });

  it("設定ボタンを表示する", () => {
    render(<Header projectName="札帖" onOpenSettings={vi.fn()} />);
    expect(screen.getByRole("button", { name: "設定" })).toBeInTheDocument();
  });

  it("設定ボタンをクリックするとonOpenSettingsが呼ばれる", async () => {
    const onOpenSettings = vi.fn();
    const user = userEvent.setup();
    render(<Header projectName="札帖" onOpenSettings={onOpenSettings} />);
    await user.click(screen.getByRole("button", { name: "設定" }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
