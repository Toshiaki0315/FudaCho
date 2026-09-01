export interface ChildItem {
  id: string;
  parentId: string;
  description: string;
  assignee: string;
  estimatedHours: number | null;
  actualHours: number | null;
  laneId: string;
  startDate: string;
  endDate: string;
}

export interface CreateChildItemInput {
  id: string;
  parentId: string;
  description: string;
  laneId: string;
  assignee?: string;
  estimatedHours?: number | null;
  actualHours?: number | null;
  startDate?: string;
  endDate?: string;
}

export function createChildItem(input: CreateChildItemInput): ChildItem {
  if (input.id === "") {
    throw new Error("IDは必須です");
  }
  if (input.parentId === "") {
    throw new Error("親IDは必須です");
  }
  if (input.laneId === "") {
    throw new Error("レーンIDは必須です");
  }
  const estimatedHours = input.estimatedHours ?? null;
  if (estimatedHours !== null && estimatedHours < 0) {
    throw new Error("見積時間は0以上を指定してください");
  }
  const actualHours = input.actualHours ?? null;
  if (actualHours !== null && actualHours < 0) {
    throw new Error("実績時間は0以上を指定してください");
  }
  return {
    id: input.id,
    parentId: input.parentId,
    description: input.description,
    assignee: input.assignee ?? "",
    estimatedHours,
    actualHours,
    laneId: input.laneId,
    startDate: input.startDate ?? "",
    endDate: input.endDate ?? "",
  };
}
