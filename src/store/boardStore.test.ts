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
