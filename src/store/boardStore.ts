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

type AddParentInput = Omit<CreateParentItemInput, "id">;
type AddChildInput = Omit<CreateChildItemInput, "id">;

interface BoardState {
  settings: Settings;
  parents: Record<string, ParentItem>;
  children: Record<string, ChildItem>;
  laneOrder: LaneOrder;
  nextParentNumber: number;
  nextChildNumber: number;
  addParent: (input: AddParentInput) => string;
  addChild: (input: AddChildInput) => string;
  moveItem: (itemId: string, toStatus: Status, index?: number) => void;
  reorderLane: (status: Status, fromIndex: number, toIndex: number) => void;
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

  dropItem(itemId) {
    get().moveItem(itemId, "Dropped");
  },

  reset() {
    set(initialState());
  },
}));
