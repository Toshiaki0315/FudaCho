import type { ChildItem } from "./childItem";
import type { Lane } from "./lane";

/**
 * 進捗率 = 完了扱いレーン（countsAsDone）の子アイテム数 ÷ 子アイテム総数。
 * 進捗除外レーン（excludedFromProgress）の子アイテムは分母から除外する。
 */
export function calculateProgress(
  children: readonly ChildItem[],
  lanes: readonly Lane[],
): number {
  const laneById = new Map(lanes.map((lane) => [lane.id, lane]));
  const active = children.filter(
    (child) => !laneById.get(child.laneId)?.excludedFromProgress,
  );
  if (active.length === 0) {
    return 0;
  }
  const completed = active.filter(
    (child) => laneById.get(child.laneId)?.countsAsDone,
  );
  return completed.length / active.length;
}
