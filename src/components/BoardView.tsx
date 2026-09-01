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
import type { Status } from "../domain/settings";
import { useBoardStore } from "../store/boardStore";
import { ChildItemCard } from "./ChildItemCard";
import { ChildItemDetail } from "./ChildItemDetail";
import { composeDragHandler } from "./dnd";
import { KanbanBoard } from "./KanbanBoard";
import { ParentItemCard } from "./ParentItemCard";
import { ParentItemDetail } from "./ParentItemDetail";
import { SortableCard } from "./SortableCard";

interface LaneDropAreaProps {
  status: Status;
  children: ReactNode;
}

function LaneDropArea({ status, children }: LaneDropAreaProps) {
  const { setNodeRef } = useDroppable({ id: status });
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

  const renderCard = (itemId: string, status: Status) => {
    const parent = parents[itemId];
    const card = parent ? (
      <ParentItemCard
        item={parent}
        children_={parent.childIds.map((childId) => children[childId])}
      />
    ) : (
      <ChildItemCard item={children[itemId]} />
    );
    return (
      <div onDoubleClick={() => setSelectedId(itemId)}>
        {card}
        {status === "InProgress" && (
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

  const selectedParent = selectedId ? parents[selectedId] : undefined;
  const selectedChild = selectedId ? children[selectedId] : undefined;
  const closeDetail = () => setSelectedId(null);

  const laneContent = (status: Status) => (
    <SortableContext
      items={laneOrder[status]}
      strategy={verticalListSortingStrategy}
    >
      <LaneDropArea status={status}>
        {laneOrder[status].map((itemId) => (
          <SortableCard key={itemId} id={itemId}>
            {renderCard(itemId, status)}
          </SortableCard>
        ))}
      </LaneDropArea>
    </SortableContext>
  );

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
