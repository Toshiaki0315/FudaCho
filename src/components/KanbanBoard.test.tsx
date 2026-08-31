import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
          { status: "ToDo", displayName: "やること" },
          { status: "Done", displayName: "おわった" },
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

  it("laneContentで各レーンに内容を描画できる", () => {
    const { lanes } = createDefaultSettings();
    render(
      <KanbanBoard
        lanes={lanes}
        laneContent={(status) => <p>{status}のカード</p>}
      />,
    );
    const todoLane = screen.getByRole("region", { name: "未着手" });
    expect(within(todoLane).getByText("ToDoのカード")).toBeInTheDocument();
  });
});
