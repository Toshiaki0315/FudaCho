import { describe, expect, it } from "vitest";
import { createChildItem } from "./childItem";
import { createParentItem } from "./parentItem";
import { changeStatus, dropItem, isDropped } from "./statusChange";

describe("changeStatus", () => {
  it("親アイテムのステータスを変更した新しいオブジェクトを返す", () => {
    const item = createParentItem({ id: "P-1", summary: "設計する" });
    const moved = changeStatus(item, "InProgress");
    expect(moved.status).toBe("InProgress");
    expect(moved.id).toBe("P-1");
  });

  it("子アイテムのステータスも変更できる", () => {
    const item = createChildItem({
      id: "C-1",
      parentId: "P-1",
      description: "作業",
    });
    const moved = changeStatus(item, "Done");
    expect(moved.status).toBe("Done");
  });

  it("元のアイテムは変更されない（イミュータブル）", () => {
    const item = createParentItem({ id: "P-1", summary: "設計する" });
    changeStatus(item, "Done");
    expect(item.status).toBe("ToDo");
  });

  it("ステータス以外のフィールドは維持される", () => {
    const item = createParentItem({
      id: "P-1",
      summary: "設計する",
      assignee: "野村",
      size: 5,
    });
    const moved = changeStatus(item, "Close");
    expect(moved.assignee).toBe("野村");
    expect(moved.size).toBe(5);
    expect(moved.summary).toBe("設計する");
  });
});

describe("dropItem", () => {
  it("アイテムをDropped状態に移行する（削除ではなくデータとして保持）", () => {
    const item = createParentItem({
      id: "P-1",
      summary: "設計する",
      status: "InProgress",
    });
    const dropped = dropItem(item);
    expect(dropped.status).toBe("Dropped");
    // データはすべて保持され参照可能
    expect(dropped.id).toBe("P-1");
    expect(dropped.summary).toBe("設計する");
  });
});

describe("isDropped", () => {
  it("Dropped状態のアイテムに対してtrueを返す", () => {
    const item = createParentItem({
      id: "P-1",
      summary: "設計する",
      status: "Dropped",
    });
    expect(isDropped(item)).toBe(true);
  });

  it("Dropped以外のステータスに対してfalseを返す", () => {
    const item = createParentItem({ id: "P-1", summary: "設計する" });
    expect(isDropped(item)).toBe(false);
  });
});
