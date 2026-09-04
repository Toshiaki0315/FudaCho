import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createChildItem, type ChildItem } from "../domain/childItem";
import { createParentItem, type ParentItem } from "../domain/parentItem";
import { useItemFilters } from "./useItemFilters";

const parents: Record<string, ParentItem> = {
  "P-1": createParentItem({
    id: "P-1",
    summary: "親1",
    laneId: "lane-1",
    labels: ["設計"],
    childIds: ["C-1"],
  }),
  "P-2": createParentItem({
    id: "P-2",
    summary: "親2",
    laneId: "lane-1",
    labels: ["急ぎ"],
  }),
};

const children: Record<string, ChildItem> = {
  "C-1": createChildItem({
    id: "C-1",
    parentId: "P-1",
    description: "子1",
    laneId: "lane-2",
    labels: ["フロント"],
  }),
  "C-2": createChildItem({
    id: "C-2",
    parentId: null,
    description: "親なし子",
    laneId: "lane-2",
    labels: ["急ぎ"],
  }),
};

const setup = (p = parents, c = children) =>
  renderHook(() => useItemFilters(p, c));

describe("useItemFilters", () => {
  it("初期状態では絞り込みなしで全アイテムが対象になる", () => {
    const { result } = setup();
    expect(result.current.isFiltering).toBe(false);
    expect(result.current.matchesFilter("P-1")).toBe(true);
    expect(result.current.matchesFilter("C-2")).toBe(true);
  });

  it("子アイテムの実効ラベルは親のラベルと合成される", () => {
    const { result } = setup();
    expect(result.current.effectiveLabelsOf("C-1")).toEqual([
      "設計",
      "フロント",
    ]);
    expect(result.current.effectiveLabelsOf("C-2")).toEqual(["急ぎ"]);
  });

  it("ラベル絞り込みは実効ラベルで判定する（親のラベルが子にも効く）", () => {
    const { result } = setup();
    act(() => result.current.toggleLabelFilter("設計"));
    expect(result.current.labelFilters).toEqual(["設計"]);
    expect(result.current.matchesFilter("P-1")).toBe(true);
    expect(result.current.matchesFilter("C-1")).toBe(true);
    expect(result.current.matchesFilter("P-2")).toBe(false);
    expect(result.current.matchesFilter("C-2")).toBe(false);
  });

  it("複数のラベル絞り込みはAND条件になる", () => {
    const { result } = setup();
    act(() => result.current.toggleLabelFilter("設計"));
    act(() => result.current.toggleLabelFilter("フロント"));
    expect(result.current.matchesFilter("C-1")).toBe(true);
    expect(result.current.matchesFilter("P-1")).toBe(false);
  });

  it("同じラベルをもう一度指定すると絞り込みを解除する", () => {
    const { result } = setup();
    act(() => result.current.toggleLabelFilter("設計"));
    act(() => result.current.toggleLabelFilter("設計"));
    expect(result.current.labelFilters).toEqual([]);
    expect(result.current.isFiltering).toBe(false);
  });

  it("親で絞り込むとその親と子だけが対象になる", () => {
    const { result } = setup();
    act(() => result.current.toggleParentFilter("P-1"));
    expect(result.current.activeParentFilter).toBe("P-1");
    expect(result.current.matchesFilter("P-1")).toBe(true);
    expect(result.current.matchesFilter("C-1")).toBe(true);
    expect(result.current.matchesFilter("P-2")).toBe(false);
    expect(result.current.matchesFilter("C-2")).toBe(false);
  });

  it("同じ親をもう一度指定すると絞り込みを解除する", () => {
    const { result } = setup();
    act(() => result.current.toggleParentFilter("P-1"));
    act(() => result.current.toggleParentFilter("P-1"));
    expect(result.current.activeParentFilter).toBeNull();
  });

  it("絞り込み対象の親が削除されたら絞り込みは無効になる", () => {
    const { result, rerender } = renderHook(
      ({ p }: { p: Record<string, ParentItem> }) => useItemFilters(p, children),
      { initialProps: { p: parents } },
    );
    act(() => result.current.toggleParentFilter("P-1"));
    expect(result.current.activeParentFilter).toBe("P-1");
    rerender({ p: { "P-2": parents["P-2"] } });
    expect(result.current.activeParentFilter).toBeNull();
    expect(result.current.matchesFilter("P-2")).toBe(true);
  });

  it("clearParentFilterで親の絞り込みだけを解除する", () => {
    const { result } = setup();
    act(() => result.current.toggleLabelFilter("設計"));
    act(() => result.current.toggleParentFilter("P-1"));
    act(() => result.current.clearParentFilter());
    expect(result.current.activeParentFilter).toBeNull();
    expect(result.current.labelFilters).toEqual(["設計"]);
  });

  it("clearAllで全ての絞り込みを解除する", () => {
    const { result } = setup();
    act(() => result.current.toggleLabelFilter("設計"));
    act(() => result.current.toggleParentFilter("P-1"));
    act(() => result.current.clearAll());
    expect(result.current.isFiltering).toBe(false);
    expect(result.current.labelFilters).toEqual([]);
    expect(result.current.activeParentFilter).toBeNull();
  });
});
