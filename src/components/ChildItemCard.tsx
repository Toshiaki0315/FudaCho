import type { ChildItem } from "../domain/childItem";
import { displayName } from "../domain/itemName";
import { LabelChips } from "./LabelChips";

interface ChildItemCardProps {
  item: ChildItem;
  /** 表示する実効ラベル（親のラベル + 独自ラベル）。省略時は独自ラベルのみ */
  labels?: string[];
  onLabelClick?: (label: string) => void;
}

export function ChildItemCard({
  item,
  labels,
  onLabelClick,
}: ChildItemCardProps) {
  return (
    <article className="item-card child-item-card">
      <span className="item-badge" role="img" aria-label="子アイテム">
        📝
      </span>
      <span className="item-id">{displayName(item)}</span>
      <p className="item-summary">{item.description}</p>
      <LabelChips labels={labels ?? item.labels} onLabelClick={onLabelClick} />
    </article>
  );
}
