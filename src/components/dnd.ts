import type { LaneOrder } from "../domain/laneOrder";
import { ALL_STATUSES, type Status } from "../domain/settings";

export type DragEndAction =
  | { type: "move"; toStatus: Status; index?: number }
  | { type: "reorder"; status: Status; fromIndex: number; toIndex: number };

function isStatus(value: string): value is Status {
  return (ALL_STATUSES as readonly string[]).includes(value);
}

function laneOf(order: LaneOrder, itemId: string): Status | null {
  for (const status of ALL_STATUSES) {
    if (order[status].includes(itemId)) {
      return status;
    }
  }
  return null;
}

/**
 * D&D終了時のドラッグ元とドロップ先から、ボードへ適用する操作を決定する。
 * ドロップ先はレーンID（ステータス）またはアイテムIDのいずれか。
 */
export function resolveDragEnd(
  order: LaneOrder,
  activeId: string,
  overId: string | null,
): DragEndAction | null {
  if (overId === null || overId === activeId) {
    return null;
  }
  const fromStatus = laneOf(order, activeId);
  if (fromStatus === null) {
    return null;
  }

  if (isStatus(overId)) {
    if (overId === fromStatus) {
      return null;
    }
    return { type: "move", toStatus: overId };
  }

  const toStatus = laneOf(order, overId);
  // ドロップ先がレーンにもアイテムにも該当しない防御分岐
  /* v8 ignore next 3 */
  if (toStatus === null) {
    return null;
  }
  const overIndex = order[toStatus].indexOf(overId);
  if (toStatus === fromStatus) {
    return {
      type: "reorder",
      status: fromStatus,
      fromIndex: order[fromStatus].indexOf(activeId),
      toIndex: overIndex,
    };
  }
  return { type: "move", toStatus, index: overIndex };
}
