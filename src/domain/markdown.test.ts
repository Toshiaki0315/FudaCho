import { describe, expect, it } from "vitest";
import { createChildItem } from "./childItem";
import { createDefaultLanes, createLane } from "./lane";
import { generateMarkdown, parseMarkdown } from "./markdown";
import { createParentItem } from "./parentItem";

// デフォルトレーン: lane-1=PBL, lane-2=SBL, lane-3=作業中(自由), lane-4=Close, lane-5=Drop
const lanes = createDefaultLanes();

describe("generateMarkdown", () => {
  it("プロジェクト名とレーン設定セクション（役割付き）を出力する", () => {
    const md = generateMarkdown(
      { projectName: "札帖", parents: [], children: [] },
      lanes,
    );
    expect(md).toContain("# 札帖");
    expect(md).toContain("## レーン設定");
    expect(md).toContain("- lane-1: PBL (役割: PBL)");
    expect(md).toContain("- lane-2: SBL (役割: SBL)");
    expect(md).toContain("- lane-3: 作業中\n");
    expect(md).toContain("- lane-4: Close (役割: Close)");
    expect(md).toContain("- lane-5: Drop (役割: Drop)");
  });

  it("WIP制限付きレーンはWIP属性も出力し、ラウンドトリップできる", () => {
    const withWip = lanes.map((lane) =>
      lane.id === "lane-3" ? { ...lane, wipLimit: 3 } : lane,
    );
    const md = generateMarkdown(
      { projectName: "札帖", parents: [], children: [] },
      withWip,
    );
    expect(md).toContain("- lane-3: 作業中 (WIP: 3)");
    expect(parseMarkdown(md, lanes).lanes).toEqual(withWip);
  });

  it("親アイテムを全フィールド付きで出力する", () => {
    const parent = createParentItem({
      id: "P-1",
      summary: "画面設計をまとめる",
      size: 5,
      laneId: "lane-1",
      assignee: "野村",
      reason: "リリースに必要",
      plannedStartDate: "2026-09-01",
      plannedEndDate: "2026-09-30",
      notes: "メモ",
      comments: ["最初のコメント", "二つ目"],
      labels: ["設計"],
      ready: true,
    });
    const md = generateMarkdown(
      { projectName: "札帖", parents: [parent], children: [] },
      lanes,
    );
    expect(md).toContain("## P-1: 画面設計をまとめる");
    expect(md).toContain("- レーン: PBL");
    expect(md).toContain("- サイズ: 5");
    expect(md).toContain("- 担当者: 野村");
    expect(md).toContain("- 理由: リリースに必要");
    expect(md).toContain("- 開始予定日: 2026-09-01");
    expect(md).toContain("- 終了予定日: 2026-09-30");
    expect(md).toContain("- 備考: メモ");
    expect(md).toContain("- ラベル: 設計");
    expect(md).toContain("- Ready: ✓");
    expect(md).toContain("- コメント:");
    expect(md).toContain("  - 最初のコメント");
  });

  it("空のフィールドは出力しない", () => {
    const parent = createParentItem({
      id: "P-1",
      summary: "設計",
      laneId: "lane-1",
    });
    const md = generateMarkdown(
      { projectName: "札帖", parents: [parent], children: [] },
      lanes,
    );
    expect(md).not.toContain("- 担当者:");
    expect(md).not.toContain("- 理由:");
    expect(md).not.toContain("- ラベル:");
    expect(md).not.toContain("- Ready:");
    expect(md).not.toContain("- コメント:");
  });

  it("子アイテムをチェックリストとして出力する（Closeレーンはチェック済み、SBLはレーン省略）", () => {
    const parent = createParentItem({
      id: "P-1",
      summary: "設計",
      laneId: "lane-1",
      childIds: ["C-1", "C-2"],
    });
    const children = [
      createChildItem({
        id: "C-1",
        parentId: "P-1",
        description: "図を描く",
        laneId: "lane-4",
        assignee: "野村",
        labels: ["フロント"],
        estimatedHours: 4,
        actualHours: 2.5,
        startDate: "2026-09-01",
        endDate: "2026-09-02",
      }),
      createChildItem({
        id: "C-2",
        parentId: "P-1",
        description: "レビュー",
        laneId: "lane-2",
        comments: ["子のコメント"],
      }),
    ];
    const md = generateMarkdown(
      { projectName: "札帖", parents: [parent], children },
      lanes,
    );
    expect(md).toContain("### 子アイテム");
    expect(md).toContain(
      "- [x] C-1: 図を描く (レーン: Close, 担当: 野村, ラベル: フロント, 見積: 4h, 実績: 2.5h, 開始: 2026-09-01, 終了: 2026-09-02)",
    );
    expect(md).toContain("- [ ] C-2: レビュー\n  - 子のコメント");
  });

  it("親なし子アイテムは専用セクションに出力する", () => {
    const children = [
      createChildItem({
        id: "C-1",
        description: "独立タスク",
        laneId: "lane-2",
        comments: ["メモ"],
      }),
    ];
    const md = generateMarkdown(
      { projectName: "札帖", parents: [], children },
      lanes,
    );
    expect(md).toContain("## 親なし子アイテム");
    expect(md).toContain("- [ ] C-1: 独立タスク\n  - メモ");
  });

  it("親なし子アイテムがない場合はセクションを出力しない", () => {
    const md = generateMarkdown(
      { projectName: "札帖", parents: [], children: [] },
      lanes,
    );
    expect(md).not.toContain("## 親なし子アイテム");
  });

  it("存在しないレーンの子アイテムはエラーになる", () => {
    const children = [
      createChildItem({
        id: "C-1",
        description: "作業",
        laneId: "lane-99",
      }),
    ];
    expect(() =>
      generateMarkdown({ projectName: "P", parents: [], children }, lanes),
    ).toThrow(/lane-99/);
  });

  it("存在しないレーンのアイテムはエラーになる", () => {
    const parent = createParentItem({
      id: "P-1",
      summary: "設計",
      laneId: "lane-99",
    });
    expect(() =>
      generateMarkdown(
        { projectName: "札帖", parents: [parent], children: [] },
        lanes,
      ),
    ).toThrow(/lane-99/);
  });
});

describe("parseMarkdown", () => {
  const sample = `# 札帖

## レーン設定
- lane-1: PBL (役割: PBL)
- lane-2: SBL (役割: SBL)
- lane-3: 実装中 (WIP: 2)
- lane-4: Close (役割: Close)
- lane-5: Drop (役割: Drop)

## P-1: 画面設計をまとめる
- レーン: PBL
- サイズ: 5
- 担当者: 野村
- 理由: リリースに必要
- ラベル: 設計;急ぎ
- Ready: ✓
- コメント:
  - 親のコメント

### 子アイテム
- [x] C-1: 図を描く (レーン: Close, 担当: 野村, ラベル: 図面, 見積: 4h, 実績: 2.5h, 開始: 2026-09-01, 終了: 2026-09-02)
- [ ] C-2: レビュー (レーン: 実装中)
  - 子のコメント

## P-2: 実装する
- 開始予定日: 2026-09-01
- 終了予定日: 2026-09-30
- 備考: メモ

## 親なし子アイテム
- [ ] C-3: 独立タスク (担当: 野村)
`;

  it("プロジェクト名・レーン定義・親子アイテムを読み取る", () => {
    const snapshot = parseMarkdown(sample, lanes);
    expect(snapshot.projectName).toBe("札帖");
    expect(snapshot.lanes!.map((l) => l.role)).toEqual([
      "pbl",
      "sbl",
      "free",
      "close",
      "drop",
    ]);
    expect(snapshot.lanes![2]).toMatchObject({ name: "実装中", wipLimit: 2 });
    const p1 = snapshot.parents[0];
    expect(p1.laneId).toBe("lane-1");
    expect(p1.size).toBe(5);
    expect(p1.labels).toEqual(["設計", "急ぎ"]);
    expect(p1.ready).toBe(true);
    expect(p1.comments).toEqual(["親のコメント"]);
    expect(p1.childIds).toEqual(["C-1", "C-2"]);
    expect(snapshot.children[0].laneId).toBe("lane-4");
    expect(snapshot.children[0]).toMatchObject({
      assignee: "野村",
      labels: ["図面"],
      estimatedHours: 4,
      actualHours: 2.5,
      startDate: "2026-09-01",
      endDate: "2026-09-02",
    });
    expect(snapshot.children[1].laneId).toBe("lane-3");
    expect(snapshot.children[1].comments).toEqual(["子のコメント"]);
    expect(snapshot.parents[1]).toMatchObject({
      plannedStartDate: "2026-09-01",
      plannedEndDate: "2026-09-30",
      notes: "メモ",
    });
  });

  it("レーン省略時は親はPBL、子はSBLになる", () => {
    const p2 = parseMarkdown(sample, lanes).parents[1];
    expect(p2.laneId).toBe("lane-1");
    const md = `# P

## P-1: 設計

### 子アイテム
- [ ] C-1: 作業
`;
    expect(parseMarkdown(md, lanes).children[0].laneId).toBe("lane-2");
  });

  it("チェック済みでレーン指定がない子アイテムはCloseになる", () => {
    const md = `# P

## P-1: 設計

### 子アイテム
- [x] C-1: 完了済み作業
`;
    expect(parseMarkdown(md, lanes).children[0].laneId).toBe("lane-4");
  });

  it("親なし子アイテムを読み取る（parentId: null）", () => {
    const c3 = parseMarkdown(sample, lanes).children[2];
    expect(c3.parentId).toBeNull();
    expect(c3.description).toBe("独立タスク");
    expect(c3.assignee).toBe("野村");
  });

  it("生成したマークダウンを読み戻すと同じデータになる（ラウンドトリップ）", () => {
    const original = parseMarkdown(sample, lanes);
    const regenerated = parseMarkdown(
      generateMarkdown(
        {
          projectName: original.projectName,
          parents: original.parents,
          children: original.children,
        },
        original.lanes!,
      ),
      lanes,
    );
    expect(regenerated).toEqual(original);
  });

  it("サイズ♾️を読み込める", () => {
    const md = `# P

## P-1: 設計
- サイズ: ♾️
`;
    expect(parseMarkdown(md, lanes).parents[0].size).toBe("♾️");
  });

  it("旧形式のフィールド（日程）は開始予定日として読み込む（互換）", () => {
    const md = `# P

## P-1: 設計
- 日程: 2026-09-30頃
`;
    const p1 = parseMarkdown(md, lanes).parents[0];
    expect(p1.plannedStartDate).toBe("2026-09-30頃");
  });

  it("プロジェクト名の見出しがない場合はエラーになる", () => {
    expect(() => parseMarkdown("何もない", lanes)).toThrow(/プロジェクト名/);
  });

  it.each([
    ["不正なサイズ", "- サイズ: 4", /サイズ/],
    ["不正なレーン名", "- レーン: 謎レーン", /レーン名/],
    ["不明なフィールド", "- 謎の項目: 値", /不明なフィールド/],
    ["不正なReady値", "- Ready: たぶん", /Ready/],
  ])("%s はエラーになる", (_name, line, pattern) => {
    const md = `# P

## P-1: 設計
${line}
`;
    expect(() => parseMarkdown(md, lanes)).toThrow(pattern);
  });

  it("不明なレーン属性・不正な役割はエラーになる", () => {
    expect(() =>
      parseMarkdown(
        `# P

## レーン設定
- lane-1: A (謎属性)
`,
        lanes,
      ),
    ).toThrow(/不明なレーン属性/);
    expect(() =>
      parseMarkdown(
        `# P

## レーン設定
- lane-1: A (役割: 謎)
`,
        lanes,
      ),
    ).toThrow(/役割/);
  });

  it("子アイテムの不明なメタデータ・解釈できないメタデータはエラーになる", () => {
    const base = (meta: string) => `# P

## P-1: 設計

### 子アイテム
- [ ] C-1: 作業 (${meta})
`;
    expect(() => parseMarkdown(base("謎キー: 値"), lanes)).toThrow(
      /不明なメタデータ/,
    );
    expect(() => parseMarkdown(base("キーバリューでない"), lanes)).toThrow(
      /解釈できません/,
    );
    expect(() => parseMarkdown(base("レーン: 謎レーン"), lanes)).toThrow(
      /レーン名/,
    );
  });

  it("レーン設定セクションがなければlanesはnullで既存レーンで解決する", () => {
    const md = `# P

## P-1: 設計
`;
    const snapshot = parseMarkdown(md, lanes);
    expect(snapshot.lanes).toBeNull();
    expect(snapshot.parents[0].laneId).toBe("lane-1");
  });

  it("ラベル付き子アイテムをラウンドトリップできる", () => {
    const customLanes = createDefaultLanes().map((lane) =>
      lane.id === "lane-3" ? createLane({ id: "lane-3", name: "検証" }) : lane,
    );
    const md = generateMarkdown(
      { projectName: "P", parents: [], children: [] },
      customLanes,
    );
    expect(parseMarkdown(md, lanes).lanes).toEqual(customLanes);
  });
});
