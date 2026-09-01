import { useState } from "react";
import {
  FIBONACCI_SIZES,
  type ParentItem,
  type Size,
} from "../domain/parentItem";
import type { ParentItemPatch } from "../store/boardStore";

interface ParentItemDetailProps {
  item: ParentItem;
  /** 現在所属するレーンの表示名（読み取り専用。移動はD&Dで行う） */
  laneName: string;
  onSave: (patch: ParentItemPatch) => void;
  onClose: () => void;
  onAddChild?: () => void;
}

export function ParentItemDetail({
  item,
  laneName,
  onSave,
  onClose,
  onAddChild,
}: ParentItemDetailProps) {
  const [summary, setSummary] = useState(item.summary);
  const [size, setSize] = useState<Size>(item.size);
  const [assignee, setAssignee] = useState(item.assignee);
  const [reason, setReason] = useState(item.reason);
  const [plannedStartDate, setPlannedStartDate] = useState(
    item.plannedStartDate,
  );
  const [plannedEndDate, setPlannedEndDate] = useState(item.plannedEndDate);
  const [notes, setNotes] = useState(item.notes);
  const [comments, setComments] = useState(item.comments);
  const [newComment, setNewComment] = useState("");

  const addComment = () => {
    const trimmed = newComment.trim();
    if (trimmed === "") {
      return;
    }
    setComments([...comments, trimmed]);
    setNewComment("");
  };

  const handleSave = () => {
    onSave({
      summary,
      size,
      assignee,
      reason,
      plannedStartDate,
      plannedEndDate,
      notes,
      comments,
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
          <span className="item-status">{laneName}</span>
        </header>
        <div className="item-detail-body">
          <label>
            概要
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
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
            開始予定日
            <input
              value={plannedStartDate}
              onChange={(e) => setPlannedStartDate(e.target.value)}
            />
          </label>
          <label>
            終了予定日
            <input
              value={plannedEndDate}
              onChange={(e) => setPlannedEndDate(e.target.value)}
            />
          </label>
          <label>
            備考
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <section className="comments-section">
            <p className="comments-title">コメント</p>
            {comments.length > 0 && (
              <ul className="comments-list" aria-label="コメント">
                {comments.map((comment, index) => (
                  <li key={index}>{comment}</li>
                ))}
              </ul>
            )}
            <label>
              新しいコメント
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="add-comment-button"
              onClick={addComment}
            >
              コメントを追加
            </button>
          </section>
        </div>
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
