import { describe, expect, it } from "vitest";
import {
  createEmptyLaneOrder,
  insertIntoLane,
  moveToLane,
  removeFromLanes,
  reorderWithinLane,
} from "./laneOrder";

const LANE_IDS = ["lane-1", "lane-2", "lane-3"];

describe("createEmptyLaneOrder", () => {
  it("指定した全レーンIDの空レーンを持つ", () => {
    const order = createEmptyLaneOrder(LANE_IDS);
    expect(order).toEqual({
      "lane-1": [],
      "lane-2": [],
      "lane-3": [],
    });
  });
});

describe("insertIntoLane", () => {
  it("レーンの末尾に追加する（インデックス省略時）", () => {
    let order = createEmptyLaneOrder(LANE_IDS);
    order = insertIntoLane(order, "lane-1", "P-1");
    order = insertIntoLane(order, "lane-1", "P-2");
    expect(order["lane-1"]).toEqual(["P-1", "P-2"]);
  });

  it("指定したインデックスに挿入する", () => {
    let order = createEmptyLaneOrder(LANE_IDS);
    order = insertIntoLane(order, "lane-1", "P-1");
    order = insertIntoLane(order, "lane-1", "P-2");
    order = insertIntoLane(order, "lane-1", "P-3", 1);
    expect(order["lane-1"]).toEqual(["P-1", "P-3", "P-2"]);
  });

  it("元のオブジェクトは変更されない（イミュータブル）", () => {
    const order = createEmptyLaneOrder(LANE_IDS);
    insertIntoLane(order, "lane-1", "P-1");
    expect(order["lane-1"]).toEqual([]);
  });

  it("既に存在するIDを挿入するとエラーになる", () => {
    let order = createEmptyLaneOrder(LANE_IDS);
    order = insertIntoLane(order, "lane-1", "P-1");
    expect(() => insertIntoLane(order, "lane-2", "P-1")).toThrow(/P-1/);
  });

  it("存在しないレーンへの挿入はエラーになる", () => {
    const order = createEmptyLaneOrder(LANE_IDS);
    expect(() => insertIntoLane(order, "lane-99", "P-1")).toThrow(/lane-99/);
  });
});

describe("reorderWithinLane", () => {
  it("レーン内でアイテムを前方に移動できる", () => {
    let order = createEmptyLaneOrder(LANE_IDS);
    order = insertIntoLane(order, "lane-1", "P-1");
    order = insertIntoLane(order, "lane-1", "P-2");
    order = insertIntoLane(order, "lane-1", "P-3");
    const result = reorderWithinLane(order, "lane-1", 2, 0);
    expect(result["lane-1"]).toEqual(["P-3", "P-1", "P-2"]);
  });

  it("レーン内でアイテムを後方に移動できる", () => {
    let order = createEmptyLaneOrder(LANE_IDS);
    order = insertIntoLane(order, "lane-1", "P-1");
    order = insertIntoLane(order, "lane-1", "P-2");
    order = insertIntoLane(order, "lane-1", "P-3");
    const result = reorderWithinLane(order, "lane-1", 0, 2);
    expect(result["lane-1"]).toEqual(["P-2", "P-3", "P-1"]);
  });

  it("範囲外のインデックスを指定するとエラーになる", () => {
    let order = createEmptyLaneOrder(LANE_IDS);
    order = insertIntoLane(order, "lane-1", "P-1");
    expect(() => reorderWithinLane(order, "lane-1", 0, 5)).toThrow(
      /インデックス/,
    );
    expect(() => reorderWithinLane(order, "lane-1", -1, 0)).toThrow(
      /インデックス/,
    );
  });

  it("存在しないレーンの並び替えはエラーになる", () => {
    const order = createEmptyLaneOrder(LANE_IDS);
    expect(() => reorderWithinLane(order, "lane-99", 0, 0)).toThrow(/lane-99/);
  });
});

describe("moveToLane", () => {
  it("アイテムを別レーンの指定位置に移動する", () => {
    let order = createEmptyLaneOrder(LANE_IDS);
    order = insertIntoLane(order, "lane-1", "P-1");
    order = insertIntoLane(order, "lane-2", "P-2");
    const result = moveToLane(order, "P-1", "lane-2", 0);
    expect(result["lane-1"]).toEqual([]);
    expect(result["lane-2"]).toEqual(["P-1", "P-2"]);
  });

  it("インデックス省略時は移動先レーンの末尾に移動する", () => {
    let order = createEmptyLaneOrder(LANE_IDS);
    order = insertIntoLane(order, "lane-1", "P-1");
    order = insertIntoLane(order, "lane-2", "P-2");
    const result = moveToLane(order, "P-1", "lane-2");
    expect(result["lane-2"]).toEqual(["P-2", "P-1"]);
  });

  it("同一レーンへの移動は位置の変更として扱う", () => {
    let order = createEmptyLaneOrder(LANE_IDS);
    order = insertIntoLane(order, "lane-1", "P-1");
    order = insertIntoLane(order, "lane-1", "P-2");
    const result = moveToLane(order, "P-2", "lane-1", 0);
    expect(result["lane-1"]).toEqual(["P-2", "P-1"]);
  });

  it("存在しないIDを移動するとエラーになる", () => {
    const order = createEmptyLaneOrder(LANE_IDS);
    expect(() => moveToLane(order, "P-99", "lane-3")).toThrow(/P-99/);
  });

  it("存在しないレーンへの移動はエラーになる", () => {
    let order = createEmptyLaneOrder(LANE_IDS);
    order = insertIntoLane(order, "lane-1", "P-1");
    expect(() => moveToLane(order, "P-1", "lane-99")).toThrow(/lane-99/);
  });
});

describe("removeFromLanes", () => {
  it("アイテムをレーンから取り除く", () => {
    let order = createEmptyLaneOrder(LANE_IDS);
    order = insertIntoLane(order, "lane-1", "P-1");
    order = insertIntoLane(order, "lane-1", "P-2");
    const result = removeFromLanes(order, "P-1");
    expect(result["lane-1"]).toEqual(["P-2"]);
  });

  it("存在しないIDの場合は変更なしで返す", () => {
    let order = createEmptyLaneOrder(LANE_IDS);
    order = insertIntoLane(order, "lane-1", "P-1");
    const result = removeFromLanes(order, "P-99");
    expect(result["lane-1"]).toEqual(["P-1"]);
  });
});
