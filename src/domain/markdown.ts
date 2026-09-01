import {
  createChildItem,
  type ChildItem,
  type CreateChildItemInput,
} from "./childItem";
import { createLane, findLaneByRole, type Lane, type LaneRole } from "./lane";
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

/** パース結果。lanes はレーン設定セクションがあった場合のみ（なければnull）。 */
export interface ParsedBoard extends BoardSnapshot {
  lanes: Lane[] | null;
}

const ROLE_LABELS: Record<Exclude<LaneRole, "free">, string> = {
  pbl: "PBL",
  sbl: "SBL",
  close: "Close",
  drop: "Drop",
};

const PARENTLESS_SECTION = "## 親なし子アイテム";

function laneDefLine(lane: Lane): string {
  const attrs: string[] = [];
  if (lane.role !== "free") {
    attrs.push(`役割: ${ROLE_LABELS[lane.role]}`);
  }
  if (lane.wipLimit !== null) {
    attrs.push(`WIP: ${lane.wipLimit}`);
  }
  const attrText = attrs.length > 0 ? ` (${attrs.join(", ")})` : "";
  return `- ${lane.id}: ${lane.name}${attrText}`;
}

function parseLaneDefLine(line: string, idAndRest: string): Lane {
  const colon = idAndRest.indexOf(": ");
  const id = idAndRest.slice(0, colon);
  let name = idAndRest.slice(colon + 2);
  const input: Parameters<typeof createLane>[0] = { id, name };
  const metaMatch = name.match(/^(.*) \(([^()]*)\)$/);
  if (metaMatch) {
    name = metaMatch[1];
    input.name = name;
    for (const attr of metaMatch[2].split(", ")) {
      if (attr.startsWith("役割: ")) {
        const label = attr.slice("役割: ".length);
        const role = (
          Object.entries(ROLE_LABELS) as [Exclude<LaneRole, "free">, string][]
        ).find(([, l]) => l === label)?.[0];
        if (!role) {
          throw new Error(`不正な役割です: ${label}`);
        }
        input.role = role;
      } else if (attr.startsWith("WIP: ")) {
        input.wipLimit = Number(attr.slice("WIP: ".length));
      } else {
        throw new Error(`不明なレーン属性です: ${attr}（行: ${line}）`);
      }
    }
  }
  return createLane(input);
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

function childLines(child: ChildItem, lanes: readonly Lane[]): string[] {
  const lane = lanes.find((l) => l.id === child.laneId);
  if (!lane) {
    throw new Error(`レーン ${child.laneId} が見つかりません`);
  }
  const checked = lane.role === "close";
  const meta: string[] = [];
  if (lane.role !== "sbl") {
    meta.push(`レーン: ${lane.name}`);
  }
  if (child.assignee !== "") {
    meta.push(`担当: ${child.assignee}`);
  }
  if (child.labels.length > 0) {
    meta.push(`ラベル: ${child.labels.join(";")}`);
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
  return [
    `- [${checked ? "x" : " "}] ${child.id}: ${child.description}${metaText}`,
    ...child.comments.map((comment) => `  - ${comment}`),
  ];
}

export function generateMarkdown(
  snapshot: BoardSnapshot,
  lanes: readonly Lane[],
): string {
  const lines: string[] = [`# ${snapshot.projectName}`];
  lines.push("", "## レーン設定");
  for (const lane of lanes) {
    lines.push(laneDefLine(lane));
  }
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
    if (parent.plannedStartDate !== "") {
      lines.push(`- 開始予定日: ${parent.plannedStartDate}`);
    }
    if (parent.plannedEndDate !== "") {
      lines.push(`- 終了予定日: ${parent.plannedEndDate}`);
    }
    if (parent.notes !== "") {
      lines.push(`- 備考: ${parent.notes}`);
    }
    if (parent.labels.length > 0) {
      lines.push(`- ラベル: ${parent.labels.join(";")}`);
    }
    if (parent.ready) {
      lines.push("- Ready: ✓");
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
        lines.push(...childLines(child, lanes));
      }
    }
  }
  const parentless = snapshot.children.filter((c) => c.parentId === null);
  if (parentless.length > 0) {
    lines.push("", PARENTLESS_SECTION);
    for (const child of parentless) {
      lines.push(...childLines(child, lanes));
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
  parentId: string | null,
  checked: boolean,
  idAndRest: string,
  lanes: readonly Lane[],
): CreateChildItemInput {
  const colon = idAndRest.indexOf(": ");
  const id = idAndRest.slice(0, colon);
  let description = idAndRest.slice(colon + 2);
  const input: CreateChildItemInput = {
    id,
    parentId,
    description,
    laneId: findLaneByRole(lanes, "sbl").id,
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
      } else if (key === "ラベル") {
        input.labels = value.split(";");
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
  } else if (checked) {
    input.laneId = findLaneByRole(lanes, "close").id;
  }
  return input;
}

export function parseMarkdown(
  markdown: string,
  fallbackLanes: readonly Lane[],
): ParsedBoard {
  const lines = markdown.split("\n");
  let projectName: string | null = null;
  let parsedLanes: Lane[] | null = null;
  let lastChildIndex: number | null = null;
  let inLaneSection = false;
  let inParentless = false;
  const parsingParents: ParsingParent[] = [];
  const children: ChildItem[] = [];

  const effectiveLanes = (): readonly Lane[] => parsedLanes ?? fallbackLanes;

  const currentParent = (): ParsingParent | null =>
    !inParentless && parsingParents.length > 0
      ? parsingParents[parsingParents.length - 1]
      : null;

  for (const line of lines) {
    const h1 = line.match(/^# (.+)$/);
    if (h1 && projectName === null) {
      projectName = h1[1];
      continue;
    }
    if (line === "## レーン設定") {
      inLaneSection = true;
      parsedLanes = [];
      continue;
    }
    if (line === PARENTLESS_SECTION) {
      inLaneSection = false;
      inParentless = true;
      lastChildIndex = null;
      continue;
    }
    const h2 = line.match(/^## (\S+): (.+)$/);
    if (h2) {
      inLaneSection = false;
      inParentless = false;
      lastChildIndex = null;
      parsingParents.push({
        input: {
          id: h2[1],
          summary: h2[2],
          laneId: findLaneByRole(effectiveLanes(), "pbl").id,
        },
        comments: [],
        childIds: [],
        inComments: false,
      });
      continue;
    }
    if (inLaneSection) {
      const laneDef = line.match(/^- (\S+: .+)$/);
      if (laneDef) {
        parsedLanes!.push(parseLaneDefLine(line, laneDef[1]));
      }
      continue;
    }
    const parent = currentParent();
    const childMatch = line.match(/^- \[( |x)\] (\S+: .+)$/);
    if (childMatch && (parent || inParentless)) {
      const input = parseChildLine(
        line,
        parent ? parent.input.id : null,
        childMatch[1] === "x",
        childMatch[2],
        effectiveLanes(),
      );
      children.push(createChildItem(input));
      parent?.childIds.push(input.id);
      if (parent) {
        // 以降の字下げリストはこの子アイテムのコメントとして扱う
        parent.inComments = false;
      }
      lastChildIndex = children.length - 1;
      continue;
    }
    const commentMatch = line.match(/^ {2}- (.+)$/);
    if (commentMatch && parent?.inComments) {
      parent.comments.push(commentMatch[1]);
      continue;
    }
    if (commentMatch && lastChildIndex !== null) {
      const child = children[lastChildIndex];
      children[lastChildIndex] = {
        ...child,
        comments: [...child.comments, commentMatch[1]],
      };
      continue;
    }
    if (!parent) {
      continue;
    }
    const field = line.match(/^- ([^:]+):(?: (.*))?$/);
    if (field) {
      const [, key, value = ""] = field;
      parent.inComments = false;
      if (key === "レーン") {
        parent.input.laneId = laneByName(effectiveLanes(), value).id;
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
      } else if (key === "開始予定日") {
        parent.input.plannedStartDate = value;
      } else if (key === "終了予定日") {
        parent.input.plannedEndDate = value;
      } else if (key === "日程") {
        // 旧形式（分割前）の互換読み込み: 日程は開始予定日として取り込む
        parent.input.plannedStartDate = value;
      } else if (key === "備考") {
        parent.input.notes = value;
      } else if (key === "ラベル") {
        parent.input.labels = value.split(";");
      } else if (key === "Ready") {
        if (value !== "✓") {
          throw new Error(`不正なReady値です: ${value}`);
        }
        parent.input.ready = true;
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
  return { projectName, parents, children, lanes: parsedLanes };
}
