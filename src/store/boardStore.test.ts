import { beforeEach, describe, expect, it } from "vitest";
import { useBoardStore } from "./boardStore";

// デフォルトレーン: lane-1=PBL, lane-2=SBL, lane-3=作業中(自由), lane-4=Close, lane-5=Drop

describe("boardStore", () => {
  beforeEach(() => {
    useBoardStore.getState().reset();
  });

  describe("初期状態", () => {
    it("デフォルト設定を持ち、アイテムは空である", () => {
      const state = useBoardStore.getState();
      expect(state.settings.projectName).toBe("札帖");
      expect(state.settings.lanes.map((l) => l.role)).toEqual([
        "pbl",
        "sbl",
        "free",
        "close",
        "drop",
      ]);
      expect(state.parents).toEqual({});
      expect(state.children).toEqual({});
    });
  });

  describe("addParent", () => {
    it("親アイテムはPBLレーンの末尾に作成され、IDは連番で採番される", () => {
      const store = useBoardStore.getState();
      expect(store.addParent({ summary: "設計する" })).toBe("P-1");
      expect(useBoardStore.getState().addParent({ summary: "実装する" })).toBe(
        "P-2",
      );
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].laneId).toBe("lane-1");
      expect(state.laneOrder["lane-1"]).toEqual(["P-1", "P-2"]);
    });
  });

  describe("addChild", () => {
    it("親付きの子アイテムはSBLレーンに作成され、親に紐付く", () => {
      const store = useBoardStore.getState();
      const parentId = store.addParent({ summary: "設計する" });
      const childId = useBoardStore
        .getState()
        .addChild({ parentId, description: "図を描く" });
      expect(childId).toBe("C-1");
      const state = useBoardStore.getState();
      expect(state.children["C-1"].parentId).toBe("P-1");
      expect(state.children["C-1"].laneId).toBe("lane-2");
      expect(state.parents["P-1"].childIds).toContain("C-1");
      expect(state.laneOrder["lane-2"]).toEqual(["C-1"]);
    });

    it("親なしの子アイテムも作成できる（parentId: null）", () => {
      useBoardStore.getState().addChild({ description: "独立タスク" });
      const state = useBoardStore.getState();
      expect(state.children["C-1"].parentId).toBeNull();
      expect(state.children["C-1"].laneId).toBe("lane-2");
    });

    it("存在しない親IDを指定するとエラーになる", () => {
      expect(() =>
        useBoardStore
          .getState()
          .addChild({ parentId: "P-99", description: "作業" }),
      ).toThrow(/P-99/);
    });
  });

  describe("移動制限", () => {
    it("親アイテムはPBL・Close・Drop以外へは移動できない", () => {
      useBoardStore.getState().addParent({ summary: "A" });
      expect(() => useBoardStore.getState().moveItem("P-1", "lane-2")).toThrow(
        /PBL・Close・Drop/,
      );
      expect(() => useBoardStore.getState().moveItem("P-1", "lane-3")).toThrow(
        /PBL・Close・Drop/,
      );
      useBoardStore.getState().moveItem("P-1", "lane-5");
      expect(useBoardStore.getState().parents["P-1"].laneId).toBe("lane-5");
    });

    it("Closeした親アイテムはPBLへ戻せる", () => {
      useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().moveItem("P-1", "lane-4");
      useBoardStore.getState().moveItem("P-1", "lane-1");
      expect(useBoardStore.getState().parents["P-1"].laneId).toBe("lane-1");
      expect(useBoardStore.getState().laneOrder["lane-1"]).toEqual(["P-1"]);
    });

    it("Dropした親アイテムはPBLへ戻せる", () => {
      useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().dropItem("P-1");
      useBoardStore.getState().moveItem("P-1", "lane-1");
      expect(useBoardStore.getState().parents["P-1"].laneId).toBe("lane-1");
    });

    it("未完了の子アイテムがある親はCloseできない", () => {
      const parentId = useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().addChild({ parentId, description: "作業" });
      expect(() => useBoardStore.getState().moveItem("P-1", "lane-4")).toThrow(
        /未完了の子アイテム/,
      );
    });

    it("全子アイテムがClose/Drop済みなら親をCloseできる", () => {
      const parentId = useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().addChild({ parentId, description: "作業1" });
      useBoardStore.getState().addChild({ parentId, description: "作業2" });
      useBoardStore.getState().moveItem("C-1", "lane-4");
      useBoardStore.getState().moveItem("C-2", "lane-5");
      useBoardStore.getState().moveItem("P-1", "lane-4");
      expect(useBoardStore.getState().parents["P-1"].laneId).toBe("lane-4");
    });

    it("子アイテムはPBL以外のレーンへ移動できる", () => {
      useBoardStore.getState().addChild({ description: "作業" });
      useBoardStore.getState().moveItem("C-1", "lane-3");
      expect(useBoardStore.getState().children["C-1"].laneId).toBe("lane-3");
      expect(() => useBoardStore.getState().moveItem("C-1", "lane-1")).toThrow(
        /PBL/,
      );
    });

    it("存在しないIDを移動するとエラーになる", () => {
      expect(() => useBoardStore.getState().moveItem("X-1", "lane-3")).toThrow(
        /X-1/,
      );
    });

    it("存在しないレーンへの移動はエラーになる", () => {
      useBoardStore.getState().addChild({ description: "作業" });
      expect(() => useBoardStore.getState().moveItem("C-1", "lane-99")).toThrow(
        /lane-99/,
      );
    });

    it("D&Dで移動できない場合は通知が設定され、移動は行われない", () => {
      const parentId = useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().addChild({ parentId, description: "作業" });
      useBoardStore.getState().handleDragEnd("P-1", "lane-4");
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].laneId).toBe("lane-1");
      expect(state.notice).toMatch(/未完了の子アイテム/);
    });

    it("移動が成功すると通知は消える", () => {
      useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().handleDragEnd("P-1", "lane-2");
      expect(useBoardStore.getState().notice).toMatch(/PBL・Close・Drop/);
      useBoardStore.getState().handleDragEnd("P-1", "lane-5");
      expect(useBoardStore.getState().notice).toBeNull();
      expect(useBoardStore.getState().parents["P-1"].laneId).toBe("lane-5");
    });

    it("clearNoticeで通知を消せる", () => {
      useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().handleDragEnd("P-1", "lane-2");
      useBoardStore.getState().clearNotice();
      expect(useBoardStore.getState().notice).toBeNull();
    });
  });

  describe("WIP制限", () => {
    function limitLane3To1() {
      const { settings } = useBoardStore.getState();
      useBoardStore.getState().updateSettings({
        projectName: settings.projectName,
        lanes: settings.lanes.map((lane) =>
          lane.id === "lane-3" ? { ...lane, wipLimit: 1 } : lane,
        ),
      });
    }

    it("WIP制限に達したレーンへのmoveItemはエラーになる", () => {
      limitLane3To1();
      useBoardStore.getState().addChild({ description: "A" });
      useBoardStore.getState().addChild({ description: "B" });
      useBoardStore.getState().moveItem("C-1", "lane-3");
      expect(() => useBoardStore.getState().moveItem("C-2", "lane-3")).toThrow(
        /WIP/,
      );
    });

    it("同一レーン内の位置変更はWIP制限の影響を受けない", () => {
      limitLane3To1();
      useBoardStore.getState().addChild({ description: "A" });
      useBoardStore.getState().moveItem("C-1", "lane-3");
      expect(() =>
        useBoardStore.getState().moveItem("C-1", "lane-3", 0),
      ).not.toThrow();
    });

    it("D&Dで子アイテムを別レーンへ移動でき、成功すると通知は消える", () => {
      useBoardStore.getState().addChild({ description: "A" });
      useBoardStore.getState().handleDragEnd("C-1", "lane-1");
      expect(useBoardStore.getState().notice).not.toBeNull();
      useBoardStore.getState().handleDragEnd("C-1", "lane-3");
      const state = useBoardStore.getState();
      expect(state.children["C-1"].laneId).toBe("lane-3");
      expect(state.notice).toBeNull();
    });

    it("D&DでWIP制限に達したレーンへ移動すると通知され、移動は行われない", () => {
      limitLane3To1();
      useBoardStore.getState().addChild({ description: "A" });
      useBoardStore.getState().addChild({ description: "B" });
      useBoardStore.getState().moveItem("C-1", "lane-3");
      useBoardStore.getState().handleDragEnd("C-2", "lane-3");
      const state = useBoardStore.getState();
      expect(state.children["C-2"].laneId).toBe("lane-2");
      expect(state.notice).toBe(
        "レーン「作業中」はWIP制限（1）に達しているため移動できません",
      );
    });

    it("D&DでWIP制限レーン内のアイテム上へのドロップも通知される", () => {
      limitLane3To1();
      useBoardStore.getState().addChild({ description: "A" });
      useBoardStore.getState().addChild({ description: "B" });
      useBoardStore.getState().moveItem("C-1", "lane-3");
      useBoardStore.getState().handleDragEnd("C-2", "C-1");
      expect(useBoardStore.getState().children["C-2"].laneId).toBe("lane-2");
    });
  });

  describe("reorderLane（レーン内並び替え = 優先順位変更）", () => {
    it("PBL内で親アイテムの優先順位を入れ替える", () => {
      useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().addParent({ summary: "B" });
      useBoardStore.getState().addParent({ summary: "C" });
      useBoardStore.getState().reorderLane("lane-1", 2, 0);
      expect(useBoardStore.getState().laneOrder["lane-1"]).toEqual([
        "P-3",
        "P-1",
        "P-2",
      ]);
    });

    it("D&Dで同一レーン内の並び替えができる", () => {
      useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().addParent({ summary: "B" });
      useBoardStore.getState().handleDragEnd("P-1", "P-2");
      expect(useBoardStore.getState().laneOrder["lane-1"]).toEqual([
        "P-2",
        "P-1",
      ]);
    });
  });

  describe("updateSettings", () => {
    it("プロジェクト名・レーン名・自由レーンの構成を更新できる", () => {
      const { settings } = useBoardStore.getState();
      useBoardStore.getState().updateSettings({
        projectName: "新プロジェクト",
        lanes: [
          { ...settings.lanes[0], name: "要求一覧" },
          settings.lanes[1],
          settings.lanes[2],
          { id: "lane-6", name: "レビュー", role: "free", wipLimit: null },
          settings.lanes[3],
          settings.lanes[4],
        ],
      });
      const state = useBoardStore.getState();
      expect(state.settings.projectName).toBe("新プロジェクト");
      expect(state.settings.lanes.map((l) => l.name)).toEqual([
        "要求一覧",
        "SBL",
        "作業中",
        "レビュー",
        "Close",
        "Drop",
      ]);
      expect(state.laneOrder["lane-6"]).toEqual([]);
    });

    it("固定役割を欠く構成はエラーになる", () => {
      const { settings } = useBoardStore.getState();
      expect(() =>
        useBoardStore.getState().updateSettings({
          projectName: "P",
          lanes: settings.lanes.filter((lane) => lane.role !== "close"),
        }),
      ).toThrow(/役割/);
    });

    it("既存アイテムのあるレーンの削除はエラーになる", () => {
      useBoardStore.getState().addChild({ description: "作業" });
      useBoardStore.getState().moveItem("C-1", "lane-3");
      const { settings } = useBoardStore.getState();
      expect(() =>
        useBoardStore.getState().updateSettings({
          projectName: "P",
          lanes: settings.lanes.map((lane) =>
            lane.id === "lane-3"
              ? {
                  id: "lane-6",
                  name: "新自由",
                  role: "free" as const,
                  wipLimit: null,
                }
              : lane,
          ),
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
  });

  describe("updateParent / updateChild", () => {
    it("親アイテムのフィールドとReadyを更新する", () => {
      useBoardStore
        .getState()
        .addParent({ summary: "設計する", reason: "理由" });
      useBoardStore.getState().updateParent("P-1", {
        summary: "詳細設計する",
        ready: true,
      });
      const parent = useBoardStore.getState().parents["P-1"];
      expect(parent.summary).toBe("詳細設計する");
      expect(parent.ready).toBe(true);
      expect(parent.laneId).toBe("lane-1");
    });

    it("子アイテムのフィールドを更新する", () => {
      useBoardStore.getState().addChild({ description: "作業" });
      useBoardStore
        .getState()
        .updateChild("C-1", { description: "作業を変更", estimatedHours: 4 });
      const child = useBoardStore.getState().children["C-1"];
      expect(child.description).toBe("作業を変更");
      expect(child.estimatedHours).toBe(4);
    });

    it("存在しないIDの更新はエラーになる", () => {
      expect(() =>
        useBoardStore.getState().updateParent("P-99", { summary: "x" }),
      ).toThrow(/P-99/);
      expect(() =>
        useBoardStore.getState().updateChild("C-99", { description: "x" }),
      ).toThrow(/C-99/);
    });
  });

  describe("dropItem（Drop = データ保持したままDropレーンへ）", () => {
    it("親アイテムをDropすると子アイテムもすべてDropされる", () => {
      const parentId = useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().addChild({ parentId, description: "作業1" });
      useBoardStore.getState().addChild({ parentId, description: "作業2" });
      useBoardStore.getState().moveItem("C-2", "lane-4");
      useBoardStore.getState().dropItem("P-1");
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].laneId).toBe("lane-5");
      expect(state.children["C-1"].laneId).toBe("lane-5");
      expect(state.children["C-2"].laneId).toBe("lane-5");
      expect(state.laneOrder["lane-5"]).toEqual(["P-1", "C-1", "C-2"]);
    });

    it("Drop済みアイテムを再度Dropしても何も起きない", () => {
      useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().dropItem("P-1");
      const before = useBoardStore.getState().laneOrder;
      useBoardStore.getState().dropItem("P-1");
      expect(useBoardStore.getState().laneOrder).toEqual(before);
    });

    it("D&Dで親アイテムをDropレーンへ移動すると子アイテムもすべてDropされる", () => {
      const parentId = useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().addChild({ parentId, description: "作業1" });
      useBoardStore.getState().addChild({ parentId, description: "作業2" });
      useBoardStore.getState().moveItem("C-2", "lane-3");
      useBoardStore.getState().handleDragEnd("P-1", "lane-5");
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].laneId).toBe("lane-5");
      expect(state.children["C-1"].laneId).toBe("lane-5");
      expect(state.children["C-2"].laneId).toBe("lane-5");
    });

    it("D&Dの親Dropで子を含めるとWIP制限に収まらない場合は通知して何も移動しない", () => {
      const { settings } = useBoardStore.getState();
      useBoardStore.getState().updateSettings({
        projectName: settings.projectName,
        lanes: settings.lanes.map((lane) =>
          lane.role === "drop" ? { ...lane, wipLimit: 2 } : lane,
        ),
      });
      const parentId = useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().addChild({ parentId, description: "作業1" });
      useBoardStore.getState().addChild({ parentId, description: "作業2" });
      useBoardStore.getState().handleDragEnd("P-1", "lane-5");
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].laneId).toBe("lane-1");
      expect(state.laneOrder["lane-5"]).toEqual([]);
      expect(state.notice).toMatch(/WIP制限/);
    });

    it("Dropに成功すると通知は消える", () => {
      useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().handleDragEnd("P-1", "lane-2");
      expect(useBoardStore.getState().notice).not.toBeNull();
      useBoardStore.getState().dropItem("P-1");
      expect(useBoardStore.getState().notice).toBeNull();
    });

    it("Drop先レーンのWIP制限に収まらない場合は通知して何も移動しない", () => {
      const { settings } = useBoardStore.getState();
      useBoardStore.getState().updateSettings({
        projectName: settings.projectName,
        lanes: settings.lanes.map((lane) =>
          lane.role === "drop" ? { ...lane, wipLimit: 2 } : lane,
        ),
      });
      const parentId = useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().addChild({ parentId, description: "作業1" });
      useBoardStore.getState().addChild({ parentId, description: "作業2" });
      useBoardStore.getState().dropItem("P-1");
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].laneId).toBe("lane-1");
      expect(state.laneOrder["lane-5"]).toEqual([]);
      expect(state.notice).toMatch(/WIP制限/);
    });
  });

  describe("deleteItem（完全削除）", () => {
    it("子アイテムを削除すると親のchildIdsとレーンからも取り除かれる", () => {
      const parentId = useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().addChild({ parentId, description: "作業1" });
      useBoardStore.getState().addChild({ parentId, description: "作業2" });
      useBoardStore.getState().deleteItem("C-1");
      const state = useBoardStore.getState();
      expect(state.children["C-1"]).toBeUndefined();
      expect(state.parents["P-1"].childIds).toEqual(["C-2"]);
      expect(state.laneOrder["lane-2"]).toEqual(["C-2"]);
    });

    it("親なし子アイテムも削除できる", () => {
      useBoardStore.getState().addChild({ description: "独立タスク" });
      useBoardStore.getState().deleteItem("C-1");
      expect(useBoardStore.getState().children).toEqual({});
    });

    it("親アイテムを削除すると子アイテムもすべて削除される", () => {
      const parentId = useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().addChild({ parentId, description: "作業1" });
      useBoardStore.getState().moveItem("C-1", "lane-3");
      useBoardStore.getState().deleteItem("P-1");
      const state = useBoardStore.getState();
      expect(state.parents).toEqual({});
      expect(state.children).toEqual({});
      expect(state.laneOrder["lane-3"]).toEqual([]);
    });

    it("存在しないIDの削除はエラーになる", () => {
      expect(() => useBoardStore.getState().deleteItem("X-1")).toThrow(/X-1/);
    });
  });

  describe("hydrate / selectPersisted（永続化）", () => {
    it("保存した状態を復元できる", async () => {
      const { selectPersisted } = await import("./boardStore");
      const parentId = useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().addChild({ parentId, description: "作業" });
      const persisted = selectPersisted(useBoardStore.getState());
      useBoardStore.getState().reset();
      useBoardStore.getState().hydrate(persisted);
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].summary).toBe("A");
      expect(state.children["C-1"].laneId).toBe("lane-2");
      expect(state.addParent({ summary: "新規" })).toBe("P-2");
    });

    it("タイトル導入前の保存データもhydrateで安全に読み込める（title補完）", async () => {
      const { selectPersisted } = await import("./boardStore");
      const parentId = useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().addChild({ parentId, description: "作業" });
      const persisted = selectPersisted(useBoardStore.getState());
      const legacyParent = { ...persisted.parents["P-1"] } as Record<
        string,
        unknown
      >;
      delete legacyParent.title;
      const legacyChild = { ...persisted.children["C-1"] } as Record<
        string,
        unknown
      >;
      delete legacyChild.title;
      const legacy = {
        ...persisted,
        parents: { "P-1": legacyParent },
        children: { "C-1": legacyChild },
      } as unknown as typeof persisted;
      useBoardStore.getState().reset();
      useBoardStore.getState().hydrate(legacy);
      expect(useBoardStore.getState().parents["P-1"].title).toBe("");
      expect(useBoardStore.getState().children["C-1"].title).toBe("");
    });

    it("不正なレーン構成のhydrateはエラーになる", async () => {
      const { selectPersisted } = await import("./boardStore");
      const persisted = selectPersisted(useBoardStore.getState());
      const broken = {
        ...persisted,
        settings: { projectName: "x", lanes: [] },
      };
      expect(() => useBoardStore.getState().hydrate(broken)).toThrow(/役割/);
    });
  });

  describe("exportMarkdown / importMarkdown", () => {
    it("親なし子アイテムを含めてラウンドトリップできる", () => {
      const parentId = useBoardStore
        .getState()
        .addParent({ summary: "設計する", reason: "理由", labels: ["設計"] });
      useBoardStore.getState().addChild({ parentId, description: "図を描く" });
      useBoardStore.getState().addChild({ description: "独立タスク" });
      useBoardStore.getState().updateParent("P-1", { ready: true });
      useBoardStore.getState().moveItem("C-1", "lane-4");
      const exported = useBoardStore.getState().exportMarkdown();
      expect(exported).toContain("## 親なし子アイテム");
      useBoardStore.getState().reset();
      useBoardStore.getState().importMarkdown(exported);
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].ready).toBe(true);
      expect(state.children["C-1"].laneId).toBe("lane-4");
      expect(state.children["C-2"].parentId).toBeNull();
      expect(state.exportMarkdown()).toBe(exported);
    });

    it("レーン設定セクションがあればレーン構成も置き換えられる", () => {
      useBoardStore.getState().importMarkdown(`# レーン付き

## レーン設定
- lane-1: 要求 (役割: PBL)
- lane-2: タスク (役割: SBL)
- lane-7: 検証中
- lane-4: 済 (役割: Close)
- lane-5: 破棄 (役割: Drop)

## P-1: 設計する
`);
      const state = useBoardStore.getState();
      expect(state.settings.lanes.map((l) => l.name)).toEqual([
        "要求",
        "タスク",
        "検証中",
        "済",
        "破棄",
      ]);
      expect(state.parents["P-1"].laneId).toBe("lane-1");
    });

    it("不正なレーン構成のインポートはエラーになる", () => {
      expect(() =>
        useBoardStore.getState().importMarkdown(`# P

## レーン設定
- lane-1: 要求 (役割: PBL)
`),
      ).toThrow(/役割/);
    });

    it("インポート後の採番は既存IDと重複しない", () => {
      useBoardStore.getState().importMarkdown(`# P

## P-3: 設計する

## 親なし子アイテム
- [ ] C-5: 独立タスク
`);
      expect(useBoardStore.getState().addParent({ summary: "新規" })).toBe(
        "P-4",
      );
      expect(useBoardStore.getState().addChild({ description: "追加" })).toBe(
        "C-6",
      );
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
  });
});
