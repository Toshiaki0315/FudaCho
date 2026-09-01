import { describe, expect, it } from "vitest";
import { createChildItem } from "./childItem";
import { createDefaultLanes } from "./lane";
import { calculateProgress, childProgressCounts } from "./progress";

// デフォルトレーン: lane-1=PBL, lane-2=SBL, lane-3=作業中(自由), lane-4=Close, lane-5=Drop
const lanes = createDefaultLanes();

function child(id: string, laneId: string) {
  return createChildItem({
    id,
    parentId: "P-1",
    description: `作業${id}`,
    laneId,
  });
}

describe("childProgressCounts", () => {
  it("完了数（Close）と総数（Drop除外）を返す", () => {
    const children = [
      child("C-1", "lane-4"),
      child("C-2", "lane-2"),
      child("C-3", "lane-5"),
      child("C-4", "lane-3"),
    ];
    expect(childProgressCounts(children, lanes)).toEqual({
      done: 1,
      total: 3,
    });
  });

  it("子アイテムがない場合は0/0を返す", () => {
    expect(childProgressCounts([], lanes)).toEqual({ done: 0, total: 0 });
  });
});

describe("calculateProgress", () => {
  it("子アイテムがない場合は0を返す", () => {
    expect(calculateProgress([], lanes)).toBe(0);
  });

  it("Closeレーンの子だけを完了として数える", () => {
    const children = [
      child("C-1", "lane-4"),
      child("C-2", "lane-2"),
      child("C-3", "lane-4"),
      child("C-4", "lane-3"),
    ];
    expect(calculateProgress(children, lanes)).toBe(0.5);
  });

  it("全子アイテムがCloseの場合は1を返す", () => {
    const children = [child("C-1", "lane-4"), child("C-2", "lane-4")];
    expect(calculateProgress(children, lanes)).toBe(1);
  });

  it("Dropレーンの子は分母から除外する", () => {
    const children = [
      child("C-1", "lane-4"),
      child("C-2", "lane-5"),
      child("C-3", "lane-2"),
    ];
    expect(calculateProgress(children, lanes)).toBe(0.5);
  });

  it("全子アイテムがDropの場合は0を返す", () => {
    const children = [child("C-1", "lane-5"), child("C-2", "lane-5")];
    expect(calculateProgress(children, lanes)).toBe(0);
  });
});
