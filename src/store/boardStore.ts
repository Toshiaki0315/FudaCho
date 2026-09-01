import { create } from "zustand";
import {
  createChildItem,
  type ChildItem,
  type CreateChildItemInput,
} from "../domain/childItem";
import {
  canAcceptMore,
  findDefaultEntryLane,
  findDropLane,
  validateLanes,
} from "../domain/lane";
import { changeLane } from "../domain/laneChange";
import {
  createEmptyLaneOrder,
  insertIntoLane,
  moveToLane,
  removeFromLanes,
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

/** SQLite等に保存するボードの状態一式。 */
export interface PersistedBoard {
  settings: Settings;
  parents: Record<string, ParentItem>;
  children: Record<string, ChildItem>;
  laneOrder: LaneOrder;
  nextParentNumber: number;
  nextChildNumber: number;
}

export function selectPersisted(state: PersistedBoard): PersistedBoard {
  return {
    settings: state.settings,
    parents: state.parents,
    children: state.children,
    laneOrder: state.laneOrder,
    nextParentNumber: state.nextParentNumber,
    nextChildNumber: state.nextChildNumber,
  };
}

interface BoardState extends PersistedBoard {
  /** 操作がブロックされた時などにUIへ表示する一時的な通知（永続化しない） */
  notice: string | null;
  clearNotice: () => void;
  hydrate: (persisted: PersistedBoard) => void;
  addParent: (input: AddParentInput) => string;
  addChild: (input: AddChildInput & { parentId: string }) => string;
  updateSettings: (settings: Settings) => void;
  updateParent: (itemId: string, patch: ParentItemPatch) => void;
  updateChild: (itemId: string, patch: ChildItemPatch) => void;
  moveItem: (itemId: string, toLaneId: string, index?: number) => void;
  reorderLane: (laneId: string, fromIndex: number, toIndex: number) => void;
  handleDragEnd: (activeId: string, overId: string | null) => void;
  dropItem: (itemId: string) => void;
  deleteItem: (itemId: string) => void;
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
    notice: null as string | null,
  };
}

export const useBoardStore = create<BoardState>((set, get) => ({
  ...initialState(),

  hydrate(persisted) {
    validateLanes(persisted.settings.lanes);
    // 機能追加前に保存されたデータとの互換: comments / labels を補完する
    const parents = Object.fromEntries(
      Object.entries(persisted.parents).map(([id, parent]) => [
        id,
        { ...parent, labels: parent.labels ?? [] },
      ]),
    );
    const children = Object.fromEntries(
      Object.entries(persisted.children).map(([id, child]) => [
        id,
        {
          ...child,
          comments: child.comments ?? [],
          labels: child.labels ?? [],
        },
      ]),
    );
    set(selectPersisted({ ...persisted, parents, children }));
  },

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
    const { parents, children, settings, laneOrder } = get();
    if (!parents[itemId] && !children[itemId]) {
      throw new Error(`アイテム ${itemId} が見つかりません`);
    }
    const toLane = settings.lanes.find((lane) => lane.id === toLaneId);
    const isLaneChange = !laneOrder[toLaneId]?.includes(itemId);
    if (
      toLane &&
      isLaneChange &&
      !canAcceptMore(toLane, laneOrder[toLaneId].length)
    ) {
      throw new Error(
        `レーン「${toLane.name}」はWIP制限（${toLane.wipLimit}）に達しています`,
      );
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
    const { laneOrder, settings } = get();
    const action = resolveDragEnd(laneOrder, activeId, overId);
    if (action === null) {
      return;
    }
    if (action.type === "move") {
      // WIP制限に達したレーンへのD&Dは移動せず、通知メッセージで知らせる
      const toLane = settings.lanes.find((lane) => lane.id === action.toLaneId);
      if (toLane && !canAcceptMore(toLane, laneOrder[action.toLaneId].length)) {
        set({
          notice: `レーン「${toLane.name}」はWIP制限（${toLane.wipLimit}）に達しているため移動できません`,
        });
        return;
      }
      get().moveItem(activeId, action.toLaneId, action.index);
      set({ notice: null });
    } else {
      get().reorderLane(action.laneId, action.fromIndex, action.toIndex);
    }
  },

  clearNotice() {
    set({ notice: null });
  },

  dropItem(itemId) {
    const { settings, parents, children, laneOrder } = get();
    const dropLane = findDropLane(settings.lanes);
    if (dropLane === null) {
      set({ notice: "Drop先（進捗除外）のレーンがありません" });
      return;
    }
    // 親アイテムのDropは子アイテムにも波及する（Drop済みのものは除く）
    const candidateIds = [itemId, ...(parents[itemId]?.childIds ?? [])];
    const targets = candidateIds.filter((id) => {
      const item = parents[id] ?? children[id];
      return item.laneId !== dropLane.id;
    });
    if (targets.length === 0) {
      return;
    }
    if (
      dropLane.wipLimit !== null &&
      laneOrder[dropLane.id].length + targets.length > dropLane.wipLimit
    ) {
      set({
        notice: `レーン「${dropLane.name}」はWIP制限（${dropLane.wipLimit}）に達しているため移動できません`,
      });
      return;
    }
    for (const id of targets) {
      get().moveItem(id, dropLane.id);
    }
  },

  deleteItem(itemId) {
    const { parents, children } = get();
    if (!parents[itemId] && !children[itemId]) {
      throw new Error(`アイテム ${itemId} が見つかりません`);
    }
    set((state) => {
      // 親を削除する場合は子アイテムもすべて削除する
      const idsToDelete = [itemId, ...(state.parents[itemId]?.childIds ?? [])];
      const nextParents = { ...state.parents };
      const nextChildren = { ...state.children };
      let laneOrder = state.laneOrder;
      for (const id of idsToDelete) {
        delete nextParents[id];
        delete nextChildren[id];
        laneOrder = removeFromLanes(laneOrder, id);
      }
      // 子アイテムの削除は親のchildIdsからも取り除く
      const child = state.children[itemId];
      if (child) {
        const parent = nextParents[child.parentId];
        nextParents[child.parentId] = {
          ...parent,
          childIds: parent.childIds.filter((id) => id !== itemId),
        };
      }
      return { parents: nextParents, children: nextChildren, laneOrder };
    });
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
    const lanes = snapshot.lanes ?? settings.lanes;
    validateLanes(lanes);
    const parents: Record<string, ParentItem> = {};
    const children: Record<string, ChildItem> = {};
    let laneOrder = createEmptyLaneOrder(lanes.map((l) => l.id));
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
    set({
      settings: { projectName: snapshot.projectName, lanes },
      parents,
      children,
      laneOrder,
      nextParentNumber: maxNumber(Object.keys(parents), "P") + 1,
      nextChildNumber: maxNumber(Object.keys(children), "C") + 1,
    });
  },

  reset() {
    set(initialState());
  },
}));
