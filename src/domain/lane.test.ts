import { describe, expect, it } from "vitest";
import {
  canAcceptMore,
  createDefaultLanes,
  createLane,
  findLaneByRole,
  isFixedRole,
  validateLanes,
} from "./lane";

describe("createDefaultLanes", () => {
  it("PBL・SBL・自由レーン・Close・Dropの5レーンを生成する", () => {
    const lanes = createDefaultLanes();
    expect(lanes.map((l) => l.name)).toEqual([
      "PBL",
      "SBL",
      "作業中",
      "Close",
      "Drop",
    ]);
    expect(lanes.map((l) => l.role)).toEqual([
      "pbl",
      "sbl",
      "free",
      "close",
      "drop",
    ]);
  });

  it("各レーンは不変の一意なIDを持ち、WIP制限はデフォルトなし", () => {
    const lanes = createDefaultLanes();
    expect(new Set(lanes.map((l) => l.id)).size).toBe(5);
    for (const lane of lanes) {
      expect(lane.wipLimit).toBeNull();
    }
  });
});

describe("createLane", () => {
  it("IDと名前だけ指定すると自由レーンになる", () => {
    expect(createLane({ id: "lane-9", name: "レビュー" })).toEqual({
      id: "lane-9",
      name: "レビュー",
      role: "free",
      wipLimit: null,
    });
  });

  it("役割とWIP制限を指定して作成できる", () => {
    const lane = createLane({
      id: "lane-9",
      name: "受付",
      role: "pbl",
      wipLimit: 3,
    });
    expect(lane.role).toBe("pbl");
    expect(lane.wipLimit).toBe(3);
  });
});

describe("isFixedRole", () => {
  it("pbl/sbl/close/dropは固定役割、freeは固定でない", () => {
    expect(isFixedRole("pbl")).toBe(true);
    expect(isFixedRole("sbl")).toBe(true);
    expect(isFixedRole("close")).toBe(true);
    expect(isFixedRole("drop")).toBe(true);
    expect(isFixedRole("free")).toBe(false);
  });
});

describe("validateLanes", () => {
  it("デフォルトレーンは妥当である", () => {
    expect(() => validateLanes(createDefaultLanes())).not.toThrow();
  });

  it("自由レーンが複数あっても妥当である", () => {
    const lanes = [
      createLane({ id: "l1", name: "PBL", role: "pbl" }),
      createLane({ id: "l2", name: "SBL", role: "sbl" }),
      createLane({ id: "l3", name: "A" }),
      createLane({ id: "l4", name: "B" }),
      createLane({ id: "l5", name: "Close", role: "close" }),
      createLane({ id: "l6", name: "Drop", role: "drop" }),
    ];
    expect(() => validateLanes(lanes)).not.toThrow();
  });

  it("自由レーンが1つもない場合はエラーになる", () => {
    const lanes = [
      createLane({ id: "l1", name: "PBL", role: "pbl" }),
      createLane({ id: "l2", name: "SBL", role: "sbl" }),
      createLane({ id: "l5", name: "Close", role: "close" }),
      createLane({ id: "l6", name: "Drop", role: "drop" }),
    ];
    expect(() => validateLanes(lanes)).toThrow(/自由レーン/);
  });

  it.each(["pbl", "sbl", "close", "drop"] as const)(
    "固定役割 %s が欠けている場合はエラーになる",
    (missing) => {
      const lanes = [
        createLane({ id: "l1", name: "PBL", role: "pbl" }),
        createLane({ id: "l2", name: "SBL", role: "sbl" }),
        createLane({ id: "l3", name: "A" }),
        createLane({ id: "l5", name: "Close", role: "close" }),
        createLane({ id: "l6", name: "Drop", role: "drop" }),
      ].filter((lane) => lane.role !== missing);
      expect(() => validateLanes(lanes)).toThrow(/役割/);
    },
  );

  it("固定役割が重複している場合はエラーになる", () => {
    const lanes = [
      createLane({ id: "l1", name: "PBL", role: "pbl" }),
      createLane({ id: "l2", name: "PBL2", role: "pbl" }),
      createLane({ id: "l3", name: "SBL", role: "sbl" }),
      createLane({ id: "l4", name: "A" }),
      createLane({ id: "l5", name: "Close", role: "close" }),
      createLane({ id: "l6", name: "Drop", role: "drop" }),
    ];
    expect(() => validateLanes(lanes)).toThrow(/役割/);
  });

  it("並び順が PBL, SBL, 自由…, Close, Drop でない場合はエラーになる", () => {
    const lanes = [
      createLane({ id: "l2", name: "SBL", role: "sbl" }),
      createLane({ id: "l1", name: "PBL", role: "pbl" }),
      createLane({ id: "l3", name: "A" }),
      createLane({ id: "l5", name: "Close", role: "close" }),
      createLane({ id: "l6", name: "Drop", role: "drop" }),
    ];
    expect(() => validateLanes(lanes)).toThrow(/並び順/);
  });

  it("IDの重複はエラーになる", () => {
    const lanes = [
      createLane({ id: "l1", name: "PBL", role: "pbl" }),
      createLane({ id: "l1", name: "SBL", role: "sbl" }),
      createLane({ id: "l3", name: "A" }),
      createLane({ id: "l5", name: "Close", role: "close" }),
      createLane({ id: "l6", name: "Drop", role: "drop" }),
    ];
    expect(() => validateLanes(lanes)).toThrow(/重複/);
  });

  it("空のレーン名はエラーになる", () => {
    const lanes = createDefaultLanes().map((lane) =>
      lane.role === "sbl" ? { ...lane, name: "" } : lane,
    );
    expect(() => validateLanes(lanes)).toThrow(/レーン名/);
  });

  it("WIP制限は1〜99の整数またはnullのみ許容する", () => {
    const withWip = (wipLimit: number) =>
      createDefaultLanes().map((lane) =>
        lane.role === "free" ? { ...lane, wipLimit } : lane,
      );
    expect(() => validateLanes(withWip(0))).toThrow(/WIP/);
    expect(() => validateLanes(withWip(100))).toThrow(/WIP/);
    expect(() => validateLanes(withWip(1.5))).toThrow(/WIP/);
    expect(() => validateLanes(withWip(1))).not.toThrow();
    expect(() => validateLanes(withWip(99))).not.toThrow();
  });
});

describe("findLaneByRole", () => {
  it("役割からレーンを取得できる", () => {
    const lanes = createDefaultLanes();
    expect(findLaneByRole(lanes, "pbl").name).toBe("PBL");
    expect(findLaneByRole(lanes, "sbl").name).toBe("SBL");
    expect(findLaneByRole(lanes, "close").name).toBe("Close");
    expect(findLaneByRole(lanes, "drop").name).toBe("Drop");
  });
});

describe("canAcceptMore", () => {
  it("WIP制限なしのレーンは常に受け入れ可能", () => {
    const lane = createLane({ id: "l1", name: "A" });
    expect(canAcceptMore(lane, 999)).toBe(true);
  });

  it("WIP制限未満なら受け入れ可能、以上なら不可", () => {
    const lane = createLane({ id: "l1", name: "A", wipLimit: 2 });
    expect(canAcceptMore(lane, 1)).toBe(true);
    expect(canAcceptMore(lane, 2)).toBe(false);
  });
});
