import { describe, expect, it } from "vitest";
import { createDefaultSettings } from "./settings";

describe("createDefaultSettings", () => {
  it("デフォルトのプロジェクト名は「札帖」である", () => {
    const settings = createDefaultSettings();
    expect(settings.projectName).toBe("札帖");
  });

  it("プロジェクト名を指定して作成できる", () => {
    const settings = createDefaultSettings("マイプロジェクト");
    expect(settings.projectName).toBe("マイプロジェクト");
  });

  it("デフォルトの5レーン（PBL/SBL/自由/Close/Drop）を持つ", () => {
    const settings = createDefaultSettings();
    expect(settings.lanes.map((lane) => lane.name)).toEqual([
      "PBL",
      "SBL",
      "作業中",
      "Close",
      "Drop",
    ]);
  });

  it("呼び出しごとに独立したレーン配列を返す（共有参照を持たない）", () => {
    const a = createDefaultSettings();
    const b = createDefaultSettings();
    expect(a.lanes).not.toBe(b.lanes);
    expect(a.lanes[0]).not.toBe(b.lanes[0]);
  });
});
