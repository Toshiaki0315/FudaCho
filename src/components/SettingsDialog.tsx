import { useState } from "react";
import {
  createLane,
  isFixedRole,
  type Lane,
  type LaneRole,
} from "../domain/lane";
import type { Settings } from "../domain/settings";

interface SettingsDialogProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}

const ROLE_BADGES: Record<Exclude<LaneRole, "free">, string> = {
  pbl: "PBL",
  sbl: "SBL",
  close: "Close",
  drop: "Drop",
};

function nextLaneId(lanes: Lane[]): string {
  const max = lanes.reduce((acc, lane) => {
    const match = lane.id.match(/^lane-(\d+)$/);
    return match ? Math.max(acc, Number(match[1])) : acc;
  }, 0);
  return `lane-${max + 1}`;
}

export function SettingsDialog({
  settings,
  onSave,
  onClose,
}: SettingsDialogProps) {
  const [projectName, setProjectName] = useState(settings.projectName);
  const [lanes, setLanes] = useState<Lane[]>(settings.lanes);
  const [error, setError] = useState<string | null>(null);

  const renameLane = (index: number, name: string) => {
    setLanes(lanes.map((lane, i) => (i === index ? { ...lane, name } : lane)));
  };

  const setWipLimit = (index: number, raw: string) => {
    const wipLimit = raw === "" ? null : Number(raw);
    setLanes(
      lanes.map((lane, i) => (i === index ? { ...lane, wipLimit } : lane)),
    );
  };

  const removeLane = (index: number) => {
    setLanes(lanes.filter((_, i) => i !== index));
  };

  // 自由レーンの範囲: PBL/SBLの後（index 2）から Close の手前まで
  const freeStart = 2;
  const freeEnd = lanes.length - 3;

  const moveLane = (index: number, direction: -1 | 1) => {
    const next = [...lanes];
    const [moved] = next.splice(index, 1);
    next.splice(index + direction, 0, moved);
    setLanes(next);
  };

  const addLane = () => {
    const next = [...lanes];
    // Closeの手前（自由レーンの末尾）に挿入する
    next.splice(
      lanes.length - 2,
      0,
      createLane({ id: nextLaneId(lanes), name: "新しいレーン" }),
    );
    setLanes(next);
  };

  const handleSave = () => {
    try {
      // 固定レーンはWIP制限を持たない（古いデータに残っていても保存時に外す）
      const normalized = lanes.map((lane) =>
        isFixedRole(lane.role) ? { ...lane, wipLimit: null } : lane,
      );
      onSave({ projectName, lanes: normalized });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const renderRow = (lane: Lane, index: number) => (
    <li key={lane.id} className="settings-lane-row">
      <input
        aria-label={`レーン名（${lane.id}）`}
        value={lane.name}
        onChange={(e) => renameLane(index, e.target.value)}
      />
      {isFixedRole(lane.role) ? (
        // 固定レーンは改名のみ可能（WIP制限・削除・並び替えなし）
        <span className="settings-lane-tag">
          {ROLE_BADGES[lane.role as Exclude<LaneRole, "free">]}
        </span>
      ) : (
        <>
          <input
            type="number"
            min={1}
            max={99}
            className="settings-wip-input"
            placeholder="WIP"
            aria-label={`WIP制限（${lane.id}）`}
            value={lane.wipLimit ?? ""}
            onChange={(e) => setWipLimit(index, e.target.value)}
          />
          <button
            type="button"
            disabled={index === freeStart}
            onClick={() => moveLane(index, -1)}
          >
            上へ
          </button>
          <button
            type="button"
            disabled={index === freeEnd}
            onClick={() => moveLane(index, 1)}
          >
            下へ
          </button>
          <button type="button" onClick={() => removeLane(index)}>
            削除
          </button>
        </>
      )}
    </li>
  );

  return (
    <div className="modal-backdrop">
      <div
        role="dialog"
        aria-label="設定"
        className="item-detail settings-dialog"
      >
        <div className="item-detail-body">
          <label>
            プロジェクト名
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </label>
          <p className="settings-lanes-title">レーン</p>
          <ul className="settings-lanes">
            {/* 固定（PBL/SBL）・自由・固定（Close/Drop）の3セクションを区切り線で分ける */}
            {lanes.slice(0, freeStart).map((lane, i) => renderRow(lane, i))}
            <li role="presentation" className="settings-lane-divider" />
            {lanes
              .slice(freeStart, freeEnd + 1)
              .map((lane, i) => renderRow(lane, freeStart + i))}
            <li role="presentation" className="settings-lane-add">
              {/* 追加レーンはCloseの手前に挿入されるため、ボタンも自由レーンの直下に置く */}
              <button
                type="button"
                className="add-lane-button"
                onClick={addLane}
              >
                ＋レーンを追加
              </button>
            </li>
            <li role="presentation" className="settings-lane-divider" />
            {lanes
              .slice(freeEnd + 1)
              .map((lane, i) => renderRow(lane, freeEnd + 1 + i))}
          </ul>
          {error !== null && <p className="import-error">{error}</p>}
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
