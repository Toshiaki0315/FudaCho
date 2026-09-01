import { describe, expect, it } from "vitest";
import { createChildItem } from "./childItem";
import { createDefaultLanes, createLane } from "./lane";
import { generateMarkdown, parseMarkdown } from "./markdown";
import { createParentItem } from "./parentItem";

// デフォルトレーン: lane-1=未着手, lane-2=作業中, lane-3=完了, lane-4=クローズ, lane-5=中断
const lanes = createDefaultLanes();

describe("generateMarkdown", () => {
  it("プロジェクト名を見出しとして出力する", () => {
    const md = generateMarkdown(
      { projectName: "札帖", parents: [], children: [] },
      lanes,
    );
    expect(md).toContain("# 札帖");
  });

  it("レーン設定セクションを属性付きで出力する", () => {
    const md = generateMarkdown(
      { projectName: "札帖", parents: [], children: [] },
      lanes,
    );
    expect(md).toContain("## レーン設定");
    expect(md).toContain("- lane-1: 未着手 (投入先)");
    expect(md).toContain("- lane-2: 作業中 (Drop操作)");
    expect(md).toContain("- lane-3: 完了 (完了扱い)");
    expect(md).toContain("- lane-4: クローズ (完了扱い)");
    expect(md).toContain("- lane-5: 中断 (進捗除外)");
  });

  it("WIP制限付きレーンはWIP属性も出力する", () => {
    const withWip = lanes.map((lane) =>
      lane.id === "lane-2" ? { ...lane, wipLimit: 3 } : lane,
    );
    const md = generateMarkdown(
      { projectName: "札帖", parents: [], children: [] },
      withWip,
    );
    expect(md).toContain("- lane-2: 作業中 (Drop操作, WIP: 3)");
  });

  it("移動先制限付きレーンは移動先属性込みでラウンドトリップできる", () => {
    const customLanes = [
      createLane({
        id: "lane-1",
        name: "受付",
        isDefaultEntry: true,
        moveTargets: ["lane-2", "lane-3"],
      }),
      createLane({ id: "lane-2", name: "済", countsAsDone: true }),
      createLane({ id: "lane-3", name: "破棄", excludedFromProgress: true }),
    ];
    const md = generateMarkdown(
      { projectName: "P", parents: [], children: [] },
      customLanes,
    );
    expect(md).toContain("- lane-1: 受付 (投入先, 移動先: lane-2;lane-3)");
    expect(parseMarkdown(md, lanes).lanes).toEqual(customLanes);
  });

  it("属性のないレーンは名前のみ出力する", () => {
    const md = generateMarkdown(
      { projectName: "札帖", parents: [], children: [] },
      [
        createLane({ id: "lane-1", name: "受付", isDefaultEntry: true }),
        createLane({ id: "lane-2", name: "その他" }),
      ],
    );
    expect(md).toContain("- lane-2: その他\n");
  });

  it("親アイテムを全フィールド付きの見出しセクションとして出力する（レーンは表示名）", () => {
    const parent = createParentItem({
      id: "P-1",
      summary: "画面設計をまとめる",
      size: 5,
      laneId: "lane-2",
      assignee: "野村",
      reason: "リリースに必要",
      plannedStartDate: "2026-09-01",
      plannedEndDate: "2026-09-30",
      notes: "メモ",
      comments: ["最初のコメント", "二つ目"],
    });
    const md = generateMarkdown(
      { projectName: "札帖", parents: [parent], children: [] },
      lanes,
    );
    expect(md).toContain("## P-1: 画面設計をまとめる");
    expect(md).toContain("- レーン: 作業中");
    expect(md).toContain("- サイズ: 5");
    expect(md).toContain("- 担当者: 野村");
    expect(md).toContain("- 理由: リリースに必要");
    expect(md).toContain("- 開始予定日: 2026-09-01");
    expect(md).toContain("- 終了予定日: 2026-09-30");
    expect(md).toContain("- 備考: メモ");
    expect(md).toContain("- コメント:");
    expect(md).toContain("  - 最初のコメント");
    expect(md).toContain("  - 二つ目");
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
    expect(md).not.toContain("- コメント:");
  });

  it("子アイテムをチェックリストとして出力する（完了扱いレーンはチェック済み）", () => {
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
        laneId: "lane-3",
        assignee: "野村",
        estimatedHours: 4,
        actualHours: 2.5,
        startDate: "2026-09-01",
        endDate: "2026-09-02",
      }),
      createChildItem({
        id: "C-2",
        parentId: "P-1",
        description: "レビュー",
        laneId: "lane-1",
      }),
    ];
    const md = generateMarkdown(
      { projectName: "札帖", parents: [parent], children },
      lanes,
    );
    expect(md).toContain("### 子アイテム");
    expect(md).toContain(
      "- [x] C-1: 図を描く (レーン: 完了, 担当: 野村, 見積: 4h, 実績: 2.5h, 開始: 2026-09-01, 終了: 2026-09-02)",
    );
    expect(md).toContain("- [ ] C-2: レビュー");
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

  it("存在しないレーンの子アイテムはエラーになる", () => {
    const parent = createParentItem({
      id: "P-1",
      summary: "設計",
      laneId: "lane-1",
      childIds: ["C-1"],
    });
    const children = [
      createChildItem({
        id: "C-1",
        parentId: "P-1",
        description: "作業",
        laneId: "lane-99",
      }),
    ];
    expect(() =>
      generateMarkdown(
        { projectName: "札帖", parents: [parent], children },
        lanes,
      ),
    ).toThrow(/lane-99/);
  });
});

describe("parseMarkdown", () => {
  const sample = `# 札帖

## P-1: 画面設計をまとめる
- レーン: 作業中
- サイズ: 5
- 担当者: 野村
- 理由: リリースに必要
- 開始予定日: 2026-09-01
- 終了予定日: 2026-09-30
- 備考: メモ
- コメント:
  - 最初のコメント
  - 二つ目

### 子アイテム
- [x] C-1: 図を描く (レーン: 完了, 担当: 野村, 見積: 4h, 実績: 2.5h, 開始: 2026-09-01, 終了: 2026-09-02)
- [ ] C-2: レビュー

## P-2: 実装する
- サイズ: ♾️
`;

  it("プロジェクト名を読み取る", () => {
    expect(parseMarkdown(sample, lanes).projectName).toBe("札帖");
  });

  it("親アイテムを全フィールド付きで読み取る（レーン名→ID解決）", () => {
    const { parents } = parseMarkdown(sample, lanes);
    expect(parents).toHaveLength(2);
    const p1 = parents[0];
    expect(p1.id).toBe("P-1");
    expect(p1.summary).toBe("画面設計をまとめる");
    expect(p1.laneId).toBe("lane-2");
    expect(p1.size).toBe(5);
    expect(p1.assignee).toBe("野村");
    expect(p1.reason).toBe("リリースに必要");
    expect(p1.plannedStartDate).toBe("2026-09-01");
    expect(p1.plannedEndDate).toBe("2026-09-30");
    expect(p1.notes).toBe("メモ");
    expect(p1.comments).toEqual(["最初のコメント", "二つ目"]);
    expect(p1.childIds).toEqual(["C-1", "C-2"]);
  });

  it("旧形式の「日程」フィールドは開始予定日として読み込む（互換）", () => {
    const md = `# P

## P-1: 設計
- 日程: 2026-09-30頃
`;
    const p1 = parseMarkdown(md, lanes).parents[0];
    expect(p1.plannedStartDate).toBe("2026-09-30頃");
    expect(p1.plannedEndDate).toBe("");
  });

  it("レーン省略時は新規投入先レーンになる", () => {
    const p2 = parseMarkdown(sample, lanes).parents[1];
    expect(p2.laneId).toBe("lane-1");
    expect(p2.size).toBe("♾️");
    expect(p2.assignee).toBe("");
    expect(p2.comments).toEqual([]);
  });

  it("子アイテムをメタデータ付きで読み取る", () => {
    const { children } = parseMarkdown(sample, lanes);
    expect(children).toHaveLength(2);
    const c1 = children[0];
    expect(c1.id).toBe("C-1");
    expect(c1.parentId).toBe("P-1");
    expect(c1.description).toBe("図を描く");
    expect(c1.laneId).toBe("lane-3");
    expect(c1.assignee).toBe("野村");
    expect(c1.estimatedHours).toBe(4);
    expect(c1.actualHours).toBe(2.5);
    expect(c1.startDate).toBe("2026-09-01");
    expect(c1.endDate).toBe("2026-09-02");
  });

  it("メタデータのない子アイテムはチェックボックスからレーンを判定する", () => {
    const c2 = parseMarkdown(sample, lanes).children[1];
    expect(c2.laneId).toBe("lane-1");
    expect(c2.estimatedHours).toBeNull();
  });

  it("チェック済みでレーン指定がない子アイテムは最初の完了扱いレーンになる", () => {
    const md = `# P

## P-1: 設計

### 子アイテム
- [x] C-1: 完了済み作業
`;
    expect(parseMarkdown(md, lanes).children[0].laneId).toBe("lane-3");
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
        lanes,
      ),
      lanes,
    );
    // 生成したMDにはレーン設定セクションが含まれるため、lanesは復元される
    expect(regenerated).toEqual({ ...original, lanes: [...lanes] });
  });

  it("プロジェクト名の見出しがない場合はエラーになる", () => {
    expect(() => parseMarkdown("何もない", lanes)).toThrow(/プロジェクト名/);
  });

  it("レーン設定セクションがあればレーン定義を読み取る", () => {
    const md = `# P

## レーン設定
- lane-1: 受付 (投入先)
- lane-2: 進行中 (Drop操作, WIP: 3)
- lane-3: 済 (完了扱い)
- lane-9: 破棄 (進捗除外)

## P-1: 設計する
- レーン: 進行中
`;
    const snapshot = parseMarkdown(md, lanes);
    expect(snapshot.lanes).not.toBeNull();
    expect(snapshot.lanes!.map((l) => l.id)).toEqual([
      "lane-1",
      "lane-2",
      "lane-3",
      "lane-9",
    ]);
    expect(snapshot.lanes![0]).toMatchObject({
      name: "受付",
      isDefaultEntry: true,
    });
    expect(snapshot.lanes![1]).toMatchObject({
      name: "進行中",
      hasDropAction: true,
      wipLimit: 3,
    });
    expect(snapshot.lanes![2]).toMatchObject({ countsAsDone: true });
    expect(snapshot.lanes![3]).toMatchObject({ excludedFromProgress: true });
    // アイテムのレーン名は定義されたレーンで解決される
    expect(snapshot.parents[0].laneId).toBe("lane-2");
  });

  it("レーン設定セクションがなければlanesはnullで、既存レーンで解決する", () => {
    const snapshot = parseMarkdown(sample, lanes);
    expect(snapshot.lanes).toBeNull();
  });

  it("レーン設定の不明な属性はエラーになる", () => {
    const md = `# P

## レーン設定
- lane-1: 受付 (謎属性)
`;
    expect(() => parseMarkdown(md, lanes)).toThrow(/不明なレーン属性/);
  });

  it("生成したマークダウンからレーン設定込みで復元できる（ラウンドトリップ）", () => {
    const customLanes = [
      createLane({
        id: "lane-1",
        name: "受付",
        isDefaultEntry: true,
        wipLimit: 9,
      }),
      createLane({ id: "lane-2", name: "済", countsAsDone: true }),
    ];
    const md = generateMarkdown(
      { projectName: "P", parents: [], children: [] },
      customLanes,
    );
    const snapshot = parseMarkdown(md, lanes);
    expect(snapshot.lanes).toEqual(customLanes);
  });

  it("不正なサイズはエラーになる", () => {
    const md = `# P

## P-1: 設計
- サイズ: 4
`;
    expect(() => parseMarkdown(md, lanes)).toThrow(/サイズ/);
  });

  it("不正なレーン名はエラーになる", () => {
    const md = `# P

## P-1: 設計
- レーン: 存在しないレーン
`;
    expect(() => parseMarkdown(md, lanes)).toThrow(/レーン名/);
  });

  it("親アイテムの不明なフィールドはエラーになる", () => {
    const md = `# P

## P-1: 設計
- 謎の項目: 値
`;
    expect(() => parseMarkdown(md, lanes)).toThrow(/不明なフィールド/);
  });

  it("子アイテムの不明なメタデータはエラーになる", () => {
    const md = `# P

## P-1: 設計

### 子アイテム
- [ ] C-1: 作業 (謎キー: 値)
`;
    expect(() => parseMarkdown(md, lanes)).toThrow(/不明なメタデータ/);
  });

  it("解釈できない子アイテムのメタデータはエラーになる", () => {
    const md = `# P

## P-1: 設計

### 子アイテム
- [ ] C-1: 作業 (キーバリューでない)
`;
    expect(() => parseMarkdown(md, lanes)).toThrow(/解釈できません/);
  });

  it("子アイテムの不正なレーン名はエラーになる", () => {
    const md = `# P

## P-1: 設計

### 子アイテム
- [ ] C-1: 作業 (レーン: 謎レーン)
`;
    expect(() => parseMarkdown(md, lanes)).toThrow(/レーン名/);
  });
});
