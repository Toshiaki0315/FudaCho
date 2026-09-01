import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createChildItem } from "../domain/childItem";
import { createDefaultLanes } from "../domain/lane";
import { createParentItem } from "../domain/parentItem";
import { ParentItemCard } from "./ParentItemCard";

// デフォルトレーン: lane-1=未着手, lane-3=完了
const lanes = createDefaultLanes();

function parent(childIds: string[] = []) {
  return createParentItem({
    id: "P-1",
    summary: "設計する",
    laneId: "lane-1",
    childIds,
  });
}

function child(id: string, laneId: string) {
  return createChildItem({
    id,
    parentId: "P-1",
    description: `作業${id}`,
    laneId,
  });
}

describe("ParentItemCard", () => {
  it("IDと概要を表示する", () => {
    render(<ParentItemCard item={parent()} children_={[]} lanes={lanes} />);
    expect(screen.getByText("P-1")).toBeInTheDocument();
    expect(screen.getByText("設計する")).toBeInTheDocument();
  });

  it("子アイテムがない場合、進捗率は0%と表示される", () => {
    render(<ParentItemCard item={parent()} children_={[]} lanes={lanes} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("子アイテムの完了状況から進捗率を計算して表示する", () => {
    const children = [child("C-1", "lane-3"), child("C-2", "lane-1")];
    render(
      <ParentItemCard
        item={parent(["C-1", "C-2"])}
        children_={children}
        lanes={lanes}
      />,
    );
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("進捗率は整数に丸めて表示する", () => {
    const children = [
      child("C-1", "lane-3"),
      child("C-2", "lane-1"),
      child("C-3", "lane-1"),
    ];
    render(
      <ParentItemCard item={parent()} children_={children} lanes={lanes} />,
    );
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("子アイテムを持つ場合は「完了数 / 総数」を表示する", () => {
    const children = [child("C-1", "lane-3"), child("C-2", "lane-1")];
    render(
      <ParentItemCard
        item={parent(["C-1", "C-2"])}
        children_={children}
        lanes={lanes}
      />,
    );
    expect(screen.getByText("子 1 / 2")).toBeInTheDocument();
  });

  it("Droppedの子は総数から除外して表示する", () => {
    const children = [child("C-1", "lane-5"), child("C-2", "lane-1")];
    render(
      <ParentItemCard
        item={parent(["C-1", "C-2"])}
        children_={children}
        lanes={lanes}
      />,
    );
    expect(screen.getByText("子 0 / 1")).toBeInTheDocument();
  });

  it("子アイテムを持たない場合は子カウントを表示しない", () => {
    render(<ParentItemCard item={parent()} children_={[]} lanes={lanes} />);
    expect(screen.queryByText(/^子 /)).not.toBeInTheDocument();
  });

  it("ReadyのアイテムにはReadyバッジが表示される", () => {
    const item = createParentItem({
      id: "P-1",
      summary: "設計する",
      laneId: "lane-1",
      reason: "理由",
      childIds: ["C-1"],
      ready: true,
    });
    render(
      <ParentItemCard
        item={item}
        children_={[child("C-1", "lane-1")]}
        lanes={lanes}
      />,
    );
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("Not ReadyのアイテムにはReadyバッジが表示されない", () => {
    render(<ParentItemCard item={parent()} children_={[]} lanes={lanes} />);
    expect(screen.queryByText("Ready")).not.toBeInTheDocument();
  });

  it("親アイテムであることを示すバッジを表示する（子カードとの視覚的区別）", () => {
    render(<ParentItemCard item={parent()} children_={[]} lanes={lanes} />);
    const badge = screen.getByLabelText("親アイテム");
    expect(badge).toHaveTextContent("📋");
  });

  it("進捗率がプログレスバーとして提供される", () => {
    render(<ParentItemCard item={parent()} children_={[]} lanes={lanes} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
