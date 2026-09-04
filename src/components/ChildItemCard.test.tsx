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

  it("親のある子アイテムは親の名前を表示する", () => {
    const item = createChildItem({
      id: "C-1",
      parentId: "P-1",
      description: "テストを書く",
      laneId: "lane-2",
    });
    render(<ChildItemCard item={item} parentName="ログイン改善" />);
    expect(screen.getByText("親: ログイン改善")).toBeInTheDocument();
  });

  it("親名が渡されない場合は親IDで代用する", () => {
    const item = createChildItem({
      id: "C-1",
      parentId: "P-1",
      description: "テストを書く",
      laneId: "lane-2",
    });
    render(<ChildItemCard item={item} />);
    expect(screen.getByText("親: P-1")).toBeInTheDocument();
  });

  it("親のない子アイテムは「親なし」と表示する（親ありとの区別）", () => {
    const item = createChildItem({
      id: "C-2",
      parentId: null,
      description: "単独作業",
      laneId: "lane-2",
    });
    render(<ChildItemCard item={item} parentName="無視される" />);
    expect(screen.getByText("親なし")).toBeInTheDocument();
    expect(screen.queryByText(/^親: /)).not.toBeInTheDocument();
  });
});
