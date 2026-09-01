import { beforeEach, describe, expect, it } from "vitest";
import { createLane } from "../domain/lane";
import { useBoardStore } from "./boardStore";

// デフォルトレーン: lane-1=未着手, lane-2=作業中, lane-3=完了, lane-4=クローズ, lane-5=中断

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
      expect(state.laneOrder["lane-1"]).toEqual([]);
    });
  });

  describe("addParent", () => {
    it("親アイテムを作成し投入先レーンの末尾に追加、IDは連番で採番される", () => {
      const store = useBoardStore.getState();
      const id1 = store.addParent({ summary: "設計する" });
      const id2 = store.addParent({ summary: "実装する" });
      expect(id1).toBe("P-1");
      expect(id2).toBe("P-2");
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].summary).toBe("設計する");
      expect(state.parents["P-1"].laneId).toBe("lane-1");
      expect(state.laneOrder["lane-1"]).toEqual(["P-1", "P-2"]);
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
    it("子アイテムを作成し親に紐付け、投入先レーンに追加する", () => {
      const store = useBoardStore.getState();
      const parentId = store.addParent({ summary: "設計する" });
      const childId = useBoardStore
        .getState()
        .addChild({ parentId, description: "図を描く" });
      expect(childId).toBe("C-1");
      const state = useBoardStore.getState();
      expect(state.children["C-1"].parentId).toBe("P-1");
      expect(state.parents["P-1"].childIds).toContain("C-1");
      expect(state.laneOrder["lane-1"]).toEqual(["P-1", "C-1"]);
    });

    it("存在しない親IDを指定するとエラーになる", () => {
      expect(() =>
        useBoardStore
          .getState()
          .addChild({ parentId: "P-99", description: "作業" }),
      ).toThrow(/P-99/);
    });
  });

  describe("moveItem（レーン間移動）", () => {
    it("親アイテムを別レーンに移動するとlaneIdも変わる", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "設計する" });
      useBoardStore.getState().moveItem("P-1", "lane-2");
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].laneId).toBe("lane-2");
      expect(state.laneOrder["lane-1"]).toEqual([]);
      expect(state.laneOrder["lane-2"]).toEqual(["P-1"]);
    });

    it("子アイテムも移動できる", () => {
      const store = useBoardStore.getState();
      const parentId = store.addParent({ summary: "設計する" });
      useBoardStore.getState().addChild({ parentId, description: "作業" });
      useBoardStore.getState().moveItem("C-1", "lane-3");
      const state = useBoardStore.getState();
      expect(state.children["C-1"].laneId).toBe("lane-3");
      expect(state.laneOrder["lane-3"]).toEqual(["C-1"]);
    });

    it("挿入位置を指定して移動できる", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "A" });
      useBoardStore.getState().addParent({ summary: "B" });
      useBoardStore.getState().moveItem("P-1", "lane-2");
      useBoardStore.getState().moveItem("P-2", "lane-2", 0);
      expect(useBoardStore.getState().laneOrder["lane-2"]).toEqual([
        "P-2",
        "P-1",
      ]);
    });

    it("存在しないIDを移動するとエラーになる", () => {
      expect(() => useBoardStore.getState().moveItem("X-1", "lane-3")).toThrow(
        /X-1/,
      );
    });
  });

  describe("WIP制限", () => {
    function limitLane2To1() {
      const { settings } = useBoardStore.getState();
      useBoardStore.getState().updateSettings({
        projectName: settings.projectName,
        lanes: settings.lanes.map((lane) =>
          lane.id === "lane-2" ? { ...lane, wipLimit: 1 } : lane,
        ),
      });
    }

    it("WIP制限に達したレーンへのmoveItemはエラーになる", () => {
      limitLane2To1();
      useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().addParent({ summary: "B" });
      useBoardStore.getState().moveItem("P-1", "lane-2");
      expect(() => useBoardStore.getState().moveItem("P-2", "lane-2")).toThrow(
        /WIP/,
      );
    });

    it("同一レーン内の位置変更はWIP制限の影響を受けない", () => {
      limitLane2To1();
      useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().moveItem("P-1", "lane-2");
      expect(() =>
        useBoardStore.getState().moveItem("P-1", "lane-2", 0),
      ).not.toThrow();
    });

    it("D&DでWIP制限に達したレーンへ移動しようとすると無視される", () => {
      limitLane2To1();
      useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().addParent({ summary: "B" });
      useBoardStore.getState().moveItem("P-1", "lane-2");
      useBoardStore.getState().handleDragEnd("P-2", "lane-2");
      const state = useBoardStore.getState();
      expect(state.parents["P-2"].laneId).toBe("lane-1");
      expect(state.laneOrder["lane-2"]).toEqual(["P-1"]);
    });

    it("D&Dがブロックされた場合は通知メッセージが設定される", () => {
      limitLane2To1();
      useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().addParent({ summary: "B" });
      useBoardStore.getState().moveItem("P-1", "lane-2");
      expect(useBoardStore.getState().notice).toBeNull();
      useBoardStore.getState().handleDragEnd("P-2", "lane-2");
      expect(useBoardStore.getState().notice).toBe(
        "レーン「作業中」はWIP制限（1）に達しているため移動できません",
      );
    });

    it("移動が成功した場合は通知は設定されない（既存の通知は消える）", () => {
      limitLane2To1();
      useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().addParent({ summary: "B" });
      useBoardStore.getState().moveItem("P-1", "lane-2");
      useBoardStore.getState().handleDragEnd("P-2", "lane-2");
      expect(useBoardStore.getState().notice).not.toBeNull();
      useBoardStore.getState().handleDragEnd("P-2", "lane-3");
      expect(useBoardStore.getState().notice).toBeNull();
    });

    it("clearNoticeで通知を消せる", () => {
      limitLane2To1();
      useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().addParent({ summary: "B" });
      useBoardStore.getState().moveItem("P-1", "lane-2");
      useBoardStore.getState().handleDragEnd("P-2", "lane-2");
      useBoardStore.getState().clearNotice();
      expect(useBoardStore.getState().notice).toBeNull();
    });

    it("D&DでWIP制限レーン内のアイテム上へのドロップ（レーン間移動）も無視される", () => {
      limitLane2To1();
      useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().addParent({ summary: "B" });
      useBoardStore.getState().moveItem("P-1", "lane-2");
      useBoardStore.getState().handleDragEnd("P-2", "P-1");
      expect(useBoardStore.getState().parents["P-2"].laneId).toBe("lane-1");
    });

    it("WIP制限内なら移動できる", () => {
      limitLane2To1();
      useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().handleDragEnd("P-1", "lane-2");
      expect(useBoardStore.getState().parents["P-1"].laneId).toBe("lane-2");
    });
  });

  describe("reorderLane（レーン内並び替え = 優先順位変更）", () => {
    it("レーン内でアイテムの優先順位を入れ替える", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "A" });
      useBoardStore.getState().addParent({ summary: "B" });
      useBoardStore.getState().addParent({ summary: "C" });
      useBoardStore.getState().reorderLane("lane-1", 2, 0);
      expect(useBoardStore.getState().laneOrder["lane-1"]).toEqual([
        "P-3",
        "P-1",
        "P-2",
      ]);
    });
  });

  describe("updateSettings", () => {
    it("プロジェクト名とレーン設定を更新する", () => {
      useBoardStore.getState().updateSettings({
        projectName: "新プロジェクト",
        lanes: [
          createLane({ id: "lane-1", name: "やること", isDefaultEntry: true }),
          createLane({ id: "lane-3", name: "おわり", countsAsDone: true }),
        ],
      });
      const { settings, laneOrder } = useBoardStore.getState();
      expect(settings.projectName).toBe("新プロジェクト");
      expect(settings.lanes.map((l) => l.name)).toEqual(["やること", "おわり"]);
      expect(Object.keys(laneOrder)).toEqual(["lane-1", "lane-3"]);
    });

    it("レーンを追加するとlaneOrderにも空レーンが増える", () => {
      const { settings } = useBoardStore.getState();
      useBoardStore.getState().updateSettings({
        projectName: "P",
        lanes: [
          ...settings.lanes,
          createLane({ id: "lane-6", name: "レビュー" }),
        ],
      });
      expect(useBoardStore.getState().laneOrder["lane-6"]).toEqual([]);
    });

    it("既存アイテムのあるレーンの削除はエラーになる", () => {
      useBoardStore.getState().addParent({ summary: "設計する" });
      useBoardStore.getState().moveItem("P-1", "lane-2");
      const { settings } = useBoardStore.getState();
      expect(() =>
        useBoardStore.getState().updateSettings({
          projectName: "P",
          lanes: settings.lanes.filter((lane) => lane.id !== "lane-2"),
        }),
      ).toThrow(/削除できません/);
    });

    it("プロジェクト名が空の場合はエラーになる", () => {
      const { settings } = useBoardStore.getState();
      expect(() =>
        useBoardStore
          .getState()
          .updateSettings({ projectName: "", lanes: settings.lanes }),
      ).toThrow(/プロジェクト名/);
    });

    it("不正なレーン構成（投入先なし等）はエラーになる", () => {
      expect(() =>
        useBoardStore.getState().updateSettings({
          projectName: "P",
          lanes: [createLane({ id: "lane-1", name: "A" })],
        }),
      ).toThrow(/投入先/);
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
        plannedStartDate: "2026-09-10",
        plannedEndDate: "2026-09-15",
        notes: "備考",
        comments: ["メモ"],
      });
      const parent = useBoardStore.getState().parents["P-1"];
      expect(parent.summary).toBe("詳細設計する");
      expect(parent.size).toBe(5);
      expect(parent.assignee).toBe("野村");
      expect(parent.reason).toBe("重要");
      expect(parent.plannedStartDate).toBe("2026-09-10");
      expect(parent.plannedEndDate).toBe("2026-09-15");
      expect(parent.notes).toBe("備考");
      expect(parent.comments).toEqual(["メモ"]);
    });

    it("IDとレーンと子アイテム一覧は更新できない（他の経路で管理）", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "設計する" });
      useBoardStore.getState().updateParent("P-1", { summary: "変更" });
      const parent = useBoardStore.getState().parents["P-1"];
      expect(parent.id).toBe("P-1");
      expect(parent.laneId).toBe("lane-1");
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
      useBoardStore.getState().handleDragEnd("P-1", "lane-2");
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].laneId).toBe("lane-2");
      expect(state.laneOrder["lane-2"]).toEqual(["P-1"]);
    });

    it("同一レーンのアイテムへのドロップで並び替える", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "A" });
      useBoardStore.getState().addParent({ summary: "B" });
      useBoardStore.getState().handleDragEnd("P-1", "P-2");
      expect(useBoardStore.getState().laneOrder["lane-1"]).toEqual([
        "P-2",
        "P-1",
      ]);
    });

    it("別レーンのアイテムへのドロップでその位置に移動する", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "A" });
      useBoardStore.getState().addParent({ summary: "B" });
      useBoardStore.getState().moveItem("P-2", "lane-2");
      useBoardStore.getState().handleDragEnd("P-1", "P-2");
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].laneId).toBe("lane-2");
      expect(state.laneOrder["lane-2"]).toEqual(["P-1", "P-2"]);
    });

    it("変更が不要な場合（自分自身へのドロップ等）は状態を変えない", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "A" });
      const before = useBoardStore.getState().laneOrder;
      useBoardStore.getState().handleDragEnd("P-1", "P-1");
      expect(useBoardStore.getState().laneOrder).toEqual(before);
    });
  });

  describe("dropItem（Drop = データ保持したまま進捗除外レーンへ）", () => {
    it("アイテムをDrop先レーンに移動しデータは保持する", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "設計する" });
      useBoardStore.getState().moveItem("P-1", "lane-2");
      useBoardStore.getState().dropItem("P-1");
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].laneId).toBe("lane-5");
      expect(state.parents["P-1"].summary).toBe("設計する");
      expect(state.laneOrder["lane-5"]).toEqual(["P-1"]);
      expect(state.laneOrder["lane-2"]).toEqual([]);
    });

    it("親アイテムをDropすると子アイテムもすべてDropされる", () => {
      const store = useBoardStore.getState();
      const parentId = store.addParent({ summary: "設計する" });
      useBoardStore.getState().addChild({ parentId, description: "作業1" });
      useBoardStore.getState().addChild({ parentId, description: "作業2" });
      useBoardStore.getState().moveItem("C-2", "lane-3");
      useBoardStore.getState().dropItem("P-1");
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].laneId).toBe("lane-5");
      expect(state.children["C-1"].laneId).toBe("lane-5");
      expect(state.children["C-2"].laneId).toBe("lane-5");
      expect(state.laneOrder["lane-5"]).toEqual(["P-1", "C-1", "C-2"]);
    });

    it("既にDrop済みの子アイテムはそのまま（二重移動しない）", () => {
      const store = useBoardStore.getState();
      const parentId = store.addParent({ summary: "設計する" });
      useBoardStore.getState().addChild({ parentId, description: "作業1" });
      useBoardStore.getState().dropItem("C-1");
      useBoardStore.getState().dropItem("P-1");
      const state = useBoardStore.getState();
      expect(state.laneOrder["lane-5"]).toEqual(["C-1", "P-1"]);
    });

    it("Drop済みアイテムを再度Dropしても何も起きない", () => {
      useBoardStore.getState().addParent({ summary: "設計する" });
      useBoardStore.getState().dropItem("P-1");
      const before = useBoardStore.getState().laneOrder;
      useBoardStore.getState().dropItem("P-1");
      expect(useBoardStore.getState().laneOrder).toEqual(before);
    });

    it("Drop先レーンのWIP制限に収まらない場合は通知して何も移動しない", () => {
      const { settings } = useBoardStore.getState();
      useBoardStore.getState().updateSettings({
        projectName: settings.projectName,
        lanes: settings.lanes.map((lane) =>
          lane.id === "lane-5" ? { ...lane, wipLimit: 2 } : lane,
        ),
      });
      const parentId = useBoardStore
        .getState()
        .addParent({ summary: "設計する" });
      useBoardStore.getState().addChild({ parentId, description: "作業1" });
      useBoardStore.getState().addChild({ parentId, description: "作業2" });
      useBoardStore.getState().dropItem("P-1");
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].laneId).toBe("lane-1");
      expect(state.laneOrder["lane-5"]).toEqual([]);
      expect(state.notice).toMatch(/WIP制限/);
    });

    it("Drop先レーンがない場合は通知して何もしない", () => {
      useBoardStore.getState().updateSettings({
        projectName: "P",
        lanes: [createLane({ id: "lane-1", name: "A", isDefaultEntry: true })],
      });
      useBoardStore.getState().addParent({ summary: "設計する" });
      useBoardStore.getState().dropItem("P-1");
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].laneId).toBe("lane-1");
      expect(state.notice).toMatch(/Drop先/);
    });
  });

  describe("hydrate / selectPersisted（永続化）", () => {
    it("selectPersistedで永続化対象の状態を取り出せる", async () => {
      const { selectPersisted } = await import("./boardStore");
      useBoardStore.getState().addParent({ summary: "設計する" });
      const persisted = selectPersisted(useBoardStore.getState());
      expect(persisted.settings.projectName).toBe("札帖");
      expect(persisted.parents["P-1"].summary).toBe("設計する");
      expect(persisted.laneOrder["lane-1"]).toEqual(["P-1"]);
      expect(persisted.nextParentNumber).toBe(2);
      expect(Object.keys(persisted)).toEqual([
        "settings",
        "parents",
        "children",
        "laneOrder",
        "nextParentNumber",
        "nextChildNumber",
      ]);
    });

    it("hydrateで保存済みの状態を復元できる", async () => {
      const { selectPersisted } = await import("./boardStore");
      useBoardStore.getState().addParent({ summary: "設計する" });
      useBoardStore.getState().moveItem("P-1", "lane-2");
      const persisted = selectPersisted(useBoardStore.getState());
      useBoardStore.getState().reset();
      expect(useBoardStore.getState().parents).toEqual({});
      useBoardStore.getState().hydrate(persisted);
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].laneId).toBe("lane-2");
      expect(state.laneOrder["lane-2"]).toEqual(["P-1"]);
      expect(state.addParent({ summary: "新規" })).toBe("P-2");
    });

    it("コメント導入前の保存データもhydrateで安全に読み込める（comments補完）", async () => {
      const { selectPersisted } = await import("./boardStore");
      const parentId = useBoardStore
        .getState()
        .addParent({ summary: "設計する" });
      useBoardStore.getState().addChild({ parentId, description: "作業" });
      const persisted = selectPersisted(useBoardStore.getState());
      const legacyChild = { ...persisted.children["C-1"] } as Record<
        string,
        unknown
      >;
      delete legacyChild.comments;
      const legacy = {
        ...persisted,
        children: { "C-1": legacyChild },
      } as unknown as typeof persisted;
      useBoardStore.getState().reset();
      useBoardStore.getState().hydrate(legacy);
      expect(useBoardStore.getState().children["C-1"].comments).toEqual([]);
    });

    it("ラベル導入前の保存データもhydrateで安全に読み込める（labels補完）", async () => {
      const { selectPersisted } = await import("./boardStore");
      const parentId = useBoardStore
        .getState()
        .addParent({ summary: "設計する" });
      useBoardStore.getState().addChild({ parentId, description: "作業" });
      const persisted = selectPersisted(useBoardStore.getState());
      const legacyParent = { ...persisted.parents["P-1"] } as Record<
        string,
        unknown
      >;
      delete legacyParent.labels;
      const legacyChild = { ...persisted.children["C-1"] } as Record<
        string,
        unknown
      >;
      delete legacyChild.labels;
      const legacy = {
        ...persisted,
        parents: { "P-1": legacyParent },
        children: { "C-1": legacyChild },
      } as unknown as typeof persisted;
      useBoardStore.getState().reset();
      useBoardStore.getState().hydrate(legacy);
      expect(useBoardStore.getState().parents["P-1"].labels).toEqual([]);
      expect(useBoardStore.getState().children["C-1"].labels).toEqual([]);
    });

    it("不正なレーン構成のhydrateはエラーになり状態は変わらない", async () => {
      const { selectPersisted } = await import("./boardStore");
      const persisted = selectPersisted(useBoardStore.getState());
      const broken = {
        ...persisted,
        settings: { projectName: "x", lanes: [] },
      };
      expect(() => useBoardStore.getState().hydrate(broken)).toThrow(/レーン/);
    });
  });

  describe("deleteItem（完全削除）", () => {
    it("子アイテムを削除すると親のchildIdsとレーンからも取り除かれる", () => {
      const store = useBoardStore.getState();
      const parentId = store.addParent({ summary: "設計する" });
      useBoardStore.getState().addChild({ parentId, description: "作業1" });
      useBoardStore.getState().addChild({ parentId, description: "作業2" });
      useBoardStore.getState().deleteItem("C-1");
      const state = useBoardStore.getState();
      expect(state.children["C-1"]).toBeUndefined();
      expect(state.parents["P-1"].childIds).toEqual(["C-2"]);
      expect(state.laneOrder["lane-1"]).toEqual(["P-1", "C-2"]);
    });

    it("親アイテムを削除すると子アイテムもすべて削除される", () => {
      const store = useBoardStore.getState();
      const parentId = store.addParent({ summary: "設計する" });
      useBoardStore.getState().addChild({ parentId, description: "作業1" });
      useBoardStore.getState().addChild({ parentId, description: "作業2" });
      useBoardStore.getState().moveItem("C-2", "lane-3");
      useBoardStore.getState().deleteItem("P-1");
      const state = useBoardStore.getState();
      expect(state.parents["P-1"]).toBeUndefined();
      expect(state.children).toEqual({});
      expect(state.laneOrder["lane-1"]).toEqual([]);
      expect(state.laneOrder["lane-3"]).toEqual([]);
    });

    it("他のアイテムには影響しない", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "残すタスク" });
      useBoardStore.getState().addParent({ summary: "消すタスク" });
      useBoardStore.getState().deleteItem("P-2");
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].summary).toBe("残すタスク");
      expect(state.laneOrder["lane-1"]).toEqual(["P-1"]);
    });

    it("存在しないIDの削除はエラーになる", () => {
      expect(() => useBoardStore.getState().deleteItem("X-1")).toThrow(/X-1/);
    });
  });

  describe("exportMarkdown", () => {
    it("現在のボードをマークダウンとして出力する（レーン順・レーン名表記）", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "設計する", size: 5 });
      useBoardStore.getState().addParent({ summary: "実装する" });
      useBoardStore
        .getState()
        .addChild({ parentId: "P-1", description: "図を描く" });
      useBoardStore.getState().moveItem("P-2", "lane-2");
      const md = useBoardStore.getState().exportMarkdown();
      expect(md).toContain("# 札帖");
      expect(md).toContain("## P-1: 設計する");
      expect(md).toContain("- サイズ: 5");
      expect(md).toContain("## P-2: 実装する");
      expect(md).toContain("- レーン: 作業中");
      expect(md).toContain("- [ ] C-1: 図を描く");
      // レーン順: 未着手のP-1が先、作業中のP-2が後
      expect(md.indexOf("## P-1")).toBeLessThan(md.indexOf("## P-2"));
    });
  });

  describe("importMarkdown", () => {
    const md = `# 輸入プロジェクト

## P-1: 設計する
- レーン: 作業中
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
      expect(state.children["C-1"].laneId).toBe("lane-3");
      expect(state.laneOrder["lane-2"]).toEqual(["P-1"]);
      expect(state.laneOrder["lane-3"]).toEqual(["C-1"]);
      expect(state.laneOrder["lane-1"]).toEqual(["C-2", "P-3"]);
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

    it("レーン設定セクションがあればレーン構成も置き換えられる", () => {
      useBoardStore.getState().importMarkdown(`# レーン付き

## レーン設定
- lane-1: 受付 (投入先)
- lane-2: 済 (完了扱い)

## P-1: 設計する
- レーン: 済
`);
      const state = useBoardStore.getState();
      expect(state.settings.lanes.map((l) => l.name)).toEqual(["受付", "済"]);
      expect(Object.keys(state.laneOrder)).toEqual(["lane-1", "lane-2"]);
      expect(state.parents["P-1"].laneId).toBe("lane-2");
    });

    it("不正なレーン設定（投入先なし）のインポートはエラーになる", () => {
      expect(() =>
        useBoardStore.getState().importMarkdown(`# P

## レーン設定
- lane-1: 受付
`),
      ).toThrow(/投入先/);
    });

    it("レーン設定込みのエクスポートを再インポートするとレーンも復元される（ラウンドトリップ）", () => {
      const { settings } = useBoardStore.getState();
      useBoardStore.getState().updateSettings({
        projectName: settings.projectName,
        lanes: settings.lanes.map((lane) =>
          lane.id === "lane-2"
            ? { ...lane, name: "進行中", wipLimit: 4 }
            : lane,
        ),
      });
      const exported = useBoardStore.getState().exportMarkdown();
      useBoardStore.getState().reset();
      useBoardStore.getState().importMarkdown(exported);
      const lane2 = useBoardStore
        .getState()
        .settings.lanes.find((l) => l.id === "lane-2");
      expect(lane2).toMatchObject({ name: "進行中", wipLimit: 4 });
      expect(useBoardStore.getState().exportMarkdown()).toBe(exported);
    });

    it("エクスポートしたマークダウンを再インポートできる（ラウンドトリップ）", () => {
      const store = useBoardStore.getState();
      store.addParent({ summary: "設計する", size: 8, assignee: "野村" });
      useBoardStore
        .getState()
        .addChild({ parentId: "P-1", description: "図を描く" });
      useBoardStore.getState().moveItem("C-1", "lane-3");
      const exported = useBoardStore.getState().exportMarkdown();
      useBoardStore.getState().importMarkdown(exported);
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].size).toBe(8);
      expect(state.children["C-1"].laneId).toBe("lane-3");
      expect(state.exportMarkdown()).toBe(exported);
    });
  });
});
