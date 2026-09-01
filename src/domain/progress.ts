import type { ChildItem } from "./childItem";
import type { Lane } from "./lane";

/**
 * 子アイテムの完了数と総数。
 * Closeレーンの子を完了、Dropレーンの子を総数から除外として数える。
 */
export function childProgressCounts(
  children: readonly ChildItem[],
  lanes: readonly Lane[],
): { done: number; total: number } {
  const roleById = new Map(lanes.map((lane) => [lane.id, lane.role]));
  const active = children.filter(
    (child) => roleById.get(child.laneId) !== "drop",
  );
  const done = active.filter((child) => roleById.get(child.laneId) === "close");
  return { done: done.length, total: active.length };
}

/** 進捗率 = Closeレーンの子アイテム数 ÷ 子アイテム総数（Drop除外）。 */
export function calculateProgress(
  children: readonly ChildItem[],
  lanes: readonly Lane[],
): number {
  const { done, total } = childProgressCounts(children, lanes);
  if (total === 0) {
    return 0;
  }
  return done / total;
}
