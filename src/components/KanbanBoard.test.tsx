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
    expect(screen.getAllByRole("region")).toHaveLength(5);
    for (const name of ["PBL", "SBL", "作業中", "Close", "Drop"]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
  });

  it("レーン設定の順序どおりに列が並ぶ", () => {
    const { lanes } = createDefaultSettings();
    render(<KanbanBoard lanes={lanes} />);
    const headings = screen.getAllByRole("heading").map((h) => h.textContent);
    expect(headings).toEqual(["PBL", "SBL", "作業中", "Close", "Drop"]);
  });

  it("PBLレーンにonAddParentの「＋新規作成」ボタンが表示される", async () => {
    const onAddParent = vi.fn();
    const { lanes } = createDefaultSettings();
    render(
      <KanbanBoard
        lanes={lanes}
        onAddParent={onAddParent}
        onAddChild={vi.fn()}
      />,
    );
    const pblLane = screen.getByRole("region", { name: "PBL" });
    await userEvent
      .setup()
      .click(within(pblLane).getByRole("button", { name: "＋新規作成" }));
    expect(onAddParent).toHaveBeenCalledTimes(1);
  });

  it("SBLレーンにonAddChildの「＋新規作成」ボタンが表示される", async () => {
    const onAddChild = vi.fn();
    const { lanes } = createDefaultSettings();
    render(
      <KanbanBoard
        lanes={lanes}
        onAddParent={vi.fn()}
        onAddChild={onAddChild}
      />,
    );
    const sblLane = screen.getByRole("region", { name: "SBL" });
    await userEvent
      .setup()
      .click(within(sblLane).getByRole("button", { name: "＋新規作成" }));
    expect(onAddChild).toHaveBeenCalledTimes(1);
  });

  it("新規作成ボタンはPBLとSBLのみに表示される", () => {
    const { lanes } = createDefaultSettings();
    render(
      <KanbanBoard lanes={lanes} onAddParent={vi.fn()} onAddChild={vi.fn()} />,
    );
    expect(screen.getAllByRole("button", { name: "＋新規作成" })).toHaveLength(
      2,
    );
    for (const name of ["作業中", "Close", "Drop"]) {
      const lane = screen.getByRole("region", { name });
      expect(
        within(lane).queryByRole("button", { name: "＋新規作成" }),
      ).not.toBeInTheDocument();
    }
  });

  it("ハンドラ未指定の場合はボタンを表示しない", () => {
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
    const pblLane = screen.getByRole("region", { name: "PBL" });
    expect(within(pblLane).getByText("lane-1のカード")).toBeInTheDocument();
  });

  it("laneCountsを渡すとレーンヘッダーに件数を表示する", () => {
    const { lanes } = createDefaultSettings();
    render(<KanbanBoard lanes={lanes} laneCounts={{ "lane-1": 3 }} />);
    const pblLane = screen.getByRole("region", { name: "PBL" });
    expect(within(pblLane).getByText("3")).toBeInTheDocument();
  });

  it("WIP制限付きレーンは「件数 / 制限」を表示し、超過時は超過スタイルが付く", () => {
    const lanes = [
      createLane({ id: "lane-1", name: "PBL", role: "pbl" }),
      createLane({ id: "lane-2", name: "SBL", role: "sbl" }),
      createLane({ id: "lane-3", name: "作業中", wipLimit: 1 }),
      createLane({ id: "lane-4", name: "Close", role: "close" }),
      createLane({ id: "lane-5", name: "Drop", role: "drop" }),
    ];
    render(<KanbanBoard lanes={lanes} laneCounts={{ "lane-3": 2 }} />);
    expect(screen.getByText("2 / 1")).toHaveClass("wip-exceeded");
  });
});
