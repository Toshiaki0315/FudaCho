import {
  DndContext,
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
import { useState, type ReactNode } from "react";
import type { Lane } from "../domain/lane";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // アイテムのあるレーンは削除できない（updateSettingsが保証）ため、レーンは必ず見つかる
  const laneNameOf = (laneId: string) =>
    settings.lanes.find((lane) => lane.id === laneId)!.name;

  const renderCard = (itemId: string, lane: Lane) => {
    const parent = parents[itemId];
    const card = parent ? (
      <ParentItemCard
        item={parent}
        children_={parent.childIds.map((childId) => children[childId])}
        lanes={settings.lanes}
      />
    ) : (
      <ChildItemCard item={children[itemId]} />
    );
    return (
      <div onDoubleClick={() => setSelectedId(itemId)}>
        {card}
        {lane.hasDropAction && (
          <button
            type="button"
            className="drop-item-button"
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
    return (
      <SortableContext
        items={laneOrder[laneId]}
        strategy={verticalListSortingStrategy}
      >
        <LaneDropArea laneId={laneId}>
          {laneOrder[laneId].map((itemId) => (
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

  return (
    <DndContext sensors={sensors} onDragEnd={composeDragHandler(handleDragEnd)}>
      <KanbanBoard
        lanes={settings.lanes}
        laneContent={laneContent}
        onAddItem={() => addParent({ summary: "新規アイテム" })}
      />
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
