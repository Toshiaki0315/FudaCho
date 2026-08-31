import type { ReactNode } from "react";
import type { LaneConfig, Status } from "../domain/settings";

interface KanbanBoardProps {
  lanes: LaneConfig[];
  laneContent?: (status: Status) => ReactNode;
  onAddItem?: () => void;
}

export function KanbanBoard({
  lanes,
  laneContent,
  onAddItem,
}: KanbanBoardProps) {
  return (
    <div className="kanban-board">
      {lanes.map((lane, index) => (
        <section
          key={lane.status}
          className="kanban-lane"
          aria-label={lane.displayName}
        >
          <h2>{lane.displayName}</h2>
          {index === 0 && onAddItem && (
            <button
              type="button"
              className="add-item-button"
              onClick={onAddItem}
            >
              ＋新規作成
            </button>
          )}
          {laneContent?.(lane.status)}
        </section>
      ))}
    </div>
  );
}
