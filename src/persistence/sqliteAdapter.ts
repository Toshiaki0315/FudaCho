import Database from "@tauri-apps/plugin-sql";
import type { PersistedBoard } from "../store/boardStore";
import type { PersistenceAdapter } from "./persistBoardStore";

/**
 * Tauri SQLプラグイン経由のSQLite永続化。
 * ボード全体を1行のJSONスナップショットとして保存する。
 */
export async function createSqliteAdapter(
  dbPath = "sqlite:fudacho.db",
): Promise<PersistenceAdapter> {
  const db = await Database.load(dbPath);
  await db.execute(
    "CREATE TABLE IF NOT EXISTS board (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL)",
  );
  return {
    async load() {
      const rows = await db.select<{ data: string }[]>(
        "SELECT data FROM board WHERE id = 1",
      );
      if (rows.length === 0) {
        return null;
      }
      return JSON.parse(rows[0].data) as PersistedBoard;
    },
    async save(data) {
      await db.execute(
        "INSERT INTO board (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = $1",
        [JSON.stringify(data)],
      );
    },
  };
}
