import { validateLabels } from "./labels";

export interface ChildItem {
  id: string;
  /** カード上でIDの代わりに表示する短い名前（未設定時はIDを表示） */
  title: string;
  /** 親を持たない子アイテムはnull */
  parentId: string | null;
  description: string;
  assignee: string;
  estimatedHours: number | null;
  actualHours: number | null;
  laneId: string;
  startDate: string;
  endDate: string;
  comments: string[];
  /** 独自ラベル。表示上の実効ラベルは親のラベルと合成して求める */
  labels: string[];
}

export interface CreateChildItemInput {
  id: string;
  title?: string;
  parentId?: string | null;
  description: string;
  laneId: string;
  assignee?: string;
  estimatedHours?: number | null;
  actualHours?: number | null;
  startDate?: string;
  endDate?: string;
  comments?: string[];
  labels?: string[];
}

export function createChildItem(input: CreateChildItemInput): ChildItem {
  if (input.id === "") {
    throw new Error("IDは必須です");
  }
  if (input.parentId === "") {
    throw new Error("親IDには空文字を指定できません（親なしはnull）");
  }
  if (input.laneId === "") {
    throw new Error("レーンIDは必須です");
  }
  const estimatedHours = input.estimatedHours ?? null;
  if (estimatedHours !== null && estimatedHours < 0) {
    throw new Error("見積時間は0以上を指定してください");
  }
  const labels = input.labels ?? [];
  validateLabels(labels);
  const actualHours = input.actualHours ?? null;
  if (actualHours !== null && actualHours < 0) {
    throw new Error("実績時間は0以上を指定してください");
  }
  return {
    id: input.id,
    title: input.title ?? "",
    parentId: input.parentId ?? null,
    description: input.description,
    assignee: input.assignee ?? "",
    estimatedHours,
    actualHours,
    laneId: input.laneId,
    startDate: input.startDate ?? "",
    endDate: input.endDate ?? "",
    comments: input.comments ?? [],
    labels,
  };
}
