import type { ReactNode } from "react";
import type { Lane } from "../domain/lane";

interface KanbanBoardProps {
  lanes: Lane[];
  laneContent?: (laneId: string) => ReactNode;
  onAddItem?: () => void;
  /** レーンIDごとの現在のアイテム件数（ヘッダーのWIP表示に使用） */
  laneCounts?: Record<string, number>;
}

function LaneCount({ lane, count }: { lane: Lane; count: number }) {
  if (lane.wipLimit === null) {
    return <span className="lane-count">{count}</span>;
  }
  const exceeded = count > lane.wipLimit;
  return (
    <span className={exceeded ? "lane-count wip-exceeded" : "lane-count"}>
      {count} / {lane.wipLimit}
    </span>
  );
}

export function KanbanBoard({
  lanes,
  laneContent,
  onAddItem,
  laneCounts,
}: KanbanBoardProps) {
  return (
    <div className="kanban-board">
      {lanes.map((lane) => (
        <section key={lane.id} className="kanban-lane" aria-label={lane.name}>
          <h2>
            {lane.name}
            {laneCounts && (
              <LaneCount lane={lane} count={laneCounts[lane.id] ?? 0} />
            )}
          </h2>
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
