import { create } from "zustand";
import {
  createChildItem,
  type ChildItem,
  type CreateChildItemInput,
} from "../domain/childItem";
import {
  canAcceptMore,
  findLaneByRole,
  validateLanes,
  wipLimitReachedMessage,
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
  addChild: (input: AddChildInput) => string;
  updateSettings: (settings: Settings) => void;
  updateParent: (itemId: string, patch: ParentItemPatch) => void;
  updateChild: (itemId: string, patch: ChildItemPatch) => void;
  /** 移動できない場合はその理由、できる場合はnullを返す */
  moveBlockReason: (itemId: string, toLaneId: string) => string | null;
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
    // タイトル導入前の保存データとの互換: title を補完する
    const parents = Object.fromEntries(
      Object.entries(persisted.parents).map(([id, parent]) => [
        id,
        { ...parent, title: parent.title ?? "" },
      ]),
    );
    const children = Object.fromEntries(
      Object.entries(persisted.children).map(([id, child]) => [
        id,
        { ...child, title: child.title ?? "" },
      ]),
    );
    set(selectPersisted({ ...persisted, parents, children }));
  },

  addParent(input) {
    const pblLane = findLaneByRole(get().settings.lanes, "pbl");
    const id = `P-${get().nextParentNumber}`;
    const parent = createParentItem({ ...input, id, laneId: pblLane.id });
    set((state) => ({
      parents: { ...state.parents, [id]: parent },
      laneOrder: insertIntoLane(state.laneOrder, parent.laneId, id),
      nextParentNumber: state.nextParentNumber + 1,
    }));
    return id;
  },

  addChild(input) {
    const parentId = input.parentId ?? null;
    const parent = parentId !== null ? get().parents[parentId] : null;
    if (parentId !== null && !parent) {
      throw new Error(`親アイテム ${parentId} が見つかりません`);
    }
    const sblLane = findLaneByRole(get().settings.lanes, "sbl");
    const id = `C-${get().nextChildNumber}`;
    const child = createChildItem({ ...input, id, laneId: sblLane.id });
    set((state) => ({
      children: { ...state.children, [id]: child },
      parents: parent
        ? {
            ...state.parents,
            [parent.id]: { ...parent, childIds: [...parent.childIds, id] },
          }
        : state.parents,
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

  moveBlockReason(itemId, toLaneId) {
    const { parents, children, settings, laneOrder } = get();
    const parent = parents[itemId];
    const child = children[itemId];
    const item = parent ?? child;
    const toLane = settings.lanes.find((lane) => lane.id === toLaneId);
    if (!item || !toLane) {
      return null;
    }
    if (item.laneId === toLaneId) {
      // 同一レーン内の位置変更は常に可能
      return null;
    }
    if (parent) {
      // PBLへの移動はClose/Dropからの復帰。それ以外の中間レーンには置けない
      if (
        toLane.role !== "close" &&
        toLane.role !== "drop" &&
        toLane.role !== "pbl"
      ) {
        return "親アイテムはPBL・Close・Dropレーンへのみ移動できます";
      }
      if (toLane.role === "close") {
        const laneRoleById = new Map(
          settings.lanes.map((lane) => [lane.id, lane.role]),
        );
        const hasOpenChild = parent.childIds.some((childId) => {
          const role = laneRoleById.get(children[childId].laneId);
          return role !== "close" && role !== "drop";
        });
        if (hasOpenChild) {
          return "未完了の子アイテムがあるためCloseできません";
        }
      }
    } else {
      if (toLane.role === "pbl") {
        return "子アイテムはPBLレーンへ移動できません";
      }
      // 親を持つ子は、親がReadyになるまでSBLに留め置く。
      // ただしDrop（中断）は着手ではないため妨げない（削除も同様に制限しない）。
      const fromLane = settings.lanes.find((lane) => lane.id === child.laneId);
      if (
        fromLane?.role === "sbl" &&
        toLane.role !== "drop" &&
        child.parentId !== null &&
        !parents[child.parentId].ready
      ) {
        return "親アイテムがReadyになるまでSBLから移動できません";
      }
    }
    if (!canAcceptMore(toLane, laneOrder[toLaneId].length)) {
      return wipLimitReachedMessage(toLane);
    }
    return null;
  },

  moveItem(itemId, toLaneId, index) {
    const { parents, children } = get();
    if (!parents[itemId] && !children[itemId]) {
      throw new Error(`アイテム ${itemId} が見つかりません`);
    }
    const reason = get().moveBlockReason(itemId, toLaneId);
    if (reason !== null) {
      throw new Error(reason);
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
    const { laneOrder } = get();
    const action = resolveDragEnd(laneOrder, activeId, overId);
    if (action === null) {
      return;
    }
    if (action.type === "move") {
      // 親アイテムのDropレーンへのD&Dは、コンテキストメニューのDropと同じく子へ波及させる
      const toLane = get().settings.lanes.find(
        (lane) => lane.id === action.toLaneId,
      );
      if (get().parents[activeId] && toLane?.role === "drop") {
        get().dropItem(activeId);
        return;
      }
      // 移動できないD&Dは適用せず、理由を通知する（ドラッグ操作を失敗にしない）
      const reason = get().moveBlockReason(activeId, action.toLaneId);
      if (reason !== null) {
        set({ notice: reason });
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
    const dropLane = findLaneByRole(settings.lanes, "drop");
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
      set({ notice: wipLimitReachedMessage(dropLane) });
      return;
    }
    for (const id of targets) {
      get().moveItem(id, dropLane.id);
    }
    set({ notice: null });
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
      if (child && child.parentId !== null) {
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
    const orderedChildren = [
      ...orderedParents.flatMap((parent) =>
        parent.childIds.map((childId) => children[childId]),
      ),
      ...settings.lanes.flatMap((lane) =>
        laneOrder[lane.id]
          .filter((id) => children[id]?.parentId === null)
          .map((id) => children[id]),
      ),
    ];
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
    for (const child of snapshot.children) {
      if (child.parentId === null) {
        children[child.id] = child;
        laneOrder = insertIntoLane(laneOrder, child.laneId, child.id);
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
