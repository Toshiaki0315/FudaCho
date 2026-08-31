import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("ヘッダーにプロジェクト名「札帖」を表示する", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /札帖/ })).toBeInTheDocument();
  });

  it("デフォルト設定の5レーンでカンバンボードを表示する", () => {
    render(<App />);
    const lanes = screen.getAllByRole("region");
    expect(lanes).toHaveLength(5);
    for (const name of ["未着手", "作業中", "完了", "クローズ", "中断"]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
  });

  it("最初のレーンに「＋新規作成」ボタンを表示する", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: "＋新規作成" }),
    ).toBeInTheDocument();
  });
});
