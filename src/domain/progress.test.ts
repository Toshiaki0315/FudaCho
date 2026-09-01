import { describe, expect, it } from "vitest";
import { createChildItem } from "./childItem";
import { createDefaultLanes } from "./lane";
import { calculateProgress } from "./progress";

// デフォルトレーン: lane-1=未着手, lane-2=作業中, lane-3=完了, lane-4=クローズ, lane-5=中断
const lanes = createDefaultLanes();

function child(id: string, laneId: string) {
  return createChildItem({
    id,
    parentId: "P-1",
    description: `作業${id}`,
    laneId,
  });
}

describe("calculateProgress", () => {
  it("子アイテムがない場合は0を返す", () => {
    expect(calculateProgress([], lanes)).toBe(0);
  });

  it("全子アイテムが未着手の場合は0を返す", () => {
    const children = [child("C-1", "lane-1"), child("C-2", "lane-1")];
    expect(calculateProgress(children, lanes)).toBe(0);
  });

  it("半分が完了レーンの場合は0.5を返す", () => {
    const children = [
      child("C-1", "lane-3"),
      child("C-2", "lane-1"),
      child("C-3", "lane-3"),
      child("C-4", "lane-2"),
    ];
    expect(calculateProgress(children, lanes)).toBe(0.5);
  });

  it("全子アイテムが完了レーンの場合は1を返す", () => {
    const children = [child("C-1", "lane-3"), child("C-2", "lane-3")];
    expect(calculateProgress(children, lanes)).toBe(1);
  });

  it("countsAsDoneのレーン（クローズ）も完了として扱う", () => {
    const children = [child("C-1", "lane-4"), child("C-2", "lane-1")];
    expect(calculateProgress(children, lanes)).toBe(0.5);
  });

  it("進捗除外レーン（中断）の子アイテムは分母から除外する", () => {
    const children = [
      child("C-1", "lane-3"),
      child("C-2", "lane-5"),
      child("C-3", "lane-1"),
    ];
    // 中断を除いた 2 件中 1 件完了
    expect(calculateProgress(children, lanes)).toBe(0.5);
  });

  it("全子アイテムが進捗除外レーンの場合は0を返す", () => {
    const children = [child("C-1", "lane-5"), child("C-2", "lane-5")];
    expect(calculateProgress(children, lanes)).toBe(0);
  });
});
