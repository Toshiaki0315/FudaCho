import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createChildItem } from "../domain/childItem";
import { ChildItemCard } from "./ChildItemCard";

describe("ChildItemCard", () => {
  it("IDと作業内容を表示する", () => {
    const item = createChildItem({
      id: "C-1",
      parentId: "P-1",
      description: "テストを書く",
      laneId: "lane-1",
    });
    render(<ChildItemCard item={item} />);
    expect(screen.getByText("C-1")).toBeInTheDocument();
    expect(screen.getByText("テストを書く")).toBeInTheDocument();
  });

  it("タイトルがある場合はIDの代わりにタイトルを表示する", () => {
    const item = createChildItem({
      id: "C-1",
      title: "図面作成",
      parentId: "P-1",
      description: "テストを書く",
      laneId: "lane-1",
    });
    render(<ChildItemCard item={item} />);
    expect(screen.getByText("図面作成")).toBeInTheDocument();
    expect(screen.queryByText("C-1")).not.toBeInTheDocument();
  });

  it("子アイテムであることを示すバッジを表示する（親カードとの視覚的区別）", () => {
    const item = createChildItem({
      id: "C-1",
      parentId: "P-1",
      description: "テストを書く",
      laneId: "lane-1",
    });
    render(<ChildItemCard item={item} />);
    const badge = screen.getByLabelText("子アイテム");
    expect(badge).toHaveTextContent("📝");
  });
});
