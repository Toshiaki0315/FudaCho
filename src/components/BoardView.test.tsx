import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useBoardStore } from "../store/boardStore";
import { BoardView } from "./BoardView";

// デフォルトレーン: lane-1=未着手, lane-2=作業中, lane-3=完了, lane-4=クローズ, lane-5=中断

describe("BoardView", () => {
  beforeEach(() => {
    useBoardStore.getState().reset();
  });

  it("ストアの親アイテムを対応するレーンに表示する", () => {
    const store = useBoardStore.getState();
    store.addParent({ summary: "設計する" });
    useBoardStore.getState().addParent({ summary: "実装する" });
    useBoardStore.getState().moveItem("P-2", "lane-2");
    render(<BoardView />);
    const todoLane = screen.getByRole("region", { name: "未着手" });
    expect(within(todoLane).getByText("設計する")).toBeInTheDocument();
    const inProgressLane = screen.getByRole("region", { name: "作業中" });
    expect(within(inProgressLane).getByText("実装する")).toBeInTheDocument();
  });

  it("子アイテムも対応するレーンに表示する", () => {
    const store = useBoardStore.getState();
    const parentId = store.addParent({ summary: "設計する" });
    useBoardStore.getState().addChild({ parentId, description: "図を描く" });
    render(<BoardView />);
    const todoLane = screen.getByRole("region", { name: "未着手" });
    expect(within(todoLane).getByText("図を描く")).toBeInTheDocument();
  });

  it("レーン内の優先順位どおりの順序でカードを表示する", () => {
    const store = useBoardStore.getState();
    store.addParent({ summary: "A" });
    useBoardStore.getState().addParent({ summary: "B" });
    useBoardStore.getState().reorderLane("lane-1", 1, 0);
    render(<BoardView />);
    const todoLane = screen.getByRole("region", { name: "未着手" });
    const cards = within(todoLane).getAllByRole("article");
    expect(cards[0]).toHaveTextContent("B");
    expect(cards[1]).toHaveTextContent("A");
  });

  it("「＋新規作成」で親アイテムが追加される", async () => {
    const user = userEvent.setup();
    render(<BoardView />);
    await user.click(screen.getByRole("button", { name: "＋新規作成" }));
    const todoLane = screen.getByRole("region", { name: "未着手" });
    expect(within(todoLane).getByText("P-1")).toBeInTheDocument();
  });

  it("Drop操作を持つレーン（作業中）のカードにDropボタンが表示される", () => {
    const store = useBoardStore.getState();
    store.addParent({ summary: "設計する" });
    useBoardStore.getState().moveItem("P-1", "lane-2");
    render(<BoardView />);
    const inProgressLane = screen.getByRole("region", { name: "作業中" });
    expect(
      within(inProgressLane).getByRole("button", { name: "Drop" }),
    ).toBeInTheDocument();
  });

  it("Drop操作を持たないレーンのカードにはDropボタンが表示されない", () => {
    useBoardStore.getState().addParent({ summary: "設計する" });
    render(<BoardView />);
    expect(
      screen.queryByRole("button", { name: "Drop" }),
    ).not.toBeInTheDocument();
  });

  it("Dropボタンで作業中のアイテムが中断レーンに移動しデータは保持される", async () => {
    const user = userEvent.setup();
    const store = useBoardStore.getState();
    store.addParent({ summary: "設計する" });
    useBoardStore.getState().moveItem("P-1", "lane-2");
    render(<BoardView />);
    await user.click(screen.getByRole("button", { name: "Drop" }));
    expect(useBoardStore.getState().parents["P-1"].laneId).toBe("lane-5");
    const droppedLane = screen.getByRole("region", { name: "中断" });
    expect(within(droppedLane).getByText("設計する")).toBeInTheDocument();
  });

  it("Drop先レーンがWIP制限に達している場合はDropボタンが無効になる", () => {
    const store = useBoardStore.getState();
    const settings = store.settings;
    store.updateSettings({
      projectName: settings.projectName,
      lanes: settings.lanes.map((lane) =>
        lane.id === "lane-5" ? { ...lane, wipLimit: 1 } : lane,
      ),
    });
    useBoardStore.getState().addParent({ summary: "A" });
    useBoardStore.getState().addParent({ summary: "B" });
    useBoardStore.getState().moveItem("P-1", "lane-5");
    useBoardStore.getState().moveItem("P-2", "lane-2");
    render(<BoardView />);
    expect(screen.getByRole("button", { name: "Drop" })).toBeDisabled();
  });

  it("親カードをダブルクリックすると詳細ビューが開きレーン名が表示される", async () => {
    const user = userEvent.setup();
    useBoardStore.getState().addParent({ summary: "設計する" });
    render(<BoardView />);
    await user.dblClick(screen.getByText("設計する"));
    const dialog = screen.getByRole("dialog", { name: "P-1 の詳細" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("未着手")).toBeInTheDocument();
    expect(screen.getByLabelText("概要")).toHaveValue("設計する");
  });

  it("親詳細ビューで編集して保存するとカードに反映されダイアログが閉じる", async () => {
    const user = userEvent.setup();
    useBoardStore.getState().addParent({ summary: "設計する" });
    render(<BoardView />);
    await user.dblClick(screen.getByText("設計する"));
    const summary = screen.getByLabelText("概要");
    await user.clear(summary);
    await user.type(summary, "詳細設計する");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("詳細設計する")).toBeInTheDocument();
    expect(useBoardStore.getState().parents["P-1"].summary).toBe(
      "詳細設計する",
    );
  });

  it("子カードをダブルクリックすると子詳細ビューが開き、保存で反映される", async () => {
    const user = userEvent.setup();
    const parentId = useBoardStore.getState().addParent({ summary: "設計" });
    useBoardStore.getState().addChild({ parentId, description: "図を描く" });
    render(<BoardView />);
    await user.dblClick(screen.getByText("図を描く"));
    expect(
      screen.getByRole("dialog", { name: "C-1 の詳細" }),
    ).toBeInTheDocument();
    const description = screen.getByLabelText("作業内容");
    await user.clear(description);
    await user.type(description, "詳細図を描く");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("詳細図を描く")).toBeInTheDocument();
  });

  it("詳細ビューをキャンセルすると変更されずに閉じる", async () => {
    const user = userEvent.setup();
    useBoardStore.getState().addParent({ summary: "設計する" });
    render(<BoardView />);
    await user.dblClick(screen.getByText("設計する"));
    const summary = screen.getByLabelText("概要");
    await user.clear(summary);
    await user.type(summary, "変更したが保存しない");
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(useBoardStore.getState().parents["P-1"].summary).toBe("設計する");
  });

  it("親詳細ビューから子アイテムを追加できる", async () => {
    const user = userEvent.setup();
    useBoardStore.getState().addParent({ summary: "設計する" });
    render(<BoardView />);
    await user.dblClick(screen.getByText("設計する"));
    await user.click(
      screen.getByRole("button", { name: "＋子アイテムを追加" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const state = useBoardStore.getState();
    expect(state.parents["P-1"].childIds).toEqual(["C-1"]);
    const todoLane = screen.getByRole("region", { name: "未着手" });
    expect(within(todoLane).getByText("C-1")).toBeInTheDocument();
  });

  it("カードはドラッグ可能である（ドラッグ属性を持つ）", () => {
    useBoardStore.getState().addParent({ summary: "設計する" });
    render(<BoardView />);
    const todoLane = screen.getByRole("region", { name: "未着手" });
    const card = within(todoLane).getByRole("article");
    expect(card.closest("[aria-roledescription='sortable']")).not.toBeNull();
  });
});
