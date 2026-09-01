import type { ReactNode } from "react";
import type { Lane } from "../domain/lane";

interface KanbanBoardProps {
  lanes: Lane[];
  laneContent?: (laneId: string) => ReactNode;
  onAddItem?: () => void;
}

export function KanbanBoard({
  lanes,
  laneContent,
  onAddItem,
}: KanbanBoardProps) {
  return (
    <div className="kanban-board">
      {lanes.map((lane) => (
        <section key={lane.id} className="kanban-lane" aria-label={lane.name}>
          <h2>{lane.name}</h2>
          {lane.isDefaultEntry && onAddItem && (
            <button
              type="button"
              className="add-item-button"
              onClick={onAddItem}
            >
              ＋新規作成
            </button>
          )}
          {laneContent?.(lane.id)}
        </section>
      ))}
    </div>
  );
}
