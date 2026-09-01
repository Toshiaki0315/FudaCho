import { useState } from "react";
import { createLane, type Lane } from "../domain/lane";
import type { Settings } from "../domain/settings";

interface SettingsDialogProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}

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

  const moveLane = (index: number, direction: -1 | 1) => {
    const next = [...lanes];
    const [moved] = next.splice(index, 1);
    next.splice(index + direction, 0, moved);
    setLanes(next);
  };

  const addLane = () => {
    setLanes([
      ...lanes,
      createLane({ id: nextLaneId(lanes), name: "新しいレーン" }),
    ]);
  };

  const handleSave = () => {
    try {
      onSave({ projectName, lanes });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

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
            {lanes.map((lane, index) => (
              <li key={lane.id} className="settings-lane-row">
                <input
                  aria-label={`レーン名（${lane.id}）`}
                  value={lane.name}
                  onChange={(e) => renameLane(index, e.target.value)}
                />
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
                <span
                  className={
                    lane.isDefaultEntry
                      ? "settings-lane-tag is-entry"
                      : "settings-lane-tag"
                  }
                  aria-hidden={!lane.isDefaultEntry}
                >
                  {lane.isDefaultEntry ? "投入先" : ""}
                </span>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveLane(index, -1)}
                >
                  上へ
                </button>
                <button
                  type="button"
                  disabled={index === lanes.length - 1}
                  onClick={() => moveLane(index, 1)}
                >
                  下へ
                </button>
                <button type="button" onClick={() => removeLane(index)}>
                  削除
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="add-lane-button" onClick={addLane}>
            ＋レーンを追加
          </button>
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
