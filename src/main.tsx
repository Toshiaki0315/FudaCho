import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { startPersistence } from "./persistence/persistBoardStore";
import { createSqliteAdapter } from "./persistence/sqliteAdapter";
import { useBoardStore } from "./store/boardStore";

// Tauri上で動作している場合のみSQLite永続化を有効にする
// （ブラウザでの開発時はメモリ上のみ）
if ("__TAURI_INTERNALS__" in window) {
  createSqliteAdapter()
    .then((adapter) => startPersistence(useBoardStore, adapter))
    .catch((e: unknown) => {
      console.error("永続化の初期化に失敗しました:", e);
    });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
