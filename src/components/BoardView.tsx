import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useEffect, useState, type ReactNode } from "react";
import { createChildItem } from "../domain/childItem";
import { displayName } from "../domain/itemName";
import { canAcceptMore, findLaneByRole } from "../domain/lane";
import { createParentItem } from "../domain/parentItem";
import { useBoardStore } from "../store/boardStore";
import { ChildItemCard } from "./ChildItemCard";
import { ChildItemDetail } from "./ChildItemDetail";
import { composeDragHandler } from "./dnd";
import { ItemContextMenu } from "./ItemContextMenu";
import { KanbanBoard } from "./KanbanBoard";
import { ParentItemCard } from "./ParentItemCard";
import { ParentItemDetail } from "./ParentItemDetail";
import { SortableCard } from "./SortableCard";
import { useItemFilters } from "./useItemFilters";

interface LaneDropAreaProps {
  laneId: string;
  children: ReactNode;
}

function LaneDropArea({ laneId, children }: LaneDropAreaProps) {
  const { setNodeRef } = useDroppable({ id: laneId });
  return (
    <div ref={setNodeRef} className="lane-drop-area">
      {children}
    </div>
  );
}

export function BoardView() {
  // クリックやダブルクリックをドラッグ開始と区別するため、5px動くまではドラッグを開始しない
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );
  const settings = useBoardStore((state) => state.settings);
  const parents = useBoardStore((state) => state.parents);
  const children = useBoardStore((state) => state.children);
  const laneOrder = useBoardStore((state) => state.laneOrder);
  const handleDragEnd = useBoardStore((state) => state.handleDragEnd);
  const addParent = useBoardStore((state) => state.addParent);
  const addChild = useBoardStore((state) => state.addChild);
  const updateParent = useBoardStore((state) => state.updateParent);
  const updateChild = useBoardStore((state) => state.updateChild);
  const dropItem = useBoardStore((state) => state.dropItem);
  const deleteItem = useBoardStore((state) => state.deleteItem);
  const notice = useBoardStore((state) => state.notice);
  const clearNotice = useBoardStore((state) => state.clearNotice);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // ドラッグ中のアイテムID。DragOverlayに複製カードを表示するために保持する
  const [activeId, setActiveId] = useState<string | null>(null);
  const {
    labelFilters,
    activeParentFilter,
    isFiltering,
    effectiveLabelsOf,
    toggleLabelFilter,
    toggleParentFilter,
    clearParentFilter,
    clearAll,
    matchesFilter,
  } = useItemFilters(parents, children);
  // 新規作成の下書き。保存するまでストアには載せない
  const [draft, setDraft] = useState<
    { kind: "parent" } | { kind: "child"; parentId: string | null } | null
  >(null);
  // 右クリックで開くコンテキストメニュー
  const [contextMenu, setContextMenu] = useState<{
    itemId: string;
    x: number;
    y: number;
  } | null>(null);

  // 通知は数秒後に自動で消える
  useEffect(() => {
    if (notice === null) {
      return;
    }
    const timer = setTimeout(clearNotice, 4000);
    return () => clearTimeout(timer);
  }, [notice, clearNotice]);

  // アイテムのあるレーンは削除できない（updateSettingsが保証）ため、レーンは必ず見つかる
  const laneOf = (laneId: string) =>
    settings.lanes.find((lane) => lane.id === laneId)!;

  const laneNameOf = (laneId: string) => laneOf(laneId).name;
  const openChild = (childId: string) => setSelectedId(childId);

  // 新規作成ダイアログに渡す下書き。保存されるまでIDは採番しない
  const DRAFT_ID = "draft";
  const draftParent = () =>
    createParentItem({
      id: DRAFT_ID,
      summary: "",
      laneId: findLaneByRole(settings.lanes, "pbl").id,
    });
  const draftChild = (parentId: string | null) =>
    createChildItem({
      id: DRAFT_ID,
      parentId,
      description: "",
      laneId: findLaneByRole(settings.lanes, "sbl").id,
    });

  // 子カードに表示する親の名前（親なしの子ではundefinedのまま）
  const parentNameOf = (childId: string) => {
    const parentId = children[childId].parentId;
    return parentId !== null ? displayName(parents[parentId]) : undefined;
  };

  const laneCounts = Object.fromEntries(
    settings.lanes.map((lane) => [lane.id, laneOrder[lane.id].length]),
  );
  const dropLane = findLaneByRole(settings.lanes, "drop");
  const canDrop = canAcceptMore(dropLane, laneCounts[dropLane.id]);

  const renderCard = (itemId: string) => {
    const parent = parents[itemId];
    const card = parent ? (
      <ParentItemCard
        item={parent}
        children_={parent.childIds.map((childId) => children[childId])}
        lanes={settings.lanes}
        onLabelClick={toggleLabelFilter}
      />
    ) : (
      <ChildItemCard
        item={children[itemId]}
        labels={effectiveLabelsOf(itemId)}
        parentName={parentNameOf(itemId)}
        onLabelClick={toggleLabelFilter}
      />
    );
    return (
      <div
        onDoubleClick={() => setSelectedId(itemId)}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ itemId, x: e.clientX, y: e.clientY });
        }}
      >
        {card}
      </div>
    );
  };

  const laneContent = (laneId: string) => {
    const visibleIds = laneOrder[laneId].filter(matchesFilter);
    return (
      <SortableContext
        items={visibleIds}
        strategy={verticalListSortingStrategy}
      >
        <LaneDropArea laneId={laneId}>
          {visibleIds.map((itemId) => (
            <SortableCard key={itemId} id={itemId}>
              {renderCard(itemId)}
            </SortableCard>
          ))}
        </LaneDropArea>
      </SortableContext>
    );
  };

  const selectedParent = selectedId ? parents[selectedId] : undefined;
  const selectedChild = selectedId ? children[selectedId] : undefined;
  const closeDetail = () => setSelectedId(null);

  // ドラッグ中にポインタへ追従させる複製カード（操作ボタン等は含めない）
  const overlayCard = (itemId: string) => {
    const parent = parents[itemId];
    return parent ? (
      <ParentItemCard
        item={parent}
        children_={parent.childIds.map((childId) => children[childId])}
        lanes={settings.lanes}
      />
    ) : (
      <ChildItemCard
        item={children[itemId]}
        parentName={parentNameOf(itemId)}
      />
    );
  };

  const applyDragEnd = composeDragHandler(handleDragEnd);

  // Close/Dropレーンのアイテムの右クリックメニューにはDropを表示しない
  const contextMenuItem = contextMenu
    ? (parents[contextMenu.itemId] ?? children[contextMenu.itemId])
    : null;
  const contextMenuLaneRole = contextMenuItem
    ? laneOf(contextMenuItem.laneId).role
    : null;
  const showDropMenu =
    contextMenuLaneRole !== null &&
    contextMenuLaneRole !== "close" &&
    contextMenuLaneRole !== "drop";

  // フィルターバーに表示する親の名前（タイトル優先、なければID）
  const filterParentName =
    activeParentFilter !== null ? displayName(parents[activeParentFilter]) : "";

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => setActiveId(String(event.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={(event) => {
        setActiveId(null);
        applyDragEnd(event);
      }}
    >
      {isFiltering && (
        <div className="label-filter-bar">
          <span>絞り込み中:</span>
          {activeParentFilter !== null && (
            <button
              type="button"
              className="label-chip parent-filter-chip"
              aria-label={`親アイテム「${filterParentName}」の絞り込みを解除`}
              onClick={clearParentFilter}
            >
              親: {filterParentName} ✕
            </button>
          )}
          {labelFilters.map((label) => (
            <button
              key={label}
              type="button"
              className="label-chip"
              aria-label={`ラベル「${label}」の絞り込みを解除`}
              onClick={() => toggleLabelFilter(label)}
            >
              {label} ✕
            </button>
          ))}
          <button type="button" onClick={clearAll}>
            すべて解除
          </button>
        </div>
      )}
      <KanbanBoard
        lanes={settings.lanes}
        laneContent={laneContent}
        laneCounts={laneCounts}
        onAddParent={() => setDraft({ kind: "parent" })}
        onAddChild={() => setDraft({ kind: "child", parentId: null })}
      />
      <DragOverlay dropAnimation={null}>
        {activeId !== null && (
          <div className="drag-overlay-card">{overlayCard(activeId)}</div>
        )}
      </DragOverlay>
      {contextMenu !== null && (
        <ItemContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isParent={parents[contextMenu.itemId] !== undefined}
          isFiltered={activeParentFilter === contextMenu.itemId}
          showDrop={showDropMenu}
          canDrop={canDrop}
          canAddChild={parents[contextMenu.itemId]?.ready === true}
          onShowDetail={() => {
            setSelectedId(contextMenu.itemId);
            setContextMenu(null);
          }}
          onAddChild={() => {
            setDraft({ kind: "child", parentId: contextMenu.itemId });
            setContextMenu(null);
          }}
          onToggleParentFilter={() => {
            toggleParentFilter(contextMenu.itemId);
            setContextMenu(null);
          }}
          onDrop={() => {
            dropItem(contextMenu.itemId);
            setContextMenu(null);
          }}
          onDelete={() => {
            deleteItem(contextMenu.itemId);
            setContextMenu(null);
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
      {notice !== null && (
        <div role="alert" className="board-notice">
          <span>{notice}</span>
          <button type="button" onClick={clearNotice}>
            閉じる
          </button>
        </div>
      )}
      {draft?.kind === "parent" && (
        <ParentItemDetail
          isNew
          item={draftParent()}
          laneName={findLaneByRole(settings.lanes, "pbl").name}
          children_={[]}
          laneNameOf={laneNameOf}
          onOpenChild={openChild}
          onSave={(patch) => {
            addParent(patch);
            setDraft(null);
          }}
          onClose={() => setDraft(null)}
        />
      )}
      {draft?.kind === "child" && (
        <ChildItemDetail
          isNew
          item={draftChild(draft.parentId)}
          parentLabels={
            draft.parentId !== null ? parents[draft.parentId].labels : []
          }
          parentName={displayName(
            draft.parentId !== null ? parents[draft.parentId] : null,
          )}
          laneName={findLaneByRole(settings.lanes, "sbl").name}
          onSave={(patch) => {
            addChild({ ...patch, parentId: draft.parentId });
            setDraft(null);
          }}
          onClose={() => setDraft(null)}
        />
      )}
      {selectedParent && (
        <ParentItemDetail
          item={selectedParent}
          laneName={laneOf(selectedParent.laneId).name}
          children_={selectedParent.childIds.map(
            (childId) => children[childId],
          )}
          laneNameOf={laneNameOf}
          onOpenChild={openChild}
          onSave={(patch) => {
            updateParent(selectedParent.id, patch);
            closeDetail();
          }}
          onClose={closeDetail}
          onAddChild={() => {
            setDraft({ kind: "child", parentId: selectedParent.id });
            closeDetail();
          }}
        />
      )}
      {selectedChild && (
        <ChildItemDetail
          item={selectedChild}
          parentLabels={
            selectedChild.parentId !== null
              ? parents[selectedChild.parentId].labels
              : []
          }
          parentName={displayName(
            selectedChild.parentId !== null
              ? parents[selectedChild.parentId]
              : null,
          )}
          laneName={laneOf(selectedChild.laneId).name}
          onSave={(patch) => {
            updateChild(selectedChild.id, patch);
            closeDetail();
          }}
          onClose={closeDetail}
        />
      )}
    </DndContext>
  );
}
