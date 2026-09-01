import { create } from "zustand";
import {
  createChildItem,
  type ChildItem,
  type CreateChildItemInput,
} from "../domain/childItem";
import {
  findDefaultEntryLane,
  findDropLane,
  validateLanes,
} from "../domain/lane";
import { changeLane } from "../domain/laneChange";
import {
  createEmptyLaneOrder,
  insertIntoLane,
  moveToLane,
  reorderWithinLane,
  type LaneOrder,
} from "../domain/laneOrder";
import { generateMarkdown, parseMarkdown } from "../domain/markdown";
import {
  createParentItem,
  type CreateParentItemInput,
  type ParentItem,
} from "../domain/parentItem";
import { createDefaultSettings, type Settings } from "../domain/settings";
import { resolveDragEnd } from "../components/dnd";

type AddParentInput = Omit<CreateParentItemInput, "id" | "laneId">;
type AddChildInput = Omit<CreateChildItemInput, "id" | "laneId">;
/** 詳細ビューから編集できるフィールド。ID・レーン・親子関係は対象外。 */
export type ParentItemPatch = Partial<
  Omit<ParentItem, "id" | "laneId" | "childIds">
>;
export type ChildItemPatch = Partial<
  Omit<ChildItem, "id" | "laneId" | "parentId">
>;

interface BoardState {
  settings: Settings;
  parents: Record<string, ParentItem>;
  children: Record<string, ChildItem>;
  laneOrder: LaneOrder;
  nextParentNumber: number;
  nextChildNumber: number;
  addParent: (input: AddParentInput) => string;
  addChild: (input: AddChildInput & { parentId: string }) => string;
  updateSettings: (settings: Settings) => void;
  updateParent: (itemId: string, patch: ParentItemPatch) => void;
  updateChild: (itemId: string, patch: ChildItemPatch) => void;
  moveItem: (itemId: string, toLaneId: string, index?: number) => void;
  reorderLane: (laneId: string, fromIndex: number, toIndex: number) => void;
  handleDragEnd: (activeId: string, overId: string | null) => void;
  dropItem: (itemId: string) => void;
  exportMarkdown: () => string;
  importMarkdown: (markdown: string) => void;
  reset: () => void;
}

function initialState() {
  const settings = createDefaultSettings();
  return {
    settings,
    parents: {} as Record<string, ParentItem>,
    children: {} as Record<string, ChildItem>,
    laneOrder: createEmptyLaneOrder(settings.lanes.map((lane) => lane.id)),
    nextParentNumber: 1,
    nextChildNumber: 1,
  };
}

export const useBoardStore = create<BoardState>((set, get) => ({
  ...initialState(),

  addParent(input) {
    const entryLane = findDefaultEntryLane(get().settings.lanes);
    const id = `P-${get().nextParentNumber}`;
    const parent = createParentItem({ ...input, id, laneId: entryLane.id });
    set((state) => ({
      parents: { ...state.parents, [id]: parent },
      laneOrder: insertIntoLane(state.laneOrder, parent.laneId, id),
      nextParentNumber: state.nextParentNumber + 1,
    }));
    return id;
  },

  addChild(input) {
    const parent = get().parents[input.parentId];
    if (!parent) {
      throw new Error(`親アイテム ${input.parentId} が見つかりません`);
    }
    const entryLane = findDefaultEntryLane(get().settings.lanes);
    const id = `C-${get().nextChildNumber}`;
    const child = createChildItem({ ...input, id, laneId: entryLane.id });
    set((state) => ({
      children: { ...state.children, [id]: child },
      parents: {
        ...state.parents,
        [parent.id]: { ...parent, childIds: [...parent.childIds, id] },
      },
      laneOrder: insertIntoLane(state.laneOrder, child.laneId, id),
      nextChildNumber: state.nextChildNumber + 1,
    }));
    return id;
  },

  updateSettings(settings) {
    if (settings.projectName === "") {
      throw new Error("プロジェクト名は必須です");
    }
    validateLanes(settings.lanes);
    const { laneOrder } = get();
    const newLaneIds = new Set(settings.lanes.map((lane) => lane.id));
    for (const laneId of Object.keys(laneOrder)) {
      if (!newLaneIds.has(laneId) && laneOrder[laneId].length > 0) {
        throw new Error(
          `アイテムが残っているレーンは削除できません（レーン: ${laneId}）`,
        );
      }
    }
    const nextOrder: LaneOrder = {};
    for (const lane of settings.lanes) {
      nextOrder[lane.id] = laneOrder[lane.id] ?? [];
    }
    set({ settings, laneOrder: nextOrder });
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
      laneId: current.laneId,
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
      laneId: current.laneId,
      parentId: current.parentId,
    });
    set((state) => ({ children: { ...state.children, [itemId]: updated } }));
  },

  moveItem(itemId, toLaneId, index) {
    const { parents, children } = get();
    if (!parents[itemId] && !children[itemId]) {
      throw new Error(`アイテム ${itemId} が見つかりません`);
    }
    set((state) => {
      const laneOrder = moveToLane(state.laneOrder, itemId, toLaneId, index);
      if (state.parents[itemId]) {
        return {
          laneOrder,
          parents: {
            ...state.parents,
            [itemId]: changeLane(state.parents[itemId], toLaneId),
          },
        };
      }
      return {
        laneOrder,
        children: {
          ...state.children,
          [itemId]: changeLane(state.children[itemId], toLaneId),
        },
      };
    });
  },

  reorderLane(laneId, fromIndex, toIndex) {
    set((state) => ({
      laneOrder: reorderWithinLane(state.laneOrder, laneId, fromIndex, toIndex),
    }));
  },

  handleDragEnd(activeId, overId) {
    const action = resolveDragEnd(get().laneOrder, activeId, overId);
    if (action === null) {
      return;
    }
    if (action.type === "move") {
      get().moveItem(activeId, action.toLaneId, action.index);
    } else {
      get().reorderLane(action.laneId, action.fromIndex, action.toIndex);
    }
  },

  dropItem(itemId) {
    const dropLane = findDropLane(get().settings.lanes);
    if (dropLane === null) {
      throw new Error("Drop先（進捗除外）のレーンがありません");
    }
    get().moveItem(itemId, dropLane.id);
  },

  exportMarkdown() {
    const { settings, parents, children, laneOrder } = get();
    const orderedParents = settings.lanes.flatMap((lane) =>
      laneOrder[lane.id]
        .filter((id) => parents[id] !== undefined)
        .map((id) => parents[id]),
    );
    const orderedChildren = orderedParents.flatMap((parent) =>
      parent.childIds.map((childId) => children[childId]),
    );
    return generateMarkdown(
      {
        projectName: settings.projectName,
        parents: orderedParents,
        children: orderedChildren,
      },
      settings.lanes,
    );
  },

  importMarkdown(markdown) {
    const { settings } = get();
    const snapshot = parseMarkdown(markdown, settings.lanes);
    const parents: Record<string, ParentItem> = {};
    const children: Record<string, ChildItem> = {};
    let laneOrder = createEmptyLaneOrder(settings.lanes.map((l) => l.id));
    const childrenById = new Map(snapshot.children.map((c) => [c.id, c]));
    for (const parent of snapshot.parents) {
      parents[parent.id] = parent;
      laneOrder = insertIntoLane(laneOrder, parent.laneId, parent.id);
      for (const childId of parent.childIds) {
        const child = childrenById.get(childId)!;
        children[childId] = child;
        laneOrder = insertIntoLane(laneOrder, child.laneId, childId);
      }
    }
    const maxNumber = (ids: string[], prefix: string) =>
      ids.reduce((max, id) => {
        const match = id.match(new RegExp(`^${prefix}-(\\d+)$`));
        return match ? Math.max(max, Number(match[1])) : max;
      }, 0);
    set((state) => ({
      settings: { ...state.settings, projectName: snapshot.projectName },
      parents,
      children,
      laneOrder,
      nextParentNumber: maxNumber(Object.keys(parents), "P") + 1,
      nextChildNumber: maxNumber(Object.keys(children), "C") + 1,
    }));
  },

  reset() {
    set(initialState());
  },
}));
