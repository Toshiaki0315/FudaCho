import { DndContext, useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { ReactNode } from "react";
import type { Status } from "../domain/settings";
import { useBoardStore } from "../store/boardStore";
import { ChildItemCard } from "./ChildItemCard";
import { composeDragHandler } from "./dnd";
import { KanbanBoard } from "./KanbanBoard";
import { ParentItemCard } from "./ParentItemCard";
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
  const settings = useBoardStore((state) => state.settings);
  const parents = useBoardStore((state) => state.parents);
  const children = useBoardStore((state) => state.children);
  const laneOrder = useBoardStore((state) => state.laneOrder);
  const handleDragEnd = useBoardStore((state) => state.handleDragEnd);
  const addParent = useBoardStore((state) => state.addParent);

  const renderCard = (itemId: string) => {
    const parent = parents[itemId];
    if (parent) {
      const childItems = parent.childIds.map((childId) => children[childId]);
      return <ParentItemCard item={parent} children_={childItems} />;
    }
    return <ChildItemCard item={children[itemId]} />;
  };

  const laneContent = (status: Status) => (
    <SortableContext
      items={laneOrder[status]}
      strategy={verticalListSortingStrategy}
    >
      <LaneDropArea status={status}>
        {laneOrder[status].map((itemId) => (
          <SortableCard key={itemId} id={itemId}>
            {renderCard(itemId)}
          </SortableCard>
        ))}
      </LaneDropArea>
    </SortableContext>
  );

  return (
    <DndContext onDragEnd={composeDragHandler(handleDragEnd)}>
      <KanbanBoard
        lanes={settings.lanes}
        laneContent={laneContent}
        onAddItem={() => addParent({ summary: "新規アイテム" })}
      />
    </DndContext>
  );
}
