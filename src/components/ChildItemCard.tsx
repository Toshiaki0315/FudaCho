import type { ChildItem } from "../domain/childItem";

interface ChildItemCardProps {
  item: ChildItem;
}

export function ChildItemCard({ item }: ChildItemCardProps) {
  return (
    <article className="item-card child-item-card">
      <span className="item-badge" role="img" aria-label="子アイテム">
        📝
      </span>
      <span className="item-id">{item.id}</span>
      <p className="item-summary">{item.description}</p>
    </article>
  );
}
