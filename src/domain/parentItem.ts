import type { Status } from "./settings";

export const INFINITY_SIZE = "♾️" as const;

export const FIBONACCI_SIZES = [0, 1, 2, 3, 5, 8, 13, INFINITY_SIZE] as const;

export type Size = (typeof FIBONACCI_SIZES)[number];

export interface ParentItem {
  id: string;
  summary: string;
  size: Size;
  status: Status;
  assignee: string;
  reason: string;
  schedule: string;
  notes: string;
  comments: string[];
  childIds: string[];
}

export function isValidSize(value: unknown): value is Size {
  return (FIBONACCI_SIZES as readonly unknown[]).includes(value);
}

export interface CreateParentItemInput {
  id: string;
  summary: string;
  size?: Size;
  status?: Status;
  assignee?: string;
  reason?: string;
  schedule?: string;
  notes?: string;
  comments?: string[];
  childIds?: string[];
}

export function createParentItem(input: CreateParentItemInput): ParentItem {
  if (input.id === "") {
    throw new Error("IDは必須です");
  }
  const size = input.size ?? 0;
  if (!isValidSize(size)) {
    throw new Error(
      `サイズはフィボナッチ数列 (${FIBONACCI_SIZES.join(", ")}) のみ指定できます`,
    );
  }
  return {
    id: input.id,
    summary: input.summary,
    size,
    status: input.status ?? "ToDo",
    assignee: input.assignee ?? "",
    reason: input.reason ?? "",
    schedule: input.schedule ?? "",
    notes: input.notes ?? "",
    comments: input.comments ?? [],
    childIds: input.childIds ?? [],
  };
}
