import type { ChildItem } from "./childItem";
import type { Status } from "./settings";

const COMPLETED_STATUSES: readonly Status[] = ["Done", "Close"];

/**
 * 進捗率 = 完了（Done / Close）した子アイテム数 ÷ 子アイテム総数。
 * Dropped の子アイテムは対象外の作業として分母から除外する。
 */
export function calculateProgress(children: readonly ChildItem[]): number {
  const active = children.filter((c) => c.status !== "Dropped");
  if (active.length === 0) {
    return 0;
  }
  const completed = active.filter((c) => COMPLETED_STATUSES.includes(c.status));
  return completed.length / active.length;
}
