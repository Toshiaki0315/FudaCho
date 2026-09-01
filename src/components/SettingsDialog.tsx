import { useState } from "react";
import {
  ALL_STATUSES,
  type LaneConfig,
  type Settings,
} from "../domain/settings";

interface SettingsDialogProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}

export function SettingsDialog({
  settings,
  onSave,
  onClose,
}: SettingsDialogProps) {
  const [projectName, setProjectName] = useState(settings.projectName);
  const [lanes, setLanes] = useState<LaneConfig[]>(settings.lanes);
  const [error, setError] = useState<string | null>(null);

  const unusedStatuses = ALL_STATUSES.filter(
    (status) => !lanes.some((lane) => lane.status === status),
  );

  const renameLane = (index: number, displayName: string) => {
    setLanes(
      lanes.map((lane, i) => (i === index ? { ...lane, displayName } : lane)),
    );
  };

  const removeLane = (index: number) => {
    setLanes(lanes.filter((_, i) => i !== index));
  };

  const addLane = () => {
    const status = unusedStatuses[0];
    setLanes([...lanes, { status, displayName: status }]);
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
      <div role="dialog" aria-label="設定" className="item-detail">
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
            <li key={lane.status} className="settings-lane-row">
              <span className="settings-lane-status">{lane.status}</span>
              <input
                value={lane.displayName}
                onChange={(e) => renameLane(index, e.target.value)}
              />
              <button type="button" onClick={() => removeLane(index)}>
                削除
              </button>
            </li>
          ))}
        </ul>
        {unusedStatuses.length > 0 && (
          <button type="button" onClick={addLane}>
            ＋レーンを追加
          </button>
        )}
        {error !== null && <p className="import-error">{error}</p>}
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
