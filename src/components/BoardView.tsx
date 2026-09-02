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
import { canAcceptMore, findLaneByRole } from "../domain/lane";
import { mergeLabels } from "../domain/labels";
import { useBoardStore } from "../store/boardStore";
import { ChildItemCard } from "./ChildItemCard";
import { ChildItemDetail } from "./ChildItemDetail";
import { composeDragHandler } from "./dnd";
import { KanbanBoard } from "./KanbanBoard";
import { ParentItemCard } from "./ParentItemCard";
import { ParentItemDetail } from "./ParentItemDetail";
import { SortableCard } from "./SortableCard";

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
  // ラベル絞り込み（AND条件）。カードのラベルチップをクリックで追加/解除する
  const [labelFilters, setLabelFilters] = useState<string[]>([]);
  // 親アイテム絞り込み。親カードの右クリックメニューで設定し、その親と子だけを表示する
  const [parentFilter, setParentFilter] = useState<string | null>(null);
  // 右クリックで開くコンテキストメニュー
  const [contextMenu, setContextMenu] = useState<{
    itemId: string;
    x: number;
    y: number;
  } | null>(null);

  const toggleLabelFilter = (label: string) => {
    setLabelFilters((current) =>
      current.includes(label)
        ? current.filter((l) => l !== label)
        : [...current, label],
    );
  };

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

  const laneCounts = Object.fromEntries(
    settings.lanes.map((lane) => [lane.id, laneOrder[lane.id].length]),
  );
  const dropLane = findLaneByRole(settings.lanes, "drop");
  const canDrop = canAcceptMore(dropLane, laneCounts[dropLane.id]);

  // 子アイテムの実効ラベル = 親のラベル + 独自ラベル（親の変更が自動で引き継がれる）
  const effectiveLabelsOf = (childId: string) => {
    const child = children[childId];
    const parentLabels =
      child.parentId !== null ? parents[child.parentId].labels : [];
    return mergeLabels(parentLabels, child.labels);
  };

  // 絞り込み対象の親が削除された場合は絞り込みを無効化する
  const activeParentFilter =
    parentFilter !== null && parents[parentFilter] !== undefined
      ? parentFilter
      : null;

  const matchesParentFilter = (itemId: string) => {
    if (activeParentFilter === null || itemId === activeParentFilter) {
      return true;
    }
    return children[itemId]?.parentId === activeParentFilter;
  };

  const matchesLabelFilter = (itemId: string) => {
    if (labelFilters.length === 0) {
      return true;
    }
    const parent = parents[itemId];
    const itemLabels = parent ? parent.labels : effectiveLabelsOf(itemId);
    return labelFilters.every((label) => itemLabels.includes(label));
  };

  const matchesFilter = (itemId: string) =>
    matchesParentFilter(itemId) && matchesLabelFilter(itemId);

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
      <ChildItemCard item={children[itemId]} />
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
  const filterParent =
    activeParentFilter !== null ? parents[activeParentFilter] : null;
  const filterParentName =
    filterParent !== null
      ? filterParent.title !== ""
        ? filterParent.title
        : filterParent.id
      : "";

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
      {(labelFilters.length > 0 || activeParentFilter !== null) && (
        <div className="label-filter-bar">
          <span>絞り込み中:</span>
          {activeParentFilter !== null && (
            <button
              type="button"
              className="label-chip parent-filter-chip"
              aria-label={`親アイテム「${filterParentName}」の絞り込みを解除`}
              onClick={() => setParentFilter(null)}
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
          <button
            type="button"
            onClick={() => {
              setLabelFilters([]);
              setParentFilter(null);
            }}
          >
            すべて解除
          </button>
        </div>
      )}
      <KanbanBoard
        lanes={settings.lanes}
        laneContent={laneContent}
        laneCounts={laneCounts}
        onAddParent={() => addParent({ summary: "新規アイテム" })}
        onAddChild={() => addChild({ description: "新規子アイテム" })}
      />
      <DragOverlay dropAnimation={null}>
        {activeId !== null && (
          <div className="drag-overlay-card">{overlayCard(activeId)}</div>
        )}
      </DragOverlay>
      {contextMenu !== null && (
        <>
          <div
            className="context-menu-backdrop"
            aria-label="メニューを閉じる"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            role="menu"
            className="context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setSelectedId(contextMenu.itemId);
                setContextMenu(null);
              }}
            >
              詳細表示
            </button>
            {parents[contextMenu.itemId] !== undefined && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setParentFilter(
                    parentFilter === contextMenu.itemId
                      ? null
                      : contextMenu.itemId,
                  );
                  setContextMenu(null);
                }}
              >
                {parentFilter === contextMenu.itemId
                  ? "絞り込みを解除"
                  : "この親で絞り込み"}
              </button>
            )}
            {showDropMenu && (
              <button
                type="button"
                role="menuitem"
                disabled={!canDrop}
                onClick={() => {
                  dropItem(contextMenu.itemId);
                  setContextMenu(null);
                }}
              >
                Drop
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              className="danger"
              onClick={() => {
                deleteItem(contextMenu.itemId);
                setContextMenu(null);
              }}
            >
              削除
            </button>
          </div>
        </>
      )}
      {notice !== null && (
        <div role="alert" className="board-notice">
          <span>{notice}</span>
          <button type="button" onClick={clearNotice}>
            閉じる
          </button>
        </div>
      )}
      {selectedParent && (
        <ParentItemDetail
          item={selectedParent}
          laneName={laneOf(selectedParent.laneId).name}
          children_={selectedParent.childIds.map(
            (childId) => children[childId],
          )}
          laneNameOf={(laneId) => laneOf(laneId).name}
          onOpenChild={(childId) => setSelectedId(childId)}
          onSave={(patch) => {
            updateParent(selectedParent.id, patch);
            closeDetail();
          }}
          onClose={closeDetail}
          onAddChild={() => {
            addChild({
              parentId: selectedParent.id,
              description: "新規子アイテム",
            });
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
          parentName={
            selectedChild.parentId !== null
              ? parents[selectedChild.parentId].title !== ""
                ? parents[selectedChild.parentId].title
                : parents[selectedChild.parentId].id
              : "なし"
          }
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
