import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createLane } from "../domain/lane";
import { createDefaultSettings } from "../domain/settings";
import { KanbanBoard } from "./KanbanBoard";

describe("KanbanBoard", () => {
  it("レーン設定に基づいて列を動的に生成する", () => {
    const { lanes } = createDefaultSettings();
    render(<KanbanBoard lanes={lanes} />);
    const columns = screen.getAllByRole("region");
    expect(columns).toHaveLength(5);
  });

  it("各列にレーンの表示名が見出しとして表示される", () => {
    const { lanes } = createDefaultSettings();
    render(<KanbanBoard lanes={lanes} />);
    for (const name of ["未着手", "作業中", "完了", "クローズ", "中断"]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
  });

  it("レーン設定の順序どおりに列が並ぶ", () => {
    const { lanes } = createDefaultSettings();
    render(<KanbanBoard lanes={lanes} />);
    const headings = screen.getAllByRole("heading").map((h) => h.textContent);
    expect(headings).toEqual(["未着手", "作業中", "完了", "クローズ", "中断"]);
  });

  it("カスタムレーン設定（列数の増減・名前変更）にも対応する", () => {
    render(
      <KanbanBoard
        lanes={[
          createLane({ id: "lane-1", name: "やること", isDefaultEntry: true }),
          createLane({ id: "lane-2", name: "おわった" }),
        ]}
      />,
    );
    expect(screen.getAllByRole("region")).toHaveLength(2);
    expect(
      screen.getByRole("heading", { name: "やること" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "おわった" }),
    ).toBeInTheDocument();
  });

  it("onAddItemを渡すと投入先レーンに「＋新規作成」ボタンが表示される", async () => {
    const onAddItem = vi.fn();
    const { lanes } = createDefaultSettings();
    render(<KanbanBoard lanes={lanes} onAddItem={onAddItem} />);
    const entryLane = screen.getByRole("region", { name: "未着手" });
    const button = within(entryLane).getByRole("button", {
      name: "＋新規作成",
    });
    await userEvent.setup().click(button);
    expect(onAddItem).toHaveBeenCalledTimes(1);
  });

  it("「＋新規作成」ボタンは投入先レーン以外には表示されない", () => {
    const { lanes } = createDefaultSettings();
    render(<KanbanBoard lanes={lanes} onAddItem={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: "＋新規作成" })).toHaveLength(
      1,
    );
  });

  it("投入先が2番目のレーンでもそのレーンにボタンが表示される", () => {
    render(
      <KanbanBoard
        lanes={[
          createLane({ id: "lane-1", name: "完了済み" }),
          createLane({ id: "lane-2", name: "受付", isDefaultEntry: true }),
        ]}
        onAddItem={vi.fn()}
      />,
    );
    const entryLane = screen.getByRole("region", { name: "受付" });
    expect(
      within(entryLane).getByRole("button", { name: "＋新規作成" }),
    ).toBeInTheDocument();
  });

  it("onAddItem未指定の場合はボタンを表示しない", () => {
    const { lanes } = createDefaultSettings();
    render(<KanbanBoard lanes={lanes} />);
    expect(
      screen.queryByRole("button", { name: "＋新規作成" }),
    ).not.toBeInTheDocument();
  });

  it("laneContentで各レーンに内容を描画できる", () => {
    const { lanes } = createDefaultSettings();
    render(
      <KanbanBoard
        lanes={lanes}
        laneContent={(laneId) => <p>{laneId}のカード</p>}
      />,
    );
    const todoLane = screen.getByRole("region", { name: "未着手" });
    expect(within(todoLane).getByText("lane-1のカード")).toBeInTheDocument();
  });
});
