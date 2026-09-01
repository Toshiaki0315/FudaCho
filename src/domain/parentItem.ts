import { validateLabels } from "./labels";

export const INFINITY_SIZE = "♾️" as const;

export const FIBONACCI_SIZES = [
  0,
  1,
  2,
  3,
  5,
  8,
  13,
  21,
  INFINITY_SIZE,
] as const;

export const DEFAULT_SIZE = 3;

export type Size = (typeof FIBONACCI_SIZES)[number];

export interface ParentItem {
  id: string;
  /** カード上でIDの代わりに表示する短い名前（未設定時はIDを表示） */
  title: string;
  summary: string;
  size: Size;
  laneId: string;
  assignee: string;
  reason: string;
  plannedStartDate: string;
  plannedEndDate: string;
  notes: string;
  comments: string[];
  labels: string[];
  childIds: string[];
  /** Ready = 着手可能。条件: 子アイテム1つ以上・概要と理由が記載済み */
  ready: boolean;
}

/** Readyにできる条件（概要と理由が記載されていること）を満たしているか。 */
export function isReadyEligible(input: {
  summary: string;
  reason: string;
}): boolean {
  return input.summary.trim() !== "" && input.reason.trim() !== "";
}

export function isValidSize(value: unknown): value is Size {
  return (FIBONACCI_SIZES as readonly unknown[]).includes(value);
}

export interface CreateParentItemInput {
  id: string;
  title?: string;
  summary: string;
  laneId: string;
  size?: Size;
  assignee?: string;
  reason?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  notes?: string;
  comments?: string[];
  labels?: string[];
  childIds?: string[];
  ready?: boolean;
}

export function createParentItem(input: CreateParentItemInput): ParentItem {
  if (input.id === "") {
    throw new Error("IDは必須です");
  }
  if (input.laneId === "") {
    throw new Error("レーンIDは必須です");
  }
  const size = input.size ?? DEFAULT_SIZE;
  const labels = input.labels ?? [];
  validateLabels(labels);
  const ready = input.ready ?? false;
  const childIds = input.childIds ?? [];
  if (
    ready &&
    !isReadyEligible({ summary: input.summary, reason: input.reason ?? "" })
  ) {
    throw new Error(
      "Readyにするには、概要と理由が記載されている必要があります",
    );
  }
  if (!isValidSize(size)) {
    throw new Error(
      `サイズはフィボナッチ数列 (${FIBONACCI_SIZES.join(", ")}) のみ指定できます`,
    );
  }
  return {
    id: input.id,
    title: input.title ?? "",
    summary: input.summary,
    size,
    laneId: input.laneId,
    assignee: input.assignee ?? "",
    reason: input.reason ?? "",
    plannedStartDate: input.plannedStartDate ?? "",
    plannedEndDate: input.plannedEndDate ?? "",
    notes: input.notes ?? "",
    comments: input.comments ?? [],
    labels,
    childIds,
    ready,
  };
}
