import type { ChildItem } from "../domain/childItem";
import type { Lane } from "../domain/lane";
import type { ParentItem } from "../domain/parentItem";
import { calculateProgress } from "../domain/progress";
import { LabelChips } from "./LabelChips";

interface ParentItemCardProps {
  item: ParentItem;
  /** カード上での進捗率計算に使う、この親に属する子アイテム一覧 */
  children_: ChildItem[];
  /** 進捗率の完了/除外判定に使うレーン定義 */
  lanes: Lane[];
  onLabelClick?: (label: string) => void;
}

export function ParentItemCard({
  item,
  children_,
  lanes,
  onLabelClick,
}: ParentItemCardProps) {
  const percent = Math.round(calculateProgress(children_, lanes) * 100);
  return (
    <article className="item-card parent-item-card">
      <span className="item-badge" role="img" aria-label="親アイテム">
        📋
      </span>
      <span className="item-id">{item.id}</span>
      <p className="item-summary">{item.summary}</p>
      <LabelChips labels={item.labels} onLabelClick={onLabelClick} />
      <progress max={100} value={percent} />
      <span className="item-progress">{percent}%</span>
    </article>
  );
}
