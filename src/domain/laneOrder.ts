/** レーンごとの優先順位（先頭ほど高い）を、レーンID→アイテムID配列で保持する。 */
export type LaneOrder = Record<string, string[]>;

export function createEmptyLaneOrder(laneIds: readonly string[]): LaneOrder {
  const order: LaneOrder = {};
  for (const laneId of laneIds) {
    order[laneId] = [];
  }
  return order;
}

function findLaneOf(order: LaneOrder, itemId: string): string | null {
  for (const laneId of Object.keys(order)) {
    if (order[laneId].includes(itemId)) {
      return laneId;
    }
  }
  return null;
}

function assertLaneExists(order: LaneOrder, laneId: string): void {
  if (!(laneId in order)) {
    throw new Error(`レーン ${laneId} が見つかりません`);
  }
}

export function insertIntoLane(
  order: LaneOrder,
  laneId: string,
  itemId: string,
  index?: number,
): LaneOrder {
  assertLaneExists(order, laneId);
  if (findLaneOf(order, itemId) !== null) {
    throw new Error(`アイテム ${itemId} は既にレーンに存在します`);
  }
  const lane = [...order[laneId]];
  lane.splice(index ?? lane.length, 0, itemId);
  return { ...order, [laneId]: lane };
}

export function reorderWithinLane(
  order: LaneOrder,
  laneId: string,
  fromIndex: number,
  toIndex: number,
): LaneOrder {
  assertLaneExists(order, laneId);
  const lane = [...order[laneId]];
  const isValidIndex = (i: number) => i >= 0 && i < lane.length;
  if (!isValidIndex(fromIndex) || !isValidIndex(toIndex)) {
    throw new Error(
      `インデックスが範囲外です (from: ${fromIndex}, to: ${toIndex}, レーン内件数: ${lane.length})`,
    );
  }
  const [moved] = lane.splice(fromIndex, 1);
  lane.splice(toIndex, 0, moved);
  return { ...order, [laneId]: lane };
}

export function moveToLane(
  order: LaneOrder,
  itemId: string,
  toLaneId: string,
  index?: number,
): LaneOrder {
  assertLaneExists(order, toLaneId);
  if (findLaneOf(order, itemId) === null) {
    throw new Error(`アイテム ${itemId} がレーンに見つかりません`);
  }
  const removed = removeFromLanes(order, itemId);
  return insertIntoLane(removed, toLaneId, itemId, index);
}

export function removeFromLanes(order: LaneOrder, itemId: string): LaneOrder {
  const laneId = findLaneOf(order, itemId);
  if (laneId === null) {
    return order;
  }
  return {
    ...order,
    [laneId]: order[laneId].filter((id) => id !== itemId),
  };
}
