interface LabelChipsProps {
  labels: string[];
  /** チップのクリックで呼ばれる（カンバン上ではラベル絞り込みに使う） */
  onLabelClick?: (label: string) => void;
}

export function LabelChips({ labels, onLabelClick }: LabelChipsProps) {
  if (labels.length === 0) {
    return null;
  }
  return (
    <span className="item-labels">
      {labels.map((label) => (
        <button
          key={label}
          type="button"
          className="label-chip"
          onClick={() => onLabelClick?.(label)}
        >
          {label}
        </button>
      ))}
    </span>
  );
}
