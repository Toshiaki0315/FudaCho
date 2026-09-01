import type { ChildItem } from "./childItem";
import type { Lane } from "./lane";

/**
 * 子アイテムの完了数と総数。
 * 進捗除外レーン（excludedFromProgress）の子アイテムは総数から除外する。
 */
export function childProgressCounts(
  children: readonly ChildItem[],
  lanes: readonly Lane[],
): { done: number; total: number } {
  const laneById = new Map(lanes.map((lane) => [lane.id, lane]));
  const active = children.filter(
    (child) => !laneById.get(child.laneId)?.excludedFromProgress,
  );
  const done = active.filter(
    (child) => laneById.get(child.laneId)?.countsAsDone,
  );
  return { done: done.length, total: active.length };
}

/** 進捗率 = 完了扱いレーン（countsAsDone）の子アイテム数 ÷ 子アイテム総数。 */
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
