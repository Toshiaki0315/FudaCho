import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import { useBoardStore } from "./store/boardStore";

describe("App", () => {
  beforeEach(() => {
    useBoardStore.getState().reset();
  });
  it("ヘッダーにプロジェクト名「札帖」を表示する", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /札帖/ })).toBeInTheDocument();
  });

  it("デフォルト設定の5レーンでカンバンボードを表示する", () => {
    render(<App />);
    const lanes = screen.getAllByRole("region");
    expect(lanes).toHaveLength(5);
    for (const name of ["未着手", "作業中", "完了", "クローズ", "中断"]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
  });

  it("最初のレーンに「＋新規作成」ボタンを表示する", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: "＋新規作成" }),
    ).toBeInTheDocument();
  });

  it("エクスポートボタンで現在のボードのマークダウンが表示される", async () => {
    const user = userEvent.setup();
    useBoardStore.getState().addParent({ summary: "設計する" });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "エクスポート" }));
    const textarea = screen.getByRole("textbox", { name: "エクスポート結果" });
    expect(textarea).toHaveDisplayValue(/## P-1: 設計する/);
  });

  it("インポートでボードが置き換えられる", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "インポート" }));
    const textarea = screen.getByRole("textbox", { name: "マークダウン" });
    await user.click(textarea);
    await user.paste("# 取込プロジェクト\n\n## P-1: 取り込んだタスク\n");
    await user.click(screen.getByRole("button", { name: "取り込み" }));
    expect(
      screen.getByRole("heading", { name: "取込プロジェクト" }),
    ).toBeInTheDocument();
    const todoLane = screen.getByRole("region", { name: "未着手" });
    expect(within(todoLane).getByText("取り込んだタスク")).toBeInTheDocument();
  });

  it("設定でプロジェクト名とレーン構成を変更できる", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "設定" }));
    const projectName = screen.getByLabelText("プロジェクト名");
    await user.clear(projectName);
    await user.type(projectName, "改名プロジェクト");
    const rows = screen.getAllByRole("listitem");
    await user.click(within(rows[3]).getByRole("button", { name: "削除" }));
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "改名プロジェクト" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("region")).toHaveLength(4);
    expect(
      screen.queryByRole("region", { name: "クローズ" }),
    ).not.toBeInTheDocument();
  });

  it("不正なマークダウンのインポートはエラーを表示する", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "インポート" }));
    const textarea = screen.getByRole("textbox", { name: "マークダウン" });
    await user.click(textarea);
    await user.paste("見出しのない不正な内容");
    await user.click(screen.getByRole("button", { name: "取り込み" }));
    expect(screen.getByText(/プロジェクト名/)).toBeInTheDocument();
  });
});
