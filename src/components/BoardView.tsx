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
import { canAcceptMore, findDropLane, type Lane } from "../domain/lane";
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
  const notice = useBoardStore((state) => state.notice);
  const clearNotice = useBoardStore((state) => state.clearNotice);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // ドラッグ中のアイテムID。DragOverlayに複製カードを表示するために保持する
  const [activeId, setActiveId] = useState<string | null>(null);
  // ラベル絞り込み（カードのラベルチップをクリックで設定）
  const [labelFilter, setLabelFilter] = useState<string | null>(null);

  // 同じラベルをもう一度クリックしたら絞り込みを解除、別のラベルなら切り替える
  const toggleLabelFilter = (label: string) => {
    setLabelFilter((current) => (current === label ? null : label));
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
  const laneNameOf = (laneId: string) =>
    settings.lanes.find((lane) => lane.id === laneId)!.name;

  const laneCounts = Object.fromEntries(
    settings.lanes.map((lane) => [lane.id, laneOrder[lane.id].length]),
  );
  const dropLane = findDropLane(settings.lanes);
  const canDrop =
    dropLane !== null && canAcceptMore(dropLane, laneCounts[dropLane.id]);

  // 子アイテムの実効ラベル = 親のラベル + 独自ラベル（親の変更が自動で引き継がれる）
  const effectiveLabelsOf = (childId: string) => {
    const child = children[childId];
    return mergeLabels(parents[child.parentId].labels, child.labels);
  };

  const matchesFilter = (itemId: string) => {
    if (labelFilter === null) {
      return true;
    }
    const parent = parents[itemId];
    if (parent) {
      return parent.labels.includes(labelFilter);
    }
    return effectiveLabelsOf(itemId).includes(labelFilter);
  };

  const renderCard = (itemId: string, lane: Lane) => {
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
      <div onDoubleClick={() => setSelectedId(itemId)}>
        {card}
        {lane.hasDropAction && (
          <button
            type="button"
            className="drop-item-button"
            disabled={!canDrop}
            onClick={() => dropItem(itemId)}
          >
            Drop
          </button>
        )}
      </div>
    );
  };

  const laneContent = (laneId: string) => {
    const lane = settings.lanes.find((l) => l.id === laneId)!;
    const visibleIds = laneOrder[laneId].filter(matchesFilter);
    return (
      <SortableContext
        items={visibleIds}
        strategy={verticalListSortingStrategy}
      >
        <LaneDropArea laneId={laneId}>
          {visibleIds.map((itemId) => (
            <SortableCard key={itemId} id={itemId}>
              {renderCard(itemId, lane)}
            </SortableCard>
          ))}
        </LaneDropArea>
      </SortableContext>
    );
  };

  const selectedParent = selectedId ? parents[selectedId] : undefined;
  const selectedChild = selectedId ? children[selectedId] : undefined;
  const closeDetail = () => setSelectedId(null);

  // ドラッグ中にポインタへ追従させる複製カード（Dropボタン等の操作は含めない）
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
      {labelFilter !== null && (
        <div className="label-filter-bar">
          <span>ラベル「{labelFilter}」で絞り込み中</span>
          <button type="button" onClick={() => setLabelFilter(null)}>
            解除
          </button>
        </div>
      )}
      <KanbanBoard
        lanes={settings.lanes}
        laneContent={laneContent}
        laneCounts={laneCounts}
        onAddItem={() => addParent({ summary: "新規アイテム" })}
      />
      <DragOverlay dropAnimation={null}>
        {activeId !== null && (
          <div className="drag-overlay-card">{overlayCard(activeId)}</div>
        )}
      </DragOverlay>
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
          laneName={laneNameOf(selectedParent.laneId)}
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
          parentLabels={parents[selectedChild.parentId].labels}
          laneName={laneNameOf(selectedChild.laneId)}
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
