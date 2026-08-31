export const ALL_STATUSES = [
  "ToDo",
  "InProgress",
  "Done",
  "Close",
  "Dropped",
] as const;

export type Status = (typeof ALL_STATUSES)[number];

export interface LaneConfig {
  status: Status;
  displayName: string;
}

export interface Settings {
  projectName: string;
  lanes: LaneConfig[];
}

const DEFAULT_LANE_NAMES: Record<Status, string> = {
  ToDo: "未着手",
  InProgress: "作業中",
  Done: "完了",
  Close: "クローズ",
  Dropped: "中断",
};

export function createDefaultSettings(projectName = "札帖"): Settings {
  return {
    projectName,
    lanes: ALL_STATUSES.map((status) => ({
      status,
      displayName: DEFAULT_LANE_NAMES[status],
    })),
  };
}
