import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createChildItem } from "../domain/childItem";
import { createParentItem } from "../domain/parentItem";
import { ParentItemCard } from "./ParentItemCard";

describe("ParentItemCard", () => {
  it("IDと概要を表示する", () => {
    const item = createParentItem({ id: "P-1", summary: "設計する" });
    render(<ParentItemCard item={item} children_={[]} />);
    expect(screen.getByText("P-1")).toBeInTheDocument();
    expect(screen.getByText("設計する")).toBeInTheDocument();
  });

  it("子アイテムがない場合、進捗率は0%と表示される", () => {
    const item = createParentItem({ id: "P-1", summary: "設計する" });
    render(<ParentItemCard item={item} children_={[]} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("子アイテムの完了状況から進捗率を計算して表示する", () => {
    const item = createParentItem({
      id: "P-1",
      summary: "設計する",
      childIds: ["C-1", "C-2"],
    });
    const children = [
      createChildItem({
        id: "C-1",
        parentId: "P-1",
        description: "作業1",
        status: "Done",
      }),
      createChildItem({
        id: "C-2",
        parentId: "P-1",
        description: "作業2",
        status: "ToDo",
      }),
    ];
    render(<ParentItemCard item={item} children_={children} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("進捗率は整数に丸めて表示する", () => {
    const item = createParentItem({ id: "P-1", summary: "設計する" });
    const children = [
      createChildItem({
        id: "C-1",
        parentId: "P-1",
        description: "作業1",
        status: "Done",
      }),
      createChildItem({
        id: "C-2",
        parentId: "P-1",
        description: "作業2",
        status: "ToDo",
      }),
      createChildItem({
        id: "C-3",
        parentId: "P-1",
        description: "作業3",
        status: "ToDo",
      }),
    ];
    render(<ParentItemCard item={item} children_={children} />);
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("親アイテムであることを示すバッジを表示する（子カードとの視覚的区別）", () => {
    const item = createParentItem({ id: "P-1", summary: "設計する" });
    render(<ParentItemCard item={item} children_={[]} />);
    const badge = screen.getByLabelText("親アイテム");
    expect(badge).toHaveTextContent("📋");
  });

  it("進捗率がプログレスバーとして提供される", () => {
    const item = createParentItem({ id: "P-1", summary: "設計する" });
    render(<ParentItemCard item={item} children_={[]} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
