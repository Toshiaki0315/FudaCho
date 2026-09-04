/** カード等でIDの代わりに表示できる、名前を持つアイテム。 */
export interface NamedItem {
  id: string;
  title: string;
}

/** 親のいない子アイテムなど、対象アイテムが存在しないときの表示 */
export const NO_ITEM_NAME = "なし";

/**
 * アイテムの表示名。タイトルが未設定ならIDで代用する
 * （タイトルは任意入力のため、空でも必ず識別できる名前を返す）。
 */
export function displayName(item: NamedItem | null | undefined): string {
  if (!item) {
    return NO_ITEM_NAME;
  }
  return item.title !== "" ? item.title : item.id;
}
