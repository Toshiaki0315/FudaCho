import type { DragEndEvent } from "@dnd-kit/core";
import type { LaneOrder } from "../domain/laneOrder";

export type DragEndAction =
  | { type: "move"; toLaneId: string; index?: number }
  | { type: "reorder"; laneId: string; fromIndex: number; toIndex: number };

function laneOf(order: LaneOrder, itemId: string): string | null {
  for (const laneId of Object.keys(order)) {
    if (order[laneId].includes(itemId)) {
      return laneId;
    }
  }
  return null;
}

/** dnd-kitのDragEndEventを、ID組での適用関数呼び出しへ変換するハンドラを作る。 */
export function composeDragHandler(
  apply: (activeId: string, overId: string | null) => void,
): (event: DragEndEvent) => void {
  return (event) => {
    apply(String(event.active.id), event.over ? String(event.over.id) : null);
  };
}

/**
 * D&D終了時のドラッグ元とドロップ先から、ボードへ適用する操作を決定する。
 * ドロップ先はレーンIDまたはアイテムIDのいずれか。
 */
export function resolveDragEnd(
  order: LaneOrder,
  activeId: string,
  overId: string | null,
): DragEndAction | null {
  if (overId === null || overId === activeId) {
    return null;
  }
  const fromLaneId = laneOf(order, activeId);
  if (fromLaneId === null) {
    return null;
  }

  if (overId in order) {
    if (overId === fromLaneId) {
      return null;
    }
    return { type: "move", toLaneId: overId };
  }

  const toLaneId = laneOf(order, overId);
  if (toLaneId === null) {
    return null;
  }
  const overIndex = order[toLaneId].indexOf(overId);
  if (toLaneId === fromLaneId) {
    return {
      type: "reorder",
      laneId: fromLaneId,
      fromIndex: order[fromLaneId].indexOf(activeId),
      toIndex: overIndex,
    };
  }
  return { type: "move", toLaneId, index: overIndex };
}
