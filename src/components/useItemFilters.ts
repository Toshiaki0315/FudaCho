import { useState } from "react";
import type { ChildItem } from "../domain/childItem";
import { mergeLabels } from "../domain/labels";
import type { ParentItem } from "../domain/parentItem";

/**
 * ボードの絞り込み状態（ラベル・親アイテム）をまとめて扱うフック。
 * 表示条件の判定はすべて matchesFilter に集約する。
 */
export function useItemFilters(
  parents: Record<string, ParentItem>,
  children: Record<string, ChildItem>,
) {
  // ラベル絞り込み（AND条件）。カードのラベルチップをクリックで追加/解除する
  const [labelFilters, setLabelFilters] = useState<string[]>([]);
  // 親アイテム絞り込み。親カードの右クリックメニューで設定し、その親と子だけを表示する
  const [parentFilter, setParentFilter] = useState<string | null>(null);

  // 絞り込み対象の親が削除された場合は絞り込みを無効化する
  const activeParentFilter =
    parentFilter !== null && parents[parentFilter] !== undefined
      ? parentFilter
      : null;

  // 子アイテムの実効ラベル = 親のラベル + 独自ラベル（親の変更が自動で引き継がれる）
  const effectiveLabelsOf = (childId: string) => {
    const child = children[childId];
    const parentLabels =
      child.parentId !== null ? parents[child.parentId].labels : [];
    return mergeLabels(parentLabels, child.labels);
  };

  const toggleLabelFilter = (label: string) => {
    setLabelFilters((current) =>
      current.includes(label)
        ? current.filter((l) => l !== label)
        : [...current, label],
    );
  };

  const toggleParentFilter = (parentId: string) => {
    setParentFilter((current) => (current === parentId ? null : parentId));
  };

  const clearParentFilter = () => setParentFilter(null);

  const clearAll = () => {
    setLabelFilters([]);
    setParentFilter(null);
  };

  const matchesParentFilter = (itemId: string) => {
    if (activeParentFilter === null || itemId === activeParentFilter) {
      return true;
    }
    return children[itemId]?.parentId === activeParentFilter;
  };

  const matchesLabelFilter = (itemId: string) => {
    if (labelFilters.length === 0) {
      return true;
    }
    const parent = parents[itemId];
    const itemLabels = parent ? parent.labels : effectiveLabelsOf(itemId);
    return labelFilters.every((label) => itemLabels.includes(label));
  };

  return {
    labelFilters,
    activeParentFilter,
    /** 何らかの絞り込みが効いているか（フィルターバーの表示判定） */
    isFiltering: labelFilters.length > 0 || activeParentFilter !== null,
    effectiveLabelsOf,
    toggleLabelFilter,
    toggleParentFilter,
    clearParentFilter,
    clearAll,
    matchesFilter: (itemId: string) =>
      matchesParentFilter(itemId) && matchesLabelFilter(itemId),
  };
}
