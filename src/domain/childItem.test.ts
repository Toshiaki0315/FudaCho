import { describe, expect, it } from "vitest";
import { createChildItem } from "./childItem";

describe("createChildItem", () => {
  it("必須項目（ID・親ID・作業内容）を指定して作成できる", () => {
    const item = createChildItem({
      id: "C-1",
      parentId: "P-1",
      description: "テストを書く",
    });
    expect(item.id).toBe("C-1");
    expect(item.parentId).toBe("P-1");
    expect(item.description).toBe("テストを書く");
  });

  it("デフォルト値が設定される（ステータスToDo, 空の担当者・日付, 時間はnull）", () => {
    const item = createChildItem({
      id: "C-1",
      parentId: "P-1",
      description: "テストを書く",
    });
    expect(item.status).toBe("ToDo");
    expect(item.assignee).toBe("");
    expect(item.estimatedHours).toBeNull();
    expect(item.actualHours).toBeNull();
    expect(item.startDate).toBe("");
    expect(item.endDate).toBe("");
  });

  it("全フィールドを指定して作成できる", () => {
    const item = createChildItem({
      id: "C-2",
      parentId: "P-1",
      description: "実装する",
      assignee: "野村",
      estimatedHours: 4,
      actualHours: 5.5,
      status: "Done",
      startDate: "2026-09-01",
      endDate: "2026-09-02",
    });
    expect(item.assignee).toBe("野村");
    expect(item.estimatedHours).toBe(4);
    expect(item.actualHours).toBe(5.5);
    expect(item.status).toBe("Done");
    expect(item.startDate).toBe("2026-09-01");
    expect(item.endDate).toBe("2026-09-02");
  });

  it("IDが空文字の場合はエラーになる", () => {
    expect(() =>
      createChildItem({ id: "", parentId: "P-1", description: "作業" }),
    ).toThrow(/ID/);
  });

  it("親IDが空文字の場合はエラーになる", () => {
    expect(() =>
      createChildItem({ id: "C-1", parentId: "", description: "作業" }),
    ).toThrow(/親ID/);
  });

  it("見積時間・実績時間に負の値を指定するとエラーになる", () => {
    expect(() =>
      createChildItem({
        id: "C-1",
        parentId: "P-1",
        description: "作業",
        estimatedHours: -1,
      }),
    ).toThrow(/見積時間/);
    expect(() =>
      createChildItem({
        id: "C-1",
        parentId: "P-1",
        description: "作業",
        actualHours: -0.5,
      }),
    ).toThrow(/実績時間/);
  });
});
