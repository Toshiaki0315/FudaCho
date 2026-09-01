import { useState } from "react";
import {
  FIBONACCI_SIZES,
  isReadyEligible,
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
  const [title, setTitle] = useState(item.title);
  const [summary, setSummary] = useState(item.summary);
  const [size, setSize] = useState<Size>(item.size);
  const [assignee, setAssignee] = useState(item.assignee);
  const [reason, setReason] = useState(item.reason);
  const [plannedStartDate, setPlannedStartDate] = useState(
    item.plannedStartDate,
  );
  const [plannedEndDate, setPlannedEndDate] = useState(item.plannedEndDate);
  const [notes, setNotes] = useState(item.notes);
  const [labels, setLabels] = useState(item.labels);
  const [newLabel, setNewLabel] = useState("");

  const addLabel = () => {
    const trimmed = newLabel.trim();
    if (
      trimmed === "" ||
      /[;,()（）]/.test(trimmed) ||
      labels.includes(trimmed)
    ) {
      return;
    }
    setLabels([...labels, trimmed]);
    setNewLabel("");
  };

  const removeLabel = (label: string) => {
    setLabels(labels.filter((l) => l !== label));
  };

  const [comments, setComments] = useState(item.comments);
  const [newComment, setNewComment] = useState("");
  const [ready, setReady] = useState(item.ready);

  // Ready条件（概要・理由は編集中の値で判定）。条件を満たさない場合は自動的にNot Readyになる
  const readyEligible = isReadyEligible({ summary, reason });
  const effectiveReady = ready && readyEligible;

  const addComment = () => {
    const trimmed = newComment.trim();
    if (trimmed === "") {
      return;
    }
    setComments([...comments, trimmed]);
    setNewComment("");
  };

  // field-sizing非対応の環境（WKWebView等）向けに、入力内容に合わせて高さを伸ばす
  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleSave = () => {
    onSave({
      title,
      summary,
      size,
      assignee,
      reason,
      plannedStartDate,
      plannedEndDate,
      notes,
      comments,
      labels,
      ready: effectiveReady,
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
          <div className="ready-section">
            <label className="ready-row">
              <input
                type="checkbox"
                checked={effectiveReady}
                disabled={!readyEligible}
                onChange={(e) => setReady(e.target.checked)}
              />
              Ready
            </label>
            {!readyEligible && (
              <p className="ready-hint">
                Readyにするには、概要と理由が記載されている必要があります
              </p>
            )}
          </div>
          <label>
            タイトル
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            概要
            <textarea
              rows={2}
              className="autogrow"
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                autoGrow(e.currentTarget);
              }}
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
            <textarea
              rows={2}
              className="autogrow"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                autoGrow(e.currentTarget);
              }}
            />
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
          <section className="labels-section">
            <p className="comments-title">ラベル</p>
            {labels.length > 0 && (
              <ul className="labels-list" aria-label="ラベル">
                {labels.map((label) => (
                  <li key={label} className="label-chip-editable">
                    {label}
                    <button
                      type="button"
                      aria-label={`ラベル「${label}」を削除`}
                      onClick={() => removeLabel(label)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="label-add-row">
              <input
                aria-label="新しいラベル"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
              <button type="button" onClick={addLabel}>
                ラベルを追加
              </button>
            </div>
          </section>
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
            <button
              type="button"
              disabled={!effectiveReady}
              title={
                effectiveReady
                  ? undefined
                  : "子アイテムの追加はReadyにしてから行えます"
              }
              onClick={onAddChild}
            >
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
