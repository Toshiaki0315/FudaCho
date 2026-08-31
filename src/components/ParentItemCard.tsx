import type { ChildItem } from "../domain/childItem";
import type { ParentItem } from "../domain/parentItem";
import { calculateProgress } from "../domain/progress";

interface ParentItemCardProps {
  item: ParentItem;
  /** カード上での進捗率計算に使う、この親に属する子アイテム一覧 */
  children_: ChildItem[];
}

export function ParentItemCard({ item, children_ }: ParentItemCardProps) {
  const percent = Math.round(calculateProgress(children_) * 100);
  return (
    <article className="item-card parent-item-card">
      <span className="item-id">{item.id}</span>
      <p className="item-summary">{item.summary}</p>
      <progress max={100} value={percent} />
      <span className="item-progress">{percent}%</span>
    </article>
  );
}
