import { useState } from "react";
import type { ChildItem } from "../domain/childItem";
import type { ChildItemPatch } from "../store/boardStore";

interface ChildItemDetailProps {
  item: ChildItem;
  /** 親から引き継ぐラベル（読み取り専用で表示する） */
  parentLabels: string[];
  /** 現在所属するレーンの表示名（読み取り専用。移動はD&Dで行う） */
  laneName: string;
  onSave: (patch: ChildItemPatch) => void;
  onClose: () => void;
}

export function ChildItemDetail({
  item,
  parentLabels,
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
      description,
      assignee,
      estimatedHours: estimatedHours === "" ? null : Number(estimatedHours),
      actualHours: actualHours === "" ? null : Number(actualHours),
      startDate,
      endDate,
      comments,
      labels,
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
          <span className="item-parent-id">親: {item.parentId ?? "なし"}</span>
          <span className="item-status">{laneName}</span>
        </header>
        <div className="item-detail-body">
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
            <input
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          <section className="labels-section">
            <p className="comments-title">ラベル</p>
            {parentLabels.length > 0 && (
              <ul
                className="labels-list inherited"
                aria-label="親から引き継いだラベル"
              >
                {parentLabels.map((label) => (
                  <li key={label} className="label-chip-editable inherited">
                    {label}
                  </li>
                ))}
              </ul>
            )}
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
