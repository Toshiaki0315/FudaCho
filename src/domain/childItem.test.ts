import { describe, expect, it } from "vitest";
import { createChildItem } from "./childItem";

describe("createChildItem", () => {
  it("必須項目（ID・親ID・作業内容・レーンID）を指定して作成できる", () => {
    const item = createChildItem({
      id: "C-1",
      parentId: "P-1",
      description: "テストを書く",
      laneId: "lane-1",
    });
    expect(item.id).toBe("C-1");
    expect(item.parentId).toBe("P-1");
    expect(item.description).toBe("テストを書く");
    expect(item.laneId).toBe("lane-1");
  });

  it("デフォルト値が設定される（空の担当者・日付, 時間はnull）", () => {
    const item = createChildItem({
      id: "C-1",
      parentId: "P-1",
      description: "テストを書く",
      laneId: "lane-1",
    });
    expect(item.assignee).toBe("");
    expect(item.estimatedHours).toBeNull();
    expect(item.actualHours).toBeNull();
    expect(item.startDate).toBe("");
    expect(item.endDate).toBe("");
    expect(item.comments).toEqual([]);
    expect(item.labels).toEqual([]);
    expect(item.title).toBe("");
  });

  it("タイトルを指定して作成できる", () => {
    const item = createChildItem({
      id: "C-1",
      title: "図面作成",
      description: "図を描く",
      laneId: "lane-2",
    });
    expect(item.title).toBe("図面作成");
  });

  it("全フィールドを指定して作成できる", () => {
    const item = createChildItem({
      id: "C-2",
      parentId: "P-1",
      description: "実装する",
      laneId: "lane-3",
      assignee: "野村",
      estimatedHours: 4,
      actualHours: 5.5,
      startDate: "2026-09-01",
      endDate: "2026-09-02",
      comments: ["最初のコメント"],
      labels: ["フロント"],
    });
    expect(item.assignee).toBe("野村");
    expect(item.estimatedHours).toBe(4);
    expect(item.actualHours).toBe(5.5);
    expect(item.laneId).toBe("lane-3");
    expect(item.startDate).toBe("2026-09-01");
    expect(item.endDate).toBe("2026-09-02");
    expect(item.comments).toEqual(["最初のコメント"]);
    expect(item.labels).toEqual(["フロント"]);
  });

  it("親を持たない子アイテムを作成できる（parentId: null）", () => {
    const item = createChildItem({
      id: "C-1",
      description: "独立タスク",
      laneId: "lane-2",
    });
    expect(item.parentId).toBeNull();
  });

  it("不正なラベル（区切り文字入り）はエラーになる", () => {
    expect(() =>
      createChildItem({
        id: "C-1",
        parentId: "P-1",
        description: "作業",
        laneId: "lane-1",
        labels: ["a,b"],
      }),
    ).toThrow(/ラベル/);
  });

  it("IDが空文字の場合はエラーになる", () => {
    expect(() =>
      createChildItem({
        id: "",
        parentId: "P-1",
        description: "作業",
        laneId: "lane-1",
      }),
    ).toThrow(/ID/);
  });

  it("親IDが空文字の場合はエラーになる", () => {
    expect(() =>
      createChildItem({
        id: "C-1",
        parentId: "",
        description: "作業",
        laneId: "lane-1",
      }),
    ).toThrow(/親ID/);
  });

  it("レーンIDが空文字の場合はエラーになる", () => {
    expect(() =>
      createChildItem({
        id: "C-1",
        parentId: "P-1",
        description: "作業",
        laneId: "",
      }),
    ).toThrow(/レーンID/);
  });

  it("見積時間・実績時間に負の値を指定するとエラーになる", () => {
    expect(() =>
      createChildItem({
        id: "C-1",
        parentId: "P-1",
        description: "作業",
        laneId: "lane-1",
        estimatedHours: -1,
      }),
    ).toThrow(/見積時間/);
    expect(() =>
      createChildItem({
        id: "C-1",
        parentId: "P-1",
        description: "作業",
        laneId: "lane-1",
        actualHours: -0.5,
      }),
    ).toThrow(/実績時間/);
  });
});
