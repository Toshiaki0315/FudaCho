import { describe, expect, it } from "vitest";
import { createChildItem } from "./childItem";
import { generateMarkdown, parseMarkdown } from "./markdown";
import { createParentItem } from "./parentItem";

describe("generateMarkdown", () => {
  it("プロジェクト名を見出しとして出力する", () => {
    const md = generateMarkdown({
      projectName: "札帖",
      parents: [],
      children: [],
    });
    expect(md).toContain("# 札帖");
  });

  it("親アイテムを全フィールド付きの見出しセクションとして出力する", () => {
    const parent = createParentItem({
      id: "P-1",
      summary: "画面設計をまとめる",
      size: 5,
      status: "InProgress",
      assignee: "野村",
      reason: "リリースに必要",
      schedule: "2026-09-30",
      notes: "メモ",
      comments: ["最初のコメント", "二つ目"],
    });
    const md = generateMarkdown({
      projectName: "札帖",
      parents: [parent],
      children: [],
    });
    expect(md).toContain("## P-1: 画面設計をまとめる");
    expect(md).toContain("- ステータス: InProgress");
    expect(md).toContain("- サイズ: 5");
    expect(md).toContain("- 担当者: 野村");
    expect(md).toContain("- 理由: リリースに必要");
    expect(md).toContain("- 日程: 2026-09-30");
    expect(md).toContain("- 備考: メモ");
    expect(md).toContain("- コメント:");
    expect(md).toContain("  - 最初のコメント");
    expect(md).toContain("  - 二つ目");
  });

  it("空のフィールドは出力しない", () => {
    const parent = createParentItem({ id: "P-1", summary: "設計" });
    const md = generateMarkdown({
      projectName: "札帖",
      parents: [parent],
      children: [],
    });
    expect(md).not.toContain("- 担当者:");
    expect(md).not.toContain("- 理由:");
    expect(md).not.toContain("- コメント:");
  });

  it("子アイテムをチェックリストとして出力する（Done/Closeはチェック済み）", () => {
    const parent = createParentItem({
      id: "P-1",
      summary: "設計",
      childIds: ["C-1", "C-2"],
    });
    const children = [
      createChildItem({
        id: "C-1",
        parentId: "P-1",
        description: "図を描く",
        status: "Done",
        assignee: "野村",
        estimatedHours: 4,
        actualHours: 2.5,
        startDate: "2026-09-01",
        endDate: "2026-09-02",
      }),
      createChildItem({ id: "C-2", parentId: "P-1", description: "レビュー" }),
    ];
    const md = generateMarkdown({
      projectName: "札帖",
      parents: [parent],
      children,
    });
    expect(md).toContain("### 子アイテム");
    expect(md).toContain(
      "- [x] C-1: 図を描く (ステータス: Done, 担当: 野村, 見積: 4h, 実績: 2.5h, 開始: 2026-09-01, 終了: 2026-09-02)",
    );
    expect(md).toContain("- [ ] C-2: レビュー");
  });

  it("サイズ♾️も出力できる", () => {
    const parent = createParentItem({ id: "P-1", summary: "設計", size: "♾️" });
    const md = generateMarkdown({
      projectName: "札帖",
      parents: [parent],
      children: [],
    });
    expect(md).toContain("- サイズ: ♾️");
  });
});

describe("parseMarkdown", () => {
  const sample = `# 札帖

## P-1: 画面設計をまとめる
- ステータス: InProgress
- サイズ: 5
- 担当者: 野村
- 理由: リリースに必要
- 日程: 2026-09-30
- 備考: メモ
- コメント:
  - 最初のコメント
  - 二つ目

### 子アイテム
- [x] C-1: 図を描く (ステータス: Done, 担当: 野村, 見積: 4h, 実績: 2.5h, 開始: 2026-09-01, 終了: 2026-09-02)
- [ ] C-2: レビュー

## P-2: 実装する
- サイズ: ♾️
`;

  it("プロジェクト名を読み取る", () => {
    expect(parseMarkdown(sample).projectName).toBe("札帖");
  });

  it("親アイテムを全フィールド付きで読み取る", () => {
    const { parents } = parseMarkdown(sample);
    expect(parents).toHaveLength(2);
    const p1 = parents[0];
    expect(p1.id).toBe("P-1");
    expect(p1.summary).toBe("画面設計をまとめる");
    expect(p1.status).toBe("InProgress");
    expect(p1.size).toBe(5);
    expect(p1.assignee).toBe("野村");
    expect(p1.reason).toBe("リリースに必要");
    expect(p1.schedule).toBe("2026-09-30");
    expect(p1.notes).toBe("メモ");
    expect(p1.comments).toEqual(["最初のコメント", "二つ目"]);
    expect(p1.childIds).toEqual(["C-1", "C-2"]);
  });

  it("フィールド省略時はデフォルト値になる", () => {
    const p2 = parseMarkdown(sample).parents[1];
    expect(p2.status).toBe("ToDo");
    expect(p2.size).toBe("♾️");
    expect(p2.assignee).toBe("");
    expect(p2.comments).toEqual([]);
  });

  it("子アイテムをメタデータ付きで読み取る", () => {
    const { children } = parseMarkdown(sample);
    expect(children).toHaveLength(2);
    const c1 = children[0];
    expect(c1.id).toBe("C-1");
    expect(c1.parentId).toBe("P-1");
    expect(c1.description).toBe("図を描く");
    expect(c1.status).toBe("Done");
    expect(c1.assignee).toBe("野村");
    expect(c1.estimatedHours).toBe(4);
    expect(c1.actualHours).toBe(2.5);
    expect(c1.startDate).toBe("2026-09-01");
    expect(c1.endDate).toBe("2026-09-02");
  });

  it("メタデータのない子アイテムはチェックボックスからステータスを判定する", () => {
    const c2 = parseMarkdown(sample).children[1];
    expect(c2.status).toBe("ToDo");
    expect(c2.estimatedHours).toBeNull();
  });

  it("チェック済みでステータス指定がない子アイテムはDoneになる", () => {
    const md = `# P

## P-1: 設計

### 子アイテム
- [x] C-1: 完了済み作業
`;
    expect(parseMarkdown(md).children[0].status).toBe("Done");
  });

  it("生成したマークダウンを読み戻すと同じデータになる（ラウンドトリップ）", () => {
    const original = parseMarkdown(sample);
    const regenerated = parseMarkdown(
      generateMarkdown({
        projectName: original.projectName,
        parents: original.parents,
        children: original.children,
      }),
    );
    expect(regenerated).toEqual(original);
  });

  it("プロジェクト名の見出しがない場合はエラーになる", () => {
    expect(() => parseMarkdown("何もない")).toThrow(/プロジェクト名/);
  });

  it("不正なサイズはエラーになる", () => {
    const md = `# P

## P-1: 設計
- サイズ: 4
`;
    expect(() => parseMarkdown(md)).toThrow(/サイズ/);
  });

  it("親アイテムの不明なフィールドはエラーになる", () => {
    const md = `# P

## P-1: 設計
- 謎の項目: 値
`;
    expect(() => parseMarkdown(md)).toThrow(/不明なフィールド/);
  });

  it("子アイテムの不明なメタデータはエラーになる", () => {
    const md = `# P

## P-1: 設計

### 子アイテム
- [ ] C-1: 作業 (謎キー: 値)
`;
    expect(() => parseMarkdown(md)).toThrow(/不明なメタデータ/);
  });

  it("解釈できない子アイテムのメタデータはエラーになる", () => {
    const md = `# P

## P-1: 設計

### 子アイテム
- [ ] C-1: 作業 (キーバリューでない)
`;
    expect(() => parseMarkdown(md)).toThrow(/解釈できません/);
  });

  it("不正なステータスはエラーになる", () => {
    const md = `# P

## P-1: 設計
- ステータス: Working
`;
    expect(() => parseMarkdown(md)).toThrow(/ステータス/);
  });
});
