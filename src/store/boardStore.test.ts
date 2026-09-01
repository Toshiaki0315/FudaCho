import { beforeEach, describe, expect, it } from "vitest";
import { useBoardStore } from "./boardStore";

describe("boardStore", () => {
  beforeEach(() => {
    useBoardStore.getState().reset();
  });

  describe("初期状態", () => {
    it("デフォルト設定を持つ", () => {
      const { settings } = useBoardStore.getState();
      expect(settings.projectName).toBe("札帖");
      expect(settings.lanes).toHaveLength(5);
    });

    it("アイテムは空である", () => {
      const state = useBoardStore.getState();
      expect(state.parents).toEqual({});
      expect(state.children).toEqual({});
      expect(state.laneOrder.ToDo).toEqual([]);
    });
  });

  describe("addParent", () => {
    it("親アイテムを作成しToDoレーンの末尾に追加、IDは連番で採番される", () => {
      const store = useBoardStore.getState();
      const id1 = store.addParent({ summary: "設計する" });
      const id2 = store.addParent({ summary: "実装する" });
      expect(id1).toBe("P-1");
      expect(id2).toBe("P-2");
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].summary).toBe("設計する");
      expect(state.parents["P-1"].status).toBe("ToDo");
      expect(state.laneOrder.ToDo).toEqual(["P-1", "P-2"]);
    });

    it("サイズや担当者も指定できる", () => {
      useBoardStore.getState().addParent({
        summary: "設計する",
        size: 5,
        assignee: "野村",
      });
      const parent = useBoardStore.getState().parents["P-1"];
      expect(parent.size).toBe(5);
      expect(parent.assignee).toBe("野村");
    });
  });

  describe("addChild", () => {
    it("子アイテムを作成し親に紐付け、ToDoレーンに追加する", () => {
      const store = useBoardStore.getState();
      const parentId = store.addParent({ summary: "設計する" });
      const childId = useBoardStore
        .getState()
        .addChild({ parentId, description: "図を描く" });
      expect(childId).toBe("C-1");
      const state = useBoardStore.getState();
      expect(state.children["C-1"].parentId).toBe("P-1");
      expect(state.parents["P-1"].childIds).toContain("C-1");
      expect(state.laneOrder.ToDo).toEqual(["P-1", "C-1"]);
    });

    it("存在しない親IDを指定するとエラーになる", () => {
      expect(() =>
        useBoardStore
          .getState()
          .addChild({ parentId: "P-99", description: "作業" }),
      ).toThrow(/P-99/);
    });
  });

  describe("moveItem（レーン間移動 = ステータス変更）", () => {
    it("親アイテムを別レーンに移動するとステータスも変わる", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "設計する" });
      useBoardStore.getState().moveItem("P-1", "InProgress");
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].status).toBe("InProgress");
      expect(state.laneOrder.ToDo).toEqual([]);
      expect(state.laneOrder.InProgress).toEqual(["P-1"]);
    });

    it("子アイテムも移動できる", () => {
      const store = useBoardStore.getState();
      const parentId = store.addParent({ summary: "設計する" });
      useBoardStore.getState().addChild({ parentId, description: "作業" });
      useBoardStore.getState().moveItem("C-1", "Done");
      const state = useBoardStore.getState();
      expect(state.children["C-1"].status).toBe("Done");
      expect(state.laneOrder.Done).toEqual(["C-1"]);
    });

    it("挿入位置を指定して移動できる", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "A" });
      useBoardStore.getState().addParent({ summary: "B" });
      useBoardStore.getState().moveItem("P-1", "InProgress");
      useBoardStore.getState().moveItem("P-2", "InProgress", 0);
      expect(useBoardStore.getState().laneOrder.InProgress).toEqual([
        "P-2",
        "P-1",
      ]);
    });

    it("存在しないIDを移動するとエラーになる", () => {
      expect(() => useBoardStore.getState().moveItem("X-1", "Done")).toThrow(
        /X-1/,
      );
    });
  });

  describe("reorderLane（レーン内並び替え = 優先順位変更）", () => {
    it("レーン内でアイテムの優先順位を入れ替える", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "A" });
      useBoardStore.getState().addParent({ summary: "B" });
      useBoardStore.getState().addParent({ summary: "C" });
      useBoardStore.getState().reorderLane("ToDo", 2, 0);
      expect(useBoardStore.getState().laneOrder.ToDo).toEqual([
        "P-3",
        "P-1",
        "P-2",
      ]);
    });
  });

  describe("updateParent", () => {
    it("親アイテムのフィールドを更新する", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "設計する" });
      useBoardStore.getState().updateParent("P-1", {
        summary: "詳細設計する",
        size: 5,
        assignee: "野村",
        reason: "重要",
        schedule: "2026-09-15",
        notes: "備考",
        comments: ["メモ"],
      });
      const parent = useBoardStore.getState().parents["P-1"];
      expect(parent.summary).toBe("詳細設計する");
      expect(parent.size).toBe(5);
      expect(parent.assignee).toBe("野村");
      expect(parent.reason).toBe("重要");
      expect(parent.schedule).toBe("2026-09-15");
      expect(parent.notes).toBe("備考");
      expect(parent.comments).toEqual(["メモ"]);
    });

    it("IDとステータスと子アイテム一覧は更新できない（他の経路で管理）", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "設計する" });
      useBoardStore.getState().updateParent("P-1", { summary: "変更" });
      const parent = useBoardStore.getState().parents["P-1"];
      expect(parent.id).toBe("P-1");
      expect(parent.status).toBe("ToDo");
    });

    it("不正なサイズを指定するとエラーになる", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "設計する" });
      expect(() =>
        useBoardStore.getState().updateParent("P-1", { size: 4 as never }),
      ).toThrow(/サイズ/);
    });

    it("存在しないIDを更新するとエラーになる", () => {
      expect(() =>
        useBoardStore.getState().updateParent("P-99", { summary: "x" }),
      ).toThrow(/P-99/);
    });
  });

  describe("updateChild", () => {
    it("子アイテムのフィールドを更新する", () => {
      const store = useBoardStore.getState();
      const parentId = store.addParent({ summary: "設計する" });
      useBoardStore.getState().addChild({ parentId, description: "作業" });
      useBoardStore.getState().updateChild("C-1", {
        description: "作業を変更",
        assignee: "野村",
        estimatedHours: 4,
        actualHours: 2.5,
        startDate: "2026-09-01",
        endDate: "2026-09-02",
      });
      const child = useBoardStore.getState().children["C-1"];
      expect(child.description).toBe("作業を変更");
      expect(child.assignee).toBe("野村");
      expect(child.estimatedHours).toBe(4);
      expect(child.actualHours).toBe(2.5);
      expect(child.startDate).toBe("2026-09-01");
      expect(child.endDate).toBe("2026-09-02");
    });

    it("負の見積時間を指定するとエラーになる", () => {
      const store = useBoardStore.getState();
      const parentId = store.addParent({ summary: "設計する" });
      useBoardStore.getState().addChild({ parentId, description: "作業" });
      expect(() =>
        useBoardStore.getState().updateChild("C-1", { estimatedHours: -1 }),
      ).toThrow(/見積時間/);
    });

    it("存在しないIDを更新するとエラーになる", () => {
      expect(() =>
        useBoardStore.getState().updateChild("C-99", { description: "x" }),
      ).toThrow(/C-99/);
    });
  });

  describe("handleDragEnd（D&D結果の適用）", () => {
    it("レーンIDへのドロップでレーン間移動する", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "A" });
      useBoardStore.getState().handleDragEnd("P-1", "InProgress");
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].status).toBe("InProgress");
      expect(state.laneOrder.InProgress).toEqual(["P-1"]);
    });

    it("同一レーンのアイテムへのドロップで並び替える", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "A" });
      useBoardStore.getState().addParent({ summary: "B" });
      useBoardStore.getState().handleDragEnd("P-1", "P-2");
      expect(useBoardStore.getState().laneOrder.ToDo).toEqual(["P-2", "P-1"]);
    });

    it("別レーンのアイテムへのドロップでその位置に移動する", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "A" });
      useBoardStore.getState().addParent({ summary: "B" });
      useBoardStore.getState().moveItem("P-2", "InProgress");
      useBoardStore.getState().handleDragEnd("P-1", "P-2");
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].status).toBe("InProgress");
      expect(state.laneOrder.InProgress).toEqual(["P-1", "P-2"]);
    });

    it("変更が不要な場合（自分自身へのドロップ等）は状態を変えない", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "A" });
      const before = useBoardStore.getState().laneOrder;
      useBoardStore.getState().handleDragEnd("P-1", "P-1");
      expect(useBoardStore.getState().laneOrder).toEqual(before);
    });
  });

  describe("exportMarkdown", () => {
    it("現在のボードをマークダウンとして出力する（レーン順）", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "設計する", size: 5 });
      useBoardStore.getState().addParent({ summary: "実装する" });
      useBoardStore
        .getState()
        .addChild({ parentId: "P-1", description: "図を描く" });
      useBoardStore.getState().moveItem("P-2", "InProgress");
      const md = useBoardStore.getState().exportMarkdown();
      expect(md).toContain("# 札帖");
      expect(md).toContain("## P-1: 設計する");
      expect(md).toContain("- サイズ: 5");
      expect(md).toContain("## P-2: 実装する");
      expect(md).toContain("- ステータス: InProgress");
      expect(md).toContain("- [ ] C-1: 図を描く");
      // レーン順: ToDoのP-1が先、作業中のP-2が後
      expect(md.indexOf("## P-1")).toBeLessThan(md.indexOf("## P-2"));
    });
  });

  describe("importMarkdown", () => {
    const md = `# 輸入プロジェクト

## P-1: 設計する
- ステータス: InProgress
- サイズ: 5

### 子アイテム
- [x] C-1: 図を描く
- [ ] C-2: レビュー

## P-3: 実装する
`;

    it("マークダウンからボード全体を再構築する", () => {
      useBoardStore.getState().importMarkdown(md);
      const state = useBoardStore.getState();
      expect(state.settings.projectName).toBe("輸入プロジェクト");
      expect(state.parents["P-1"].summary).toBe("設計する");
      expect(state.parents["P-1"].childIds).toEqual(["C-1", "C-2"]);
      expect(state.parents["P-3"].summary).toBe("実装する");
      expect(state.children["C-1"].status).toBe("Done");
      expect(state.laneOrder.InProgress).toEqual(["P-1"]);
      expect(state.laneOrder.Done).toEqual(["C-1"]);
      expect(state.laneOrder.ToDo).toEqual(["C-2", "P-3"]);
    });

    it("インポート前のアイテムは置き換えられる", () => {
      useBoardStore.getState().addParent({ summary: "古いアイテム" });
      useBoardStore.getState().importMarkdown(md);
      const state = useBoardStore.getState();
      expect(Object.values(state.parents).map((p) => p.summary)).not.toContain(
        "古いアイテム",
      );
    });

    it("インポート後の採番は既存IDと重複しない", () => {
      useBoardStore.getState().importMarkdown(md);
      const newId = useBoardStore.getState().addParent({ summary: "新規" });
      expect(newId).toBe("P-4");
      const newChildId = useBoardStore
        .getState()
        .addChild({ parentId: "P-1", description: "追加作業" });
      expect(newChildId).toBe("C-3");
    });

    it("P-n形式でないIDは採番カウンタに影響しない", () => {
      useBoardStore.getState().importMarkdown(`# 自由ID

## TASK-9: 自由な形式のID
`);
      expect(useBoardStore.getState().addParent({ summary: "新規" })).toBe(
        "P-1",
      );
    });

    it("不正なマークダウンはエラーになり状態は変わらない", () => {
      useBoardStore.getState().addParent({ summary: "既存" });
      expect(() =>
        useBoardStore.getState().importMarkdown("見出しなし"),
      ).toThrow(/プロジェクト名/);
      expect(useBoardStore.getState().parents["P-1"].summary).toBe("既存");
    });

    it("エクスポートしたマークダウンを再インポートできる（ラウンドトリップ）", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "設計する", size: 8, assignee: "野村" });
      useBoardStore
        .getState()
        .addChild({ parentId: "P-1", description: "図を描く" });
      useBoardStore.getState().moveItem("C-1", "Done");
      const exported = useBoardStore.getState().exportMarkdown();
      useBoardStore.getState().importMarkdown(exported);
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].size).toBe(8);
      expect(state.children["C-1"].status).toBe("Done");
      expect(state.exportMarkdown()).toBe(exported);
    });
  });

  describe("dropItem（Drop = データ保持したままDroppedへ）", () => {
    it("アイテムをDroppedレーンに移動しデータは保持する", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "設計する" });
      useBoardStore.getState().moveItem("P-1", "InProgress");
      useBoardStore.getState().dropItem("P-1");
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].status).toBe("Dropped");
      expect(state.parents["P-1"].summary).toBe("設計する");
      expect(state.laneOrder.Dropped).toEqual(["P-1"]);
      expect(state.laneOrder.InProgress).toEqual([]);
    });
  });
});
