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

  it("エクスポート・インポートボタンを表示しクリックでハンドラが呼ばれる", async () => {
    const onExport = vi.fn();
    const onImport = vi.fn();
    const user = userEvent.setup();
    render(
      <Header
        projectName="札帖"
        onOpenSettings={vi.fn()}
        onExport={onExport}
        onImport={onImport}
      />,
    );
    await user.click(screen.getByRole("button", { name: "エクスポート" }));
    expect(onExport).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "インポート" }));
    expect(onImport).toHaveBeenCalledTimes(1);
  });

  it("ハンドラ未指定の場合はエクスポート・インポートボタンを表示しない", () => {
    render(<Header projectName="札帖" onOpenSettings={vi.fn()} />);
    expect(
      screen.queryByRole("button", { name: "エクスポート" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "インポート" }),
    ).not.toBeInTheDocument();
  });
});
