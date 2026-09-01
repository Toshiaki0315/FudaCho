import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useBoardStore } from "../store/boardStore";
import { BoardView } from "./BoardView";

describe("BoardView", () => {
  beforeEach(() => {
    useBoardStore.getState().reset();
  });

  it("ストアの親アイテムを対応するレーンに表示する", () => {
    const store = useBoardStore.getState();
    store.addParent({ summary: "設計する" });
    useBoardStore.getState().addParent({ summary: "実装する" });
    useBoardStore.getState().moveItem("P-2", "InProgress");
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
    useBoardStore.getState().reorderLane("ToDo", 1, 0);
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

  it("カードはドラッグ可能である（ドラッグ属性を持つ）", () => {
    useBoardStore.getState().addParent({ summary: "設計する" });
    render(<BoardView />);
    const todoLane = screen.getByRole("region", { name: "未着手" });
    const card = within(todoLane).getByRole("article");
    expect(card.closest("[aria-roledescription='sortable']")).not.toBeNull();
  });
});
