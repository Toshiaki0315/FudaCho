import type { ChildItem } from "../domain/childItem";
import { displayName } from "../domain/itemName";
import type { Lane } from "../domain/lane";
import type { ParentItem } from "../domain/parentItem";
import {
  calculateProgress,
  childProgressCounts,
  startedChildCount,
} from "../domain/progress";
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
  const { done, total } = childProgressCounts(children_, lanes);
  // 親はPBLに留まるため、子がSBLを出たことを親カード側で示す
  const started = startedChildCount(children_, lanes);
  return (
    <article className="item-card parent-item-card">
      <span className="item-badge" role="img" aria-label="親アイテム">
        📋
      </span>
      <span className="item-id">
        {displayName(item)}
        {item.ready && <span className="ready-badge">Ready</span>}
        {started > 0 && (
          <span className="started-badge" aria-label="着手済みの子アイテム">
            着手 {started}
          </span>
        )}
      </span>
      <p className="item-summary">{item.summary}</p>
      <LabelChips labels={item.labels} onLabelClick={onLabelClick} />
      <progress max={100} value={percent} />
      <span className="item-progress">
        {percent}%
        {item.childIds.length > 0 && (
          <span className="item-child-count">
            子 {done} / {total}
          </span>
        )}
      </span>
    </article>
  );
}
