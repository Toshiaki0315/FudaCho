import { useState } from "react";
import {
  FIBONACCI_SIZES,
  type ParentItem,
  type Size,
} from "../domain/parentItem";
import type { ParentItemPatch } from "../store/boardStore";

interface ParentItemDetailProps {
  item: ParentItem;
  onSave: (patch: ParentItemPatch) => void;
  onClose: () => void;
  onAddChild?: () => void;
}

export function ParentItemDetail({
  item,
  onSave,
  onClose,
  onAddChild,
}: ParentItemDetailProps) {
  const [summary, setSummary] = useState(item.summary);
  const [size, setSize] = useState<Size>(item.size);
  const [assignee, setAssignee] = useState(item.assignee);
  const [reason, setReason] = useState(item.reason);
  const [schedule, setSchedule] = useState(item.schedule);
  const [notes, setNotes] = useState(item.notes);
  const [commentsText, setCommentsText] = useState(item.comments.join("\n"));

  const handleSave = () => {
    onSave({
      summary,
      size,
      assignee,
      reason,
      schedule,
      notes,
      comments: commentsText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== ""),
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
          <span className="item-status">{item.status}</span>
        </header>
        <label>
          概要
          <input value={summary} onChange={(e) => setSummary(e.target.value)} />
        </label>
        <label>
          サイズ
          <select
            value={String(size)}
            onChange={(e) => {
              const raw = e.target.value;
              setSize(raw === "♾️" ? "♾️" : (Number(raw) as Size));
            }}
          >
            {FIBONACCI_SIZES.map((s) => (
              <option key={String(s)} value={String(s)}>
                {String(s)}
              </option>
            ))}
          </select>
        </label>
        <label>
          担当者
          <input
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          />
        </label>
        <label>
          理由
          <input value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <label>
          日程
          <input
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
          />
        </label>
        <label>
          備考
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <label>
          コメント
          <textarea
            value={commentsText}
            onChange={(e) => setCommentsText(e.target.value)}
          />
        </label>
        <footer className="item-detail-footer">
          {onAddChild && (
            <button type="button" onClick={onAddChild}>
              ＋子アイテムを追加
            </button>
          )}
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
