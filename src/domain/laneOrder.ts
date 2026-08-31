import { ALL_STATUSES, type Status } from "./settings";

/** レーンごとの優先順位（先頭ほど高い）を、アイテムIDの配列で保持する。 */
export type LaneOrder = Record<Status, string[]>;

export function createEmptyLaneOrder(): LaneOrder {
  const order = {} as LaneOrder;
  for (const status of ALL_STATUSES) {
    order[status] = [];
  }
  return order;
}

function findLaneOf(order: LaneOrder, itemId: string): Status | null {
  for (const status of ALL_STATUSES) {
    if (order[status].includes(itemId)) {
      return status;
    }
  }
  return null;
}

export function insertIntoLane(
  order: LaneOrder,
  status: Status,
  itemId: string,
  index?: number,
): LaneOrder {
  if (findLaneOf(order, itemId) !== null) {
    throw new Error(`アイテム ${itemId} は既にレーンに存在します`);
  }
  const lane = [...order[status]];
  lane.splice(index ?? lane.length, 0, itemId);
  return { ...order, [status]: lane };
}

export function reorderWithinLane(
  order: LaneOrder,
  status: Status,
  fromIndex: number,
  toIndex: number,
): LaneOrder {
  const lane = [...order[status]];
  const isValidIndex = (i: number) => i >= 0 && i < lane.length;
  if (!isValidIndex(fromIndex) || !isValidIndex(toIndex)) {
    throw new Error(
      `インデックスが範囲外です (from: ${fromIndex}, to: ${toIndex}, レーン内件数: ${lane.length})`,
    );
  }
  const [moved] = lane.splice(fromIndex, 1);
  lane.splice(toIndex, 0, moved);
  return { ...order, [status]: lane };
}

export function moveToLane(
  order: LaneOrder,
  itemId: string,
  toStatus: Status,
  index?: number,
): LaneOrder {
  if (findLaneOf(order, itemId) === null) {
    throw new Error(`アイテム ${itemId} がレーンに見つかりません`);
  }
  const removed = removeFromLanes(order, itemId);
  return insertIntoLane(removed, toStatus, itemId, index);
}

export function removeFromLanes(order: LaneOrder, itemId: string): LaneOrder {
  const lane = findLaneOf(order, itemId);
  if (lane === null) {
    return order;
  }
  return { ...order, [lane]: order[lane].filter((id) => id !== itemId) };
}
