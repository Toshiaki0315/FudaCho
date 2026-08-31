import { describe, expect, it } from "vitest";
import {
  ALL_STATUSES,
  createDefaultSettings,
  type LaneConfig,
  type Status,
} from "./settings";

describe("Status", () => {
  it("デフォルトステータスとして5種類（ToDo, InProgress, Done, Close, Dropped）を定義する", () => {
    expect(ALL_STATUSES).toEqual([
      "ToDo",
      "InProgress",
      "Done",
      "Close",
      "Dropped",
    ]);
  });
});

describe("createDefaultSettings", () => {
  it("デフォルトのプロジェクト名は「札帖」である", () => {
    const settings = createDefaultSettings();
    expect(settings.projectName).toBe("札帖");
  });

  it("プロジェクト名を指定して作成できる", () => {
    const settings = createDefaultSettings("マイプロジェクト");
    expect(settings.projectName).toBe("マイプロジェクト");
  });

  it("全ステータスに対して1対1のレーン設定を持つ", () => {
    const settings = createDefaultSettings();
    const statuses = settings.lanes.map((lane: LaneConfig) => lane.status);
    expect(statuses).toEqual(ALL_STATUSES);
  });

  it("各ステータスにデフォルトの日本語レーン名がマッピングされる", () => {
    const settings = createDefaultSettings();
    const nameOf = (status: Status) =>
      settings.lanes.find((lane) => lane.status === status)?.displayName;
    expect(nameOf("ToDo")).toBe("未着手");
    expect(nameOf("InProgress")).toBe("作業中");
    expect(nameOf("Done")).toBe("完了");
    expect(nameOf("Close")).toBe("クローズ");
    expect(nameOf("Dropped")).toBe("中断");
  });

  it("呼び出しごとに独立したレーン配列を返す（共有参照を持たない）", () => {
    const a = createDefaultSettings();
    const b = createDefaultSettings();
    expect(a.lanes).not.toBe(b.lanes);
    expect(a.lanes[0]).not.toBe(b.lanes[0]);
  });
});
