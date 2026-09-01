import type { Lane } from "./lane";

interface HasLane {
  laneId: string;
}

/** アイテムを別レーンへ移動した新しいオブジェクトを返す（イミュータブル）。 */
export function changeLane<T extends HasLane>(item: T, toLaneId: string): T {
  return { ...item, laneId: toLaneId };
}

/** Dropは削除ではなく、Dropレーンにいる状態として扱う。 */
export function isDropped(item: HasLane, lanes: readonly Lane[]): boolean {
  return lanes.find((lane) => lane.id === item.laneId)?.role === "drop";
}
