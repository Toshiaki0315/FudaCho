interface ItemContextMenuProps {
  /** クリックされた位置（ビューポート座標） */
  x: number;
  y: number;
  /** 親アイテムのメニューにだけ絞り込み項目を出す */
  isParent: boolean;
  /** すでにこの親で絞り込み中か（表示する文言が変わる） */
  isFiltered: boolean;
  /** Close/Dropレーンのアイテムには Drop を出さない */
  showDrop: boolean;
  /** DropレーンがWIP制限に達している間は押せない */
  canDrop: boolean;
  /** 子アイテムを追加できるか（親がReadyのときのみ。親詳細の追加ボタンと同条件） */
  canAddChild: boolean;
  onShowDetail: () => void;
  onAddChild: () => void;
  onToggleParentFilter: () => void;
  onDrop: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/** カードの右クリックで開く操作メニュー。背景クリックで閉じる。 */
export function ItemContextMenu({
  x,
  y,
  isParent,
  isFiltered,
  showDrop,
  canDrop,
  canAddChild,
  onShowDetail,
  onAddChild,
  onToggleParentFilter,
  onDrop,
  onDelete,
  onClose,
}: ItemContextMenuProps) {
  return (
    <>
      <div
        className="context-menu-backdrop"
        aria-label="メニューを閉じる"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div role="menu" className="context-menu" style={{ left: x, top: y }}>
        <button type="button" role="menuitem" onClick={onShowDetail}>
          詳細表示
        </button>
        {isParent && (
          <button
            type="button"
            role="menuitem"
            disabled={!canAddChild}
            title={
              canAddChild
                ? undefined
                : "子アイテムの追加はReadyにしてから行えます"
            }
            onClick={onAddChild}
          >
            ＋子アイテムを追加
          </button>
        )}
        {isParent && (
          <button type="button" role="menuitem" onClick={onToggleParentFilter}>
            {isFiltered ? "絞り込みを解除" : "この親で絞り込み"}
          </button>
        )}
        {showDrop && (
          <button
            type="button"
            role="menuitem"
            disabled={!canDrop}
            onClick={onDrop}
          >
            Drop
          </button>
        )}
        <button
          type="button"
          role="menuitem"
          className="danger"
          onClick={onDelete}
        >
          削除
        </button>
      </div>
    </>
  );
}
