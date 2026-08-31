import type { ReactNode } from "react";
import type { LaneConfig, Status } from "../domain/settings";

interface KanbanBoardProps {
  lanes: LaneConfig[];
  laneContent?: (status: Status) => ReactNode;
}

export function KanbanBoard({ lanes, laneContent }: KanbanBoardProps) {
  return (
    <div className="kanban-board">
      {lanes.map((lane) => (
        <section
          key={lane.status}
          className="kanban-lane"
          aria-label={lane.displayName}
        >
          <h2>{lane.displayName}</h2>
          {laneContent?.(lane.status)}
        </section>
      ))}
    </div>
  );
}
