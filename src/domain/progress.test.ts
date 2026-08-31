import { describe, expect, it } from "vitest";
import { createChildItem } from "./childItem";
import { calculateProgress } from "./progress";
import type { Status } from "./settings";

function child(id: string, status: Status) {
  return createChildItem({
    id,
    parentId: "P-1",
    description: `作業${id}`,
    status,
  });
}

describe("calculateProgress", () => {
  it("子アイテムがない場合は0を返す", () => {
    expect(calculateProgress([])).toBe(0);
  });

  it("全子アイテムがToDoの場合は0を返す", () => {
    const children = [child("C-1", "ToDo"), child("C-2", "ToDo")];
    expect(calculateProgress(children)).toBe(0);
  });

  it("半分がDoneの場合は0.5を返す", () => {
    const children = [
      child("C-1", "Done"),
      child("C-2", "ToDo"),
      child("C-3", "Done"),
      child("C-4", "InProgress"),
    ];
    expect(calculateProgress(children)).toBe(0.5);
  });

  it("全子アイテムがDoneの場合は1を返す", () => {
    const children = [child("C-1", "Done"), child("C-2", "Done")];
    expect(calculateProgress(children)).toBe(1);
  });

  it("Closeも完了として扱う", () => {
    const children = [child("C-1", "Close"), child("C-2", "ToDo")];
    expect(calculateProgress(children)).toBe(0.5);
  });

  it("Droppedの子アイテムは分母から除外する", () => {
    const children = [
      child("C-1", "Done"),
      child("C-2", "Dropped"),
      child("C-3", "ToDo"),
    ];
    // Dropped を除いた 2 件中 1 件完了
    expect(calculateProgress(children)).toBe(0.5);
  });

  it("全子アイテムがDroppedの場合は0を返す", () => {
    const children = [child("C-1", "Dropped"), child("C-2", "Dropped")];
    expect(calculateProgress(children)).toBe(0);
  });
});
