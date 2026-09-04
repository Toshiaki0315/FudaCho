/**
 * レーンエンティティ。役割（role）でボード上の振る舞いを決める:
 * - pbl:   要求一覧。親アイテムの新規作成先。削除不可・先頭固定
 * - sbl:   タスク一覧。子アイテムの新規作成先。削除不可・2番目固定
 * - free:  自由レーン。追加・削除・並び替え可（1つ以上必要）
 * - close: 完了。進捗率の完了扱い。削除不可・右から2番目固定
 * - drop:  中断。進捗率の分母から除外。削除不可・末尾固定
 */
export type LaneRole = "pbl" | "sbl" | "free" | "close" | "drop";

export interface Lane {
  /** 不変の内部ID。改名してもデータへの参照は変わらない */
  id: string;
  /** 表示名（人はこれで管理する） */
  name: string;
  role: LaneRole;
  /** WIP制限。null = 制限なし、1〜99の整数 */
  wipLimit: number | null;
}

export interface CreateLaneInput {
  id: string;
  name: string;
  role?: LaneRole;
  wipLimit?: number | null;
}

export function createLane(input: CreateLaneInput): Lane {
  return {
    id: input.id,
    name: input.name,
    role: input.role ?? "free",
    wipLimit: input.wipLimit ?? null,
  };
}

export function createDefaultLanes(): Lane[] {
  return [
    createLane({ id: "lane-1", name: "PBL", role: "pbl" }),
    createLane({ id: "lane-2", name: "SBL", role: "sbl" }),
    createLane({ id: "lane-3", name: "作業中" }),
    createLane({ id: "lane-4", name: "Close", role: "close" }),
    createLane({ id: "lane-5", name: "Drop", role: "drop" }),
  ];
}

export function isFixedRole(role: LaneRole): boolean {
  return role !== "free";
}

export function validateLanes(lanes: Lane[]): void {
  const ids = lanes.map((lane) => lane.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("レーンIDが重複しています");
  }
  if (lanes.some((lane) => lane.name === "")) {
    throw new Error("レーン名は必須です");
  }
  for (const role of ["pbl", "sbl", "close", "drop"] as const) {
    if (lanes.filter((lane) => lane.role === role).length !== 1) {
      throw new Error(`役割 ${role} のレーンはちょうど1つ必要です`);
    }
  }
  const freeCount = lanes.filter((lane) => lane.role === "free").length;
  if (freeCount === 0) {
    throw new Error("自由レーンは1つ以上必要です");
  }
  const roles = lanes.map((lane) => lane.role);
  const expected: LaneRole[] = [
    "pbl",
    "sbl",
    ...Array<LaneRole>(freeCount).fill("free"),
    "close",
    "drop",
  ];
  if (roles.join(",") !== expected.join(",")) {
    throw new Error(
      "レーンの並び順は PBL, SBL, 自由レーン…, Close, Drop の順である必要があります",
    );
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

/** 役割からレーンを取得する。validateLanes済みのレーン一覧では必ず見つかる。 */
export function findLaneByRole(
  lanes: readonly Lane[],
  role: Exclude<LaneRole, "free">,
): Lane {
  return lanes.find((lane) => lane.role === role)!;
}

/** 現在の件数でこのレーンがもう1件受け入れられるか（WIP制限判定）。 */
export function canAcceptMore(lane: Lane, currentCount: number): boolean {
  return lane.wipLimit === null || currentCount < lane.wipLimit;
}

/** WIP制限に達して移動できないことをユーザーへ伝える通知文。 */
export function wipLimitReachedMessage(lane: Lane): string {
  return `レーン「${lane.name}」はWIP制限（${lane.wipLimit}）に達しているため移動できません`;
}
