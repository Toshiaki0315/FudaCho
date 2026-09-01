import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { selectPersisted, useBoardStore } from "../store/boardStore";
import type { PersistedBoard } from "../store/boardStore";
import { startPersistence, type PersistenceAdapter } from "./persistBoardStore";

function fakeAdapter(initial: PersistedBoard | null = null) {
  const saves: PersistedBoard[] = [];
  const adapter: PersistenceAdapter = {
    load: vi.fn(async () => initial),
    save: vi.fn(async (data: PersistedBoard) => {
      saves.push(data);
    }),
  };
  return { adapter, saves };
}

describe("startPersistence", () => {
  beforeEach(() => {
    useBoardStore.getState().reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("開始時に保存済みデータがあればストアに復元する", async () => {
    useBoardStore.getState().addParent({ summary: "保存済み" });
    const persisted = selectPersisted(useBoardStore.getState());
    useBoardStore.getState().reset();
    const { adapter } = fakeAdapter(persisted);
    const stop = await startPersistence(useBoardStore, adapter);
    expect(useBoardStore.getState().parents["P-1"].summary).toBe("保存済み");
    stop();
  });

  it("保存済みデータがなければ何も復元しない", async () => {
    const { adapter } = fakeAdapter(null);
    const stop = await startPersistence(useBoardStore, adapter);
    expect(useBoardStore.getState().parents).toEqual({});
    stop();
  });

  it("状態が変わるとデバウンス後に保存される", async () => {
    const { adapter, saves } = fakeAdapter();
    const stop = await startPersistence(useBoardStore, adapter, 500);
    useBoardStore.getState().addParent({ summary: "A" });
    expect(saves).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(500);
    expect(saves).toHaveLength(1);
    expect(saves[0].parents["P-1"].summary).toBe("A");
    stop();
  });

  it("連続した変更は1回の保存にまとめられる", async () => {
    const { adapter, saves } = fakeAdapter();
    const stop = await startPersistence(useBoardStore, adapter, 500);
    useBoardStore.getState().addParent({ summary: "A" });
    await vi.advanceTimersByTimeAsync(200);
    useBoardStore.getState().addParent({ summary: "B" });
    await vi.advanceTimersByTimeAsync(500);
    expect(saves).toHaveLength(1);
    expect(Object.keys(saves[0].parents)).toEqual(["P-1", "P-2"]);
    stop();
  });

  it("停止すると以後の変更は保存されない", async () => {
    const { adapter, saves } = fakeAdapter();
    const stop = await startPersistence(useBoardStore, adapter, 500);
    stop();
    useBoardStore.getState().addParent({ summary: "A" });
    await vi.advanceTimersByTimeAsync(1000);
    expect(saves).toHaveLength(0);
  });

  it("保存の失敗はコンソールに記録され、アプリは動き続ける", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const adapter: PersistenceAdapter = {
      load: async () => null,
      save: vi.fn(async () => {
        throw new Error("ディスクエラー");
      }),
    };
    const stop = await startPersistence(useBoardStore, adapter, 500);
    useBoardStore.getState().addParent({ summary: "A" });
    await vi.advanceTimersByTimeAsync(500);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
    stop();
  });
});
