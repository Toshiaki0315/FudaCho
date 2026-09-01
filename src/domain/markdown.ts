import {
  createChildItem,
  type ChildItem,
  type CreateChildItemInput,
} from "./childItem";
import { findDefaultEntryLane, type Lane } from "./lane";
import {
  createParentItem,
  isValidSize,
  type CreateParentItemInput,
  type ParentItem,
} from "./parentItem";

export interface BoardSnapshot {
  projectName: string;
  parents: ParentItem[];
  children: ChildItem[];
}

function laneNameOf(lanes: readonly Lane[], laneId: string): string {
  const lane = lanes.find((l) => l.id === laneId);
  if (!lane) {
    throw new Error(`レーン ${laneId} が見つかりません`);
  }
  return lane.name;
}

function laneByName(lanes: readonly Lane[], name: string): Lane {
  const lane = lanes.find((l) => l.name === name);
  if (!lane) {
    throw new Error(`不正なレーン名です: ${name}`);
  }
  return lane;
}

function childLine(child: ChildItem, lanes: readonly Lane[]): string {
  const lane = lanes.find((l) => l.id === child.laneId);
  if (!lane) {
    throw new Error(`レーン ${child.laneId} が見つかりません`);
  }
  const checked = lane.countsAsDone;
  const meta: string[] = [];
  if (!lane.isDefaultEntry) {
    meta.push(`レーン: ${lane.name}`);
  }
  if (child.assignee !== "") {
    meta.push(`担当: ${child.assignee}`);
  }
  if (child.estimatedHours !== null) {
    meta.push(`見積: ${child.estimatedHours}h`);
  }
  if (child.actualHours !== null) {
    meta.push(`実績: ${child.actualHours}h`);
  }
  if (child.startDate !== "") {
    meta.push(`開始: ${child.startDate}`);
  }
  if (child.endDate !== "") {
    meta.push(`終了: ${child.endDate}`);
  }
  const metaText = meta.length > 0 ? ` (${meta.join(", ")})` : "";
  return `- [${checked ? "x" : " "}] ${child.id}: ${child.description}${metaText}`;
}

export function generateMarkdown(
  snapshot: BoardSnapshot,
  lanes: readonly Lane[],
): string {
  const lines: string[] = [`# ${snapshot.projectName}`];
  for (const parent of snapshot.parents) {
    lines.push("", `## ${parent.id}: ${parent.summary}`);
    lines.push(`- レーン: ${laneNameOf(lanes, parent.laneId)}`);
    lines.push(`- サイズ: ${parent.size}`);
    if (parent.assignee !== "") {
      lines.push(`- 担当者: ${parent.assignee}`);
    }
    if (parent.reason !== "") {
      lines.push(`- 理由: ${parent.reason}`);
    }
    if (parent.schedule !== "") {
      lines.push(`- 日程: ${parent.schedule}`);
    }
    if (parent.notes !== "") {
      lines.push(`- 備考: ${parent.notes}`);
    }
    if (parent.comments.length > 0) {
      lines.push("- コメント:");
      for (const comment of parent.comments) {
        lines.push(`  - ${comment}`);
      }
    }
    const children = snapshot.children.filter((c) => c.parentId === parent.id);
    if (children.length > 0) {
      lines.push("", "### 子アイテム");
      for (const child of children) {
        lines.push(childLine(child, lanes));
      }
    }
  }
  return lines.join("\n") + "\n";
}

interface ParsingParent {
  input: CreateParentItemInput;
  comments: string[];
  childIds: string[];
  inComments: boolean;
}

function parseChildLine(
  line: string,
  parentId: string,
  checked: boolean,
  idAndRest: string,
  lanes: readonly Lane[],
): CreateChildItemInput {
  const colon = idAndRest.indexOf(": ");
  const id = idAndRest.slice(0, colon);
  let description = idAndRest.slice(colon + 2);
  const defaultLane = findDefaultEntryLane([...lanes]);
  const doneLane = lanes.find((l) => l.countsAsDone);
  const input: CreateChildItemInput = {
    id,
    parentId,
    description,
    laneId: defaultLane.id,
  };
  const metaMatch = description.match(/^(.*) \(([^()]*)\)$/);
  let laneId: string | null = null;
  if (metaMatch) {
    description = metaMatch[1];
    input.description = description;
    for (const part of metaMatch[2].split(", ")) {
      const kv = part.match(/^([^:]+): (.*)$/);
      if (!kv) {
        throw new Error(`子アイテムのメタデータを解釈できません: ${line}`);
      }
      const [, key, value] = kv;
      if (key === "レーン") {
        laneId = laneByName(lanes, value).id;
      } else if (key === "担当") {
        input.assignee = value;
      } else if (key === "見積") {
        input.estimatedHours = Number(value.replace(/h$/, ""));
      } else if (key === "実績") {
        input.actualHours = Number(value.replace(/h$/, ""));
      } else if (key === "開始") {
        input.startDate = value;
      } else if (key === "終了") {
        input.endDate = value;
      } else {
        throw new Error(`子アイテムの不明なメタデータです: ${key}`);
      }
    }
  }
  if (laneId !== null) {
    input.laneId = laneId;
  } else if (checked && doneLane) {
    input.laneId = doneLane.id;
  }
  return input;
}

export function parseMarkdown(
  markdown: string,
  lanes: readonly Lane[],
): BoardSnapshot {
  const lines = markdown.split("\n");
  let projectName: string | null = null;
  const parsingParents: ParsingParent[] = [];
  const children: ChildItem[] = [];
  const defaultLane = findDefaultEntryLane([...lanes]);

  const currentParent = (): ParsingParent | null =>
    parsingParents.length > 0
      ? parsingParents[parsingParents.length - 1]
      : null;

  for (const line of lines) {
    const h1 = line.match(/^# (.+)$/);
    if (h1 && projectName === null) {
      projectName = h1[1];
      continue;
    }
    const h2 = line.match(/^## (\S+): (.+)$/);
    if (h2) {
      parsingParents.push({
        input: { id: h2[1], summary: h2[2], laneId: defaultLane.id },
        comments: [],
        childIds: [],
        inComments: false,
      });
      continue;
    }
    const parent = currentParent();
    if (!parent) {
      continue;
    }
    const childMatch = line.match(/^- \[( |x)\] (\S+: .+)$/);
    if (childMatch) {
      const input = parseChildLine(
        line,
        parent.input.id,
        childMatch[1] === "x",
        childMatch[2],
        lanes,
      );
      children.push(createChildItem(input));
      parent.childIds.push(input.id);
      continue;
    }
    const commentMatch = line.match(/^ {2}- (.+)$/);
    if (commentMatch && parent.inComments) {
      parent.comments.push(commentMatch[1]);
      continue;
    }
    const field = line.match(/^- ([^:]+):(?: (.*))?$/);
    if (field) {
      const [, key, value = ""] = field;
      parent.inComments = false;
      if (key === "レーン") {
        parent.input.laneId = laneByName(lanes, value).id;
      } else if (key === "サイズ") {
        const size = value === "♾️" ? value : Number(value);
        if (!isValidSize(size)) {
          throw new Error(`不正なサイズです: ${value}`);
        }
        parent.input.size = size;
      } else if (key === "担当者") {
        parent.input.assignee = value;
      } else if (key === "理由") {
        parent.input.reason = value;
      } else if (key === "日程") {
        parent.input.schedule = value;
      } else if (key === "備考") {
        parent.input.notes = value;
      } else if (key === "コメント") {
        parent.inComments = true;
      } else {
        throw new Error(`親アイテムの不明なフィールドです: ${key}`);
      }
    }
  }

  if (projectName === null) {
    throw new Error("プロジェクト名の見出し（# 名前）が見つかりません");
  }

  const parents = parsingParents.map((p) =>
    createParentItem({
      ...p.input,
      comments: p.comments,
      childIds: p.childIds,
    }),
  );
  return { projectName, parents, children };
}
