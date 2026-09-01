import { describe, expect, it } from "vitest";
import {
  FIBONACCI_SIZES,
  INFINITY_SIZE,
  createParentItem,
  isValidSize,
} from "./parentItem";

describe("FIBONACCI_SIZES", () => {
  it("許容サイズはフィボナッチ数列 (0, 1, 2, 3, 5, 8, 13) と ♾️ のみである", () => {
    expect(FIBONACCI_SIZES).toEqual([0, 1, 2, 3, 5, 8, 13, INFINITY_SIZE]);
  });
});

describe("isValidSize", () => {
  it.each([0, 1, 2, 3, 5, 8, 13, INFINITY_SIZE])(
    "%s は有効なサイズである",
    (size) => {
      expect(isValidSize(size)).toBe(true);
    },
  );

  it.each([4, 6, 7, 21, -1, 1.5])("%s は無効なサイズである", (size) => {
    expect(isValidSize(size)).toBe(false);
  });
});

describe("createParentItem", () => {
  it("必須項目（ID・概要・レーンID）を指定して作成できる", () => {
    const item = createParentItem({
      id: "P-1",
      summary: "設計する",
      laneId: "lane-1",
    });
    expect(item.id).toBe("P-1");
    expect(item.summary).toBe("設計する");
    expect(item.laneId).toBe("lane-1");
  });

  it("デフォルト値が設定される（サイズ0, 空の文字列フィールドと空配列）", () => {
    const item = createParentItem({
      id: "P-1",
      summary: "設計する",
      laneId: "lane-1",
    });
    expect(item.size).toBe(0);
    expect(item.assignee).toBe("");
    expect(item.reason).toBe("");
    expect(item.plannedStartDate).toBe("");
    expect(item.plannedEndDate).toBe("");
    expect(item.notes).toBe("");
    expect(item.comments).toEqual([]);
    expect(item.childIds).toEqual([]);
  });

  it("全フィールドを指定して作成できる", () => {
    const item = createParentItem({
      id: "P-2",
      summary: "実装する",
      laneId: "lane-2",
      size: 8,
      assignee: "野村",
      reason: "リリースに必要",
      plannedStartDate: "2026-09-01",
      plannedEndDate: "2026-09-30",
      notes: "備考メモ",
      comments: ["最初のコメント"],
      childIds: ["C-1", "C-2"],
    });
    expect(item.size).toBe(8);
    expect(item.laneId).toBe("lane-2");
    expect(item.assignee).toBe("野村");
    expect(item.reason).toBe("リリースに必要");
    expect(item.plannedStartDate).toBe("2026-09-01");
    expect(item.plannedEndDate).toBe("2026-09-30");
    expect(item.notes).toBe("備考メモ");
    expect(item.comments).toEqual(["最初のコメント"]);
    expect(item.childIds).toEqual(["C-1", "C-2"]);
  });

  it("サイズに♾️を指定できる", () => {
    const item = createParentItem({
      id: "P-3",
      summary: "無限タスク",
      laneId: "lane-1",
      size: INFINITY_SIZE,
    });
    expect(item.size).toBe(INFINITY_SIZE);
  });

  it("フィボナッチ数列にないサイズを指定するとエラーになる", () => {
    expect(() =>
      createParentItem({
        id: "P-4",
        summary: "不正",
        laneId: "lane-1",
        size: 4 as never,
      }),
    ).toThrow(/サイズ/);
  });

  it("IDが空文字の場合はエラーになる", () => {
    expect(() =>
      createParentItem({ id: "", summary: "概要", laneId: "lane-1" }),
    ).toThrow(/ID/);
  });

  it("レーンIDが空文字の場合はエラーになる", () => {
    expect(() =>
      createParentItem({ id: "P-1", summary: "概要", laneId: "" }),
    ).toThrow(/レーンID/);
  });
});
