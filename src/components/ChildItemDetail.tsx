import { useState } from "react";
import type { ChildItem } from "../domain/childItem";
import type { ChildItemPatch } from "../store/boardStore";

interface ChildItemDetailProps {
  item: ChildItem;
  /** 現在所属するレーンの表示名（読み取り専用。移動はD&Dで行う） */
  laneName: string;
  onSave: (patch: ChildItemPatch) => void;
  onClose: () => void;
}

export function ChildItemDetail({
  item,
  laneName,
  onSave,
  onClose,
}: ChildItemDetailProps) {
  const [description, setDescription] = useState(item.description);
  const [assignee, setAssignee] = useState(item.assignee);
  const [estimatedHours, setEstimatedHours] = useState(
    item.estimatedHours === null ? "" : String(item.estimatedHours),
  );
  const [actualHours, setActualHours] = useState(
    item.actualHours === null ? "" : String(item.actualHours),
  );
  const [startDate, setStartDate] = useState(item.startDate);
  const [endDate, setEndDate] = useState(item.endDate);

  const handleSave = () => {
    onSave({
      description,
      assignee,
      estimatedHours: estimatedHours === "" ? null : Number(estimatedHours),
      actualHours: actualHours === "" ? null : Number(actualHours),
      startDate,
      endDate,
    });
  };

  return (
    <div className="modal-backdrop">
      <div
        role="dialog"
        aria-label={`${item.id} の詳細`}
        className="item-detail"
      >
        <header className="item-detail-header">
          <span className="item-id">{item.id}</span>
          <span className="item-parent-id">親: {item.parentId}</span>
          <span className="item-status">{laneName}</span>
        </header>
        <label>
          作業内容
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          担当者
          <input
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          />
        </label>
        <label>
          見積時間
          <input
            type="number"
            min={0}
            step={0.5}
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
          />
        </label>
        <label>
          実績時間
          <input
            type="number"
            min={0}
            step={0.5}
            value={actualHours}
            onChange={(e) => setActualHours(e.target.value)}
          />
        </label>
        <label>
          開始日
          <input
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label>
          終了日
          <input value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <footer className="item-detail-footer">
          <button type="button" onClick={onClose}>
            キャンセル
          </button>
          <button type="button" onClick={handleSave}>
            保存
          </button>
        </footer>
      </div>
    </div>
  );
}
