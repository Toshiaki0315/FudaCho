import { describe, expect, it } from "vitest";
import { createChildItem } from "./childItem";
import { createDefaultLanes } from "./lane";
import { changeLane, isDropped } from "./laneChange";
import { createParentItem } from "./parentItem";

const lanes = createDefaultLanes();

describe("changeLane", () => {
  it("親アイテムのレーンを変更した新しいオブジェクトを返す", () => {
    const item = createParentItem({
      id: "P-1",
      summary: "設計する",
      laneId: "lane-1",
    });
    const moved = changeLane(item, "lane-2");
    expect(moved.laneId).toBe("lane-2");
    expect(moved.id).toBe("P-1");
  });

  it("子アイテムのレーンも変更できる", () => {
    const item = createChildItem({
      id: "C-1",
      parentId: "P-1",
      description: "作業",
      laneId: "lane-1",
    });
    const moved = changeLane(item, "lane-3");
    expect(moved.laneId).toBe("lane-3");
  });

  it("元のアイテムは変更されない（イミュータブル）", () => {
    const item = createParentItem({
      id: "P-1",
      summary: "設計する",
      laneId: "lane-1",
    });
    changeLane(item, "lane-3");
    expect(item.laneId).toBe("lane-1");
  });

  it("レーン以外のフィールドは維持される", () => {
    const item = createParentItem({
      id: "P-1",
      summary: "設計する",
      laneId: "lane-1",
      assignee: "野村",
      size: 5,
    });
    const moved = changeLane(item, "lane-4");
    expect(moved.assignee).toBe("野村");
    expect(moved.size).toBe(5);
    expect(moved.summary).toBe("設計する");
  });
});

describe("isDropped", () => {
  it("進捗除外レーンにいるアイテムに対してtrueを返す（削除ではなくデータとして保持）", () => {
    const item = createParentItem({
      id: "P-1",
      summary: "設計する",
      laneId: "lane-5",
    });
    expect(isDropped(item, lanes)).toBe(true);
    // データはすべて保持され参照可能
    expect(item.summary).toBe("設計する");
  });

  it("通常レーンのアイテムに対してfalseを返す", () => {
    const item = createParentItem({
      id: "P-1",
      summary: "設計する",
      laneId: "lane-1",
    });
    expect(isDropped(item, lanes)).toBe(false);
  });

  it("存在しないレーンのアイテムに対してfalseを返す", () => {
    const item = createParentItem({
      id: "P-1",
      summary: "設計する",
      laneId: "lane-99",
    });
    expect(isDropped(item, lanes)).toBe(false);
  });
});
