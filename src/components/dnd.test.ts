import { describe, expect, it, vi } from "vitest";
import type { DragEndEvent } from "@dnd-kit/core";
import { createEmptyLaneOrder, insertIntoLane } from "../domain/laneOrder";
import { composeDragHandler, resolveDragEnd } from "./dnd";

function buildOrder() {
  let order = createEmptyLaneOrder(["lane-1", "lane-2", "lane-3"]);
  order = insertIntoLane(order, "lane-1", "P-1");
  order = insertIntoLane(order, "lane-1", "P-2");
  order = insertIntoLane(order, "lane-2", "P-3");
  return order;
}

describe("resolveDragEnd", () => {
  it("レーンID上にドロップした場合はそのレーンへの移動になる", () => {
    const result = resolveDragEnd(buildOrder(), "P-1", "lane-2");
    expect(result).toEqual({ type: "move", toLaneId: "lane-2" });
  });

  it("別レーンのアイテム上にドロップした場合、そのアイテムの位置への移動になる", () => {
    const result = resolveDragEnd(buildOrder(), "P-1", "P-3");
    expect(result).toEqual({
      type: "move",
      toLaneId: "lane-2",
      index: 0,
    });
  });

  it("同一レーンのアイテム上にドロップした場合は並び替えになる", () => {
    const result = resolveDragEnd(buildOrder(), "P-1", "P-2");
    expect(result).toEqual({
      type: "reorder",
      laneId: "lane-1",
      fromIndex: 0,
      toIndex: 1,
    });
  });

  it("自分自身の上にドロップした場合はnullを返す", () => {
    expect(resolveDragEnd(buildOrder(), "P-1", "P-1")).toBeNull();
  });

  it("ドロップ先がない場合はnullを返す", () => {
    expect(resolveDragEnd(buildOrder(), "P-1", null)).toBeNull();
  });

  it("既に同じレーンのレーンID上にドロップした場合はnullを返す（変更なし）", () => {
    expect(resolveDragEnd(buildOrder(), "P-1", "lane-1")).toBeNull();
  });

  it("ドラッグ元のアイテムがレーンに存在しない場合はnullを返す", () => {
    expect(resolveDragEnd(buildOrder(), "X-9", "lane-2")).toBeNull();
  });

  it("ドロップ先がレーンにもアイテムにも該当しない場合はnullを返す", () => {
    expect(resolveDragEnd(buildOrder(), "P-1", "X-9")).toBeNull();
  });
});

describe("composeDragHandler", () => {
  it("DragEndEventからアクティブIDとドロップ先IDを取り出して適用関数に渡す", () => {
    const apply = vi.fn();
    const handler = composeDragHandler(apply);
    handler({
      active: { id: "P-1" },
      over: { id: "lane-2" },
    } as DragEndEvent);
    expect(apply).toHaveBeenCalledWith("P-1", "lane-2");
  });

  it("ドロップ先がない場合はnullを渡す", () => {
    const apply = vi.fn();
    const handler = composeDragHandler(apply);
    handler({ active: { id: "P-1" }, over: null } as DragEndEvent);
    expect(apply).toHaveBeenCalledWith("P-1", null);
  });
});
