import { create } from "zustand";
import {
  createChildItem,
  type ChildItem,
  type CreateChildItemInput,
} from "../domain/childItem";
import {
  createEmptyLaneOrder,
  insertIntoLane,
  moveToLane,
  reorderWithinLane,
  type LaneOrder,
} from "../domain/laneOrder";
import {
  createParentItem,
  type CreateParentItemInput,
  type ParentItem,
} from "../domain/parentItem";
import {
  createDefaultSettings,
  type Settings,
  type Status,
} from "../domain/settings";
import { changeStatus } from "../domain/statusChange";
import { resolveDragEnd } from "../components/dnd";

type AddParentInput = Omit<CreateParentItemInput, "id">;
type AddChildInput = Omit<CreateChildItemInput, "id">;
/** 詳細ビューから編集できるフィールド。ID・ステータス・親子関係は対象外。 */
export type ParentItemPatch = Partial<
  Omit<ParentItem, "id" | "status" | "childIds">
>;
export type ChildItemPatch = Partial<
  Omit<ChildItem, "id" | "status" | "parentId">
>;

interface BoardState {
  settings: Settings;
  parents: Record<string, ParentItem>;
  children: Record<string, ChildItem>;
  laneOrder: LaneOrder;
  nextParentNumber: number;
  nextChildNumber: number;
  addParent: (input: AddParentInput) => string;
  addChild: (input: AddChildInput) => string;
  updateParent: (itemId: string, patch: ParentItemPatch) => void;
  updateChild: (itemId: string, patch: ChildItemPatch) => void;
  moveItem: (itemId: string, toStatus: Status, index?: number) => void;
  reorderLane: (status: Status, fromIndex: number, toIndex: number) => void;
  handleDragEnd: (activeId: string, overId: string | null) => void;
  dropItem: (itemId: string) => void;
  reset: () => void;
}

function initialState() {
  return {
    settings: createDefaultSettings(),
    parents: {} as Record<string, ParentItem>,
    children: {} as Record<string, ChildItem>,
    laneOrder: createEmptyLaneOrder(),
    nextParentNumber: 1,
    nextChildNumber: 1,
  };
}

export const useBoardStore = create<BoardState>((set, get) => ({
  ...initialState(),

  addParent(input) {
    const id = `P-${get().nextParentNumber}`;
    const parent = createParentItem({ ...input, id });
    set((state) => ({
      parents: { ...state.parents, [id]: parent },
      laneOrder: insertIntoLane(state.laneOrder, parent.status, id),
      nextParentNumber: state.nextParentNumber + 1,
    }));
    return id;
  },

  addChild(input) {
    const parent = get().parents[input.parentId];
    if (!parent) {
      throw new Error(`親アイテム ${input.parentId} が見つかりません`);
    }
    const id = `C-${get().nextChildNumber}`;
    const child = createChildItem({ ...input, id });
    set((state) => ({
      children: { ...state.children, [id]: child },
      parents: {
        ...state.parents,
        [parent.id]: { ...parent, childIds: [...parent.childIds, id] },
      },
      laneOrder: insertIntoLane(state.laneOrder, child.status, id),
      nextChildNumber: state.nextChildNumber + 1,
    }));
    return id;
  },

  updateParent(itemId, patch) {
    const current = get().parents[itemId];
    if (!current) {
      throw new Error(`親アイテム ${itemId} が見つかりません`);
    }
    // createParentItemを通してバリデーションを再適用する
    const updated = createParentItem({
      ...current,
      ...patch,
      id: current.id,
      status: current.status,
      childIds: current.childIds,
    });
    set((state) => ({ parents: { ...state.parents, [itemId]: updated } }));
  },

  updateChild(itemId, patch) {
    const current = get().children[itemId];
    if (!current) {
      throw new Error(`子アイテム ${itemId} が見つかりません`);
    }
    const updated = createChildItem({
      ...current,
      ...patch,
      id: current.id,
      status: current.status,
      parentId: current.parentId,
    });
    set((state) => ({ children: { ...state.children, [itemId]: updated } }));
  },

  moveItem(itemId, toStatus, index) {
    const { parents, children } = get();
    if (!parents[itemId] && !children[itemId]) {
      throw new Error(`アイテム ${itemId} が見つかりません`);
    }
    set((state) => {
      const laneOrder = moveToLane(state.laneOrder, itemId, toStatus, index);
      if (state.parents[itemId]) {
        return {
          laneOrder,
          parents: {
            ...state.parents,
            [itemId]: changeStatus(state.parents[itemId], toStatus),
          },
        };
      }
      return {
        laneOrder,
        children: {
          ...state.children,
          [itemId]: changeStatus(state.children[itemId], toStatus),
        },
      };
    });
  },

  reorderLane(status, fromIndex, toIndex) {
    set((state) => ({
      laneOrder: reorderWithinLane(state.laneOrder, status, fromIndex, toIndex),
    }));
  },

  handleDragEnd(activeId, overId) {
    const action = resolveDragEnd(get().laneOrder, activeId, overId);
    if (action === null) {
      return;
    }
    if (action.type === "move") {
      get().moveItem(activeId, action.toStatus, action.index);
    } else {
      get().reorderLane(action.status, action.fromIndex, action.toIndex);
    }
  },

  dropItem(itemId) {
    get().moveItem(itemId, "Dropped");
  },

  reset() {
    set(initialState());
  },
}));
