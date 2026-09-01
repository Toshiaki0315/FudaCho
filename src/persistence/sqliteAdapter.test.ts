import { beforeEach, describe, expect, it, vi } from "vitest";
import { selectPersisted, useBoardStore } from "../store/boardStore";

const execute = vi.fn(async () => ({ rowsAffected: 1, lastInsertId: 1 }));
const select = vi.fn(async (): Promise<{ data: string }[]> => []);

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: {
    load: vi.fn(async () => ({ execute, select })),
  },
}));

import Database from "@tauri-apps/plugin-sql";
import { createSqliteAdapter } from "./sqliteAdapter";

describe("createSqliteAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBoardStore.getState().reset();
  });

  it("SQLiteデータベースを開きboardテーブルを作成する", async () => {
    await createSqliteAdapter();
    expect(Database.load).toHaveBeenCalledWith("sqlite:fudacho.db");
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS board"),
    );
  });

  it("loadは保存済みデータをJSONとして復元する", async () => {
    useBoardStore.getState().addParent({ summary: "設計する" });
    const persisted = selectPersisted(useBoardStore.getState());
    select.mockResolvedValueOnce([{ data: JSON.stringify(persisted) }]);
    const adapter = await createSqliteAdapter();
    const loaded = await adapter.load();
    expect(loaded).toEqual(persisted);
  });

  it("保存データがない場合loadはnullを返す", async () => {
    const adapter = await createSqliteAdapter();
    expect(await adapter.load()).toBeNull();
  });

  it("saveはJSON化した状態をUPSERTする", async () => {
    const persisted = selectPersisted(useBoardStore.getState());
    const adapter = await createSqliteAdapter();
    await adapter.save(persisted);
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO board"),
      [JSON.stringify(persisted)],
    );
  });

  it("データベースパスを指定できる", async () => {
    await createSqliteAdapter("sqlite:test.db");
    expect(Database.load).toHaveBeenCalledWith("sqlite:test.db");
  });
});
