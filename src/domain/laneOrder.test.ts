import { describe, expect, it } from "vitest";
import {
  createEmptyLaneOrder,
  insertIntoLane,
  moveToLane,
  removeFromLanes,
  reorderWithinLane,
} from "./laneOrder";

describe("createEmptyLaneOrder", () => {
  it("全ステータスの空レーンを持つ", () => {
    const order = createEmptyLaneOrder();
    expect(order).toEqual({
      ToDo: [],
      InProgress: [],
      Done: [],
      Close: [],
      Dropped: [],
    });
  });
});

describe("insertIntoLane", () => {
  it("レーンの末尾に追加する（インデックス省略時）", () => {
    let order = createEmptyLaneOrder();
    order = insertIntoLane(order, "ToDo", "P-1");
    order = insertIntoLane(order, "ToDo", "P-2");
    expect(order.ToDo).toEqual(["P-1", "P-2"]);
  });

  it("指定したインデックスに挿入する", () => {
    let order = createEmptyLaneOrder();
    order = insertIntoLane(order, "ToDo", "P-1");
    order = insertIntoLane(order, "ToDo", "P-2");
    order = insertIntoLane(order, "ToDo", "P-3", 1);
    expect(order.ToDo).toEqual(["P-1", "P-3", "P-2"]);
  });

  it("元のオブジェクトは変更されない（イミュータブル）", () => {
    const order = createEmptyLaneOrder();
    insertIntoLane(order, "ToDo", "P-1");
    expect(order.ToDo).toEqual([]);
  });

  it("既に存在するIDを挿入するとエラーになる", () => {
    let order = createEmptyLaneOrder();
    order = insertIntoLane(order, "ToDo", "P-1");
    expect(() => insertIntoLane(order, "InProgress", "P-1")).toThrow(/P-1/);
  });
});

describe("reorderWithinLane", () => {
  it("レーン内でアイテムを前方に移動できる", () => {
    let order = createEmptyLaneOrder();
    order = insertIntoLane(order, "ToDo", "P-1");
    order = insertIntoLane(order, "ToDo", "P-2");
    order = insertIntoLane(order, "ToDo", "P-3");
    const result = reorderWithinLane(order, "ToDo", 2, 0);
    expect(result.ToDo).toEqual(["P-3", "P-1", "P-2"]);
  });

  it("レーン内でアイテムを後方に移動できる", () => {
    let order = createEmptyLaneOrder();
    order = insertIntoLane(order, "ToDo", "P-1");
    order = insertIntoLane(order, "ToDo", "P-2");
    order = insertIntoLane(order, "ToDo", "P-3");
    const result = reorderWithinLane(order, "ToDo", 0, 2);
    expect(result.ToDo).toEqual(["P-2", "P-3", "P-1"]);
  });

  it("範囲外のインデックスを指定するとエラーになる", () => {
    let order = createEmptyLaneOrder();
    order = insertIntoLane(order, "ToDo", "P-1");
    expect(() => reorderWithinLane(order, "ToDo", 0, 5)).toThrow(
      /インデックス/,
    );
    expect(() => reorderWithinLane(order, "ToDo", -1, 0)).toThrow(
      /インデックス/,
    );
  });
});

describe("moveToLane", () => {
  it("アイテムを別レーンの指定位置に移動する", () => {
    let order = createEmptyLaneOrder();
    order = insertIntoLane(order, "ToDo", "P-1");
    order = insertIntoLane(order, "InProgress", "P-2");
    const result = moveToLane(order, "P-1", "InProgress", 0);
    expect(result.ToDo).toEqual([]);
    expect(result.InProgress).toEqual(["P-1", "P-2"]);
  });

  it("インデックス省略時は移動先レーンの末尾に移動する", () => {
    let order = createEmptyLaneOrder();
    order = insertIntoLane(order, "ToDo", "P-1");
    order = insertIntoLane(order, "InProgress", "P-2");
    const result = moveToLane(order, "P-1", "InProgress");
    expect(result.InProgress).toEqual(["P-2", "P-1"]);
  });

  it("同一レーンへの移動は位置の変更として扱う", () => {
    let order = createEmptyLaneOrder();
    order = insertIntoLane(order, "ToDo", "P-1");
    order = insertIntoLane(order, "ToDo", "P-2");
    const result = moveToLane(order, "P-2", "ToDo", 0);
    expect(result.ToDo).toEqual(["P-2", "P-1"]);
  });

  it("存在しないIDを移動するとエラーになる", () => {
    const order = createEmptyLaneOrder();
    expect(() => moveToLane(order, "P-99", "Done")).toThrow(/P-99/);
  });
});

describe("removeFromLanes", () => {
  it("アイテムをレーンから取り除く", () => {
    let order = createEmptyLaneOrder();
    order = insertIntoLane(order, "ToDo", "P-1");
    order = insertIntoLane(order, "ToDo", "P-2");
    const result = removeFromLanes(order, "P-1");
    expect(result.ToDo).toEqual(["P-2"]);
  });

  it("存在しないIDの場合は変更なしで返す", () => {
    let order = createEmptyLaneOrder();
    order = insertIntoLane(order, "ToDo", "P-1");
    const result = removeFromLanes(order, "P-99");
    expect(result.ToDo).toEqual(["P-1"]);
  });
});
