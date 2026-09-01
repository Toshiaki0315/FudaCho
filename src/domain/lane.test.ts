import { describe, expect, it } from "vitest";
import {
  canAcceptMore,
  createDefaultLanes,
  createLane,
  findDefaultEntryLane,
  findDropLane,
  validateLanes,
} from "./lane";

describe("createDefaultLanes", () => {
  it("従来の5レーン相当のデフォルトレーンを生成する", () => {
    const lanes = createDefaultLanes();
    expect(lanes.map((l) => l.name)).toEqual([
      "未着手",
      "作業中",
      "完了",
      "クローズ",
      "中断",
    ]);
  });

  it("各レーンは不変の一意なIDを持つ", () => {
    const lanes = createDefaultLanes();
    const ids = lanes.map((l) => l.id);
    expect(new Set(ids).size).toBe(5);
    for (const id of ids) {
      expect(id).toMatch(/^lane-\d+$/);
    }
  });

  it("「未着手」だけが新規アイテムの投入先である", () => {
    const lanes = createDefaultLanes();
    expect(lanes.filter((l) => l.isDefaultEntry).map((l) => l.name)).toEqual([
      "未着手",
    ]);
  });

  it("「完了」「クローズ」は進捗率の完了扱いである", () => {
    const lanes = createDefaultLanes();
    expect(lanes.filter((l) => l.countsAsDone).map((l) => l.name)).toEqual([
      "完了",
      "クローズ",
    ]);
  });

  it("「中断」は進捗率の分母から除外される", () => {
    const lanes = createDefaultLanes();
    expect(
      lanes.filter((l) => l.excludedFromProgress).map((l) => l.name),
    ).toEqual(["中断"]);
  });

  it("デフォルトではどのレーンもDrop操作を持たない（Droppedへの移動はD&Dで行う）", () => {
    const lanes = createDefaultLanes();
    expect(lanes.filter((l) => l.hasDropAction)).toEqual([]);
  });

  it("デフォルトではWIP制限なし・全レーンへ移動可能である", () => {
    for (const lane of createDefaultLanes()) {
      expect(lane.wipLimit).toBeNull();
      expect(lane.moveTargets).toBe("all");
    }
  });
});

describe("createLane", () => {
  it("IDと名前だけ指定すると他はデフォルト属性になる", () => {
    const lane = createLane({ id: "lane-9", name: "レビュー" });
    expect(lane).toEqual({
      id: "lane-9",
      name: "レビュー",
      wipLimit: null,
      moveTargets: "all",
      hasDropAction: false,
      countsAsDone: false,
      excludedFromProgress: false,
      isDefaultEntry: false,
    });
  });

  it("属性を指定して作成できる", () => {
    const lane = createLane({
      id: "lane-9",
      name: "レビュー",
      wipLimit: 3,
      countsAsDone: true,
    });
    expect(lane.wipLimit).toBe(3);
    expect(lane.countsAsDone).toBe(true);
  });
});

describe("validateLanes", () => {
  it("デフォルトレーンは妥当である", () => {
    expect(() => validateLanes(createDefaultLanes())).not.toThrow();
  });

  it("0件はエラーになる", () => {
    expect(() => validateLanes([])).toThrow(/レーン/);
  });

  it("IDの重複はエラーになる", () => {
    const lanes = [
      createLane({ id: "lane-1", name: "A", isDefaultEntry: true }),
      createLane({ id: "lane-1", name: "B" }),
    ];
    expect(() => validateLanes(lanes)).toThrow(/重複/);
  });

  it("空のレーン名はエラーになる", () => {
    const lanes = [
      createLane({ id: "lane-1", name: "", isDefaultEntry: true }),
    ];
    expect(() => validateLanes(lanes)).toThrow(/レーン名/);
  });

  it("新規投入先レーンがちょうど1つでない場合はエラーになる", () => {
    expect(() =>
      validateLanes([createLane({ id: "lane-1", name: "A" })]),
    ).toThrow(/投入先/);
    expect(() =>
      validateLanes([
        createLane({ id: "lane-1", name: "A", isDefaultEntry: true }),
        createLane({ id: "lane-2", name: "B", isDefaultEntry: true }),
      ]),
    ).toThrow(/投入先/);
  });

  it("WIP制限は1〜99の整数またはnullのみ許容する", () => {
    const base = { id: "lane-1", name: "A", isDefaultEntry: true };
    expect(() => validateLanes([createLane({ ...base, wipLimit: 0 })])).toThrow(
      /WIP/,
    );
    expect(() =>
      validateLanes([createLane({ ...base, wipLimit: 100 })]),
    ).toThrow(/WIP/);
    expect(() =>
      validateLanes([createLane({ ...base, wipLimit: 1.5 })]),
    ).toThrow(/WIP/);
    expect(() =>
      validateLanes([createLane({ ...base, wipLimit: 1 })]),
    ).not.toThrow();
    expect(() =>
      validateLanes([createLane({ ...base, wipLimit: 99 })]),
    ).not.toThrow();
  });
});

describe("canAcceptMore", () => {
  it("WIP制限なしのレーンは常に受け入れ可能", () => {
    const lane = createLane({ id: "lane-1", name: "A" });
    expect(canAcceptMore(lane, 999)).toBe(true);
  });

  it("WIP制限未満なら受け入れ可能、以上なら不可", () => {
    const lane = createLane({ id: "lane-1", name: "A", wipLimit: 2 });
    expect(canAcceptMore(lane, 0)).toBe(true);
    expect(canAcceptMore(lane, 1)).toBe(true);
    expect(canAcceptMore(lane, 2)).toBe(false);
    expect(canAcceptMore(lane, 3)).toBe(false);
  });
});

describe("findDefaultEntryLane / findDropLane", () => {
  it("新規投入先レーンを返す", () => {
    const lanes = createDefaultLanes();
    expect(findDefaultEntryLane(lanes).name).toBe("未着手");
  });

  it("Drop先（進捗除外）レーンを返す", () => {
    const lanes = createDefaultLanes();
    expect(findDropLane(lanes)?.name).toBe("中断");
  });

  it("Drop先レーンがない場合はnullを返す", () => {
    const lanes = [
      createLane({ id: "lane-1", name: "A", isDefaultEntry: true }),
    ];
    expect(findDropLane(lanes)).toBeNull();
  });
});
