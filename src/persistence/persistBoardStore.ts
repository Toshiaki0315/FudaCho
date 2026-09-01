import {
  selectPersisted,
  type PersistedBoard,
  type useBoardStore,
} from "../store/boardStore";

export interface PersistenceAdapter {
  load: () => Promise<PersistedBoard | null>;
  save: (data: PersistedBoard) => Promise<void>;
}

/**
 * 起動時に保存済みデータをストアへ復元し、以後の変更をデバウンスして保存する。
 * 戻り値の関数で購読を停止できる。
 */
export async function startPersistence(
  store: typeof useBoardStore,
  adapter: PersistenceAdapter,
  debounceMs = 500,
): Promise<() => void> {
  const loaded = await adapter.load();
  if (loaded !== null) {
    store.getState().hydrate(loaded);
  }
  let timer: ReturnType<typeof setTimeout> | null = null;
  const unsubscribe = store.subscribe((state) => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      adapter.save(selectPersisted(state)).catch((e: unknown) => {
        console.error("ボードの保存に失敗しました:", e);
      });
    }, debounceMs);
  });
  return () => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    unsubscribe();
  };
}
