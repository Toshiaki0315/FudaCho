import type { ChildItem } from "../domain/childItem";
import { displayName } from "../domain/itemName";
import { LabelChips } from "./LabelChips";

interface ChildItemCardProps {
  item: ChildItem;
  /** 表示する実効ラベル（親のラベル + 独自ラベル）。省略時は独自ラベルのみ */
  labels?: string[];
  /** 親アイテムの表示名。省略時は親IDで代用する */
  parentName?: string;
  onLabelClick?: (label: string) => void;
}

export function ChildItemCard({
  item,
  labels,
  parentName,
  onLabelClick,
}: ChildItemCardProps) {
  // SBLには親ありの子と親なしの子が並ぶため、カード上で区別できるようにする
  const hasParent = item.parentId !== null;
  return (
    <article className="item-card child-item-card">
      <span className="item-badge" role="img" aria-label="子アイテム">
        📝
      </span>
      <span className="item-id">{displayName(item)}</span>
      <span className={hasParent ? "child-parent" : "child-parent standalone"}>
        {hasParent ? `親: ${parentName ?? item.parentId}` : "親なし"}
      </span>
      <p className="item-summary">{item.description}</p>
      <LabelChips labels={labels ?? item.labels} onLabelClick={onLabelClick} />
    </article>
  );
}
