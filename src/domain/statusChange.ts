import type { Status } from "./settings";

interface HasStatus {
  status: Status;
}

export function changeStatus<T extends HasStatus>(
  item: T,
  newStatus: Status,
): T {
  return { ...item, status: newStatus };
}

/** Drop は削除ではなく、データを保持したまま Dropped 状態へ移行する。 */
export function dropItem<T extends HasStatus>(item: T): T {
  return changeStatus(item, "Dropped");
}

export function isDropped(item: HasStatus): boolean {
  return item.status === "Dropped";
}
