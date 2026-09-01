/**
 * レーンエンティティ。ステータスは不変の内部ID（id）で表し、
 * 表示名・WIP制限・移動先・Drop操作などの振る舞いを属性として関連付ける。
 */
export interface Lane {
  /** 不変の内部ID。改名してもデータへの参照は変わらない */
  id: string;
  /** 表示名（人はこれで管理する） */
  name: string;
  /** WIP制限。null = 制限なし、1〜99の整数 */
  wipLimit: number | null;
  /** 移動を許可する先のレーンID。"all" = 制限なし */
  moveTargets: string[] | "all";
  /** このレーンのカードにDrop操作を表示するか */
  hasDropAction: boolean;
  /** 進捗率の分子（完了）として数えるか */
  countsAsDone: boolean;
  /** 進捗率の分母から除外するか（Drop先レーン） */
  excludedFromProgress: boolean;
  /** 新規アイテムの投入先か（全レーン中ちょうど1つ） */
  isDefaultEntry: boolean;
}

export interface CreateLaneInput {
  id: string;
  name: string;
  wipLimit?: number | null;
  moveTargets?: string[] | "all";
  hasDropAction?: boolean;
  countsAsDone?: boolean;
  excludedFromProgress?: boolean;
  isDefaultEntry?: boolean;
}

export function createLane(input: CreateLaneInput): Lane {
  return {
    id: input.id,
    name: input.name,
    wipLimit: input.wipLimit ?? null,
    moveTargets: input.moveTargets ?? "all",
    hasDropAction: input.hasDropAction ?? false,
    countsAsDone: input.countsAsDone ?? false,
    excludedFromProgress: input.excludedFromProgress ?? false,
    isDefaultEntry: input.isDefaultEntry ?? false,
  };
}

export function createDefaultLanes(): Lane[] {
  return [
    createLane({ id: "lane-1", name: "未着手", isDefaultEntry: true }),
    createLane({ id: "lane-2", name: "作業中", hasDropAction: true }),
    createLane({ id: "lane-3", name: "完了", countsAsDone: true }),
    createLane({ id: "lane-4", name: "クローズ", countsAsDone: true }),
    createLane({ id: "lane-5", name: "中断", excludedFromProgress: true }),
  ];
}

export function validateLanes(lanes: Lane[]): void {
  if (lanes.length === 0) {
    throw new Error("レーンは1件以上必要です");
  }
  const ids = lanes.map((lane) => lane.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("レーンIDが重複しています");
  }
  if (lanes.some((lane) => lane.name === "")) {
    throw new Error("レーン名は必須です");
  }
  if (lanes.filter((lane) => lane.isDefaultEntry).length !== 1) {
    throw new Error("新規アイテムの投入先レーンはちょうど1つ必要です");
  }
  for (const lane of lanes) {
    if (
      lane.wipLimit !== null &&
      (!Number.isInteger(lane.wipLimit) ||
        lane.wipLimit < 1 ||
        lane.wipLimit > 99)
    ) {
      throw new Error("WIP制限はなし（null）または1〜99の整数のみ有効です");
    }
  }
}

/** 現在の件数でこのレーンがもう1件受け入れられるか（WIP制限判定）。 */
export function canAcceptMore(lane: Lane, currentCount: number): boolean {
  return lane.wipLimit === null || currentCount < lane.wipLimit;
}

export function findDefaultEntryLane(lanes: Lane[]): Lane {
  return lanes.find((lane) => lane.isDefaultEntry)!;
}

export function findDropLane(lanes: Lane[]): Lane | null {
  return lanes.find((lane) => lane.excludedFromProgress) ?? null;
}
