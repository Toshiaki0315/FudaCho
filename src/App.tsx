import { useState } from "react";
import "./App.css";
import { Header } from "./components/Header";
import { KanbanBoard } from "./components/KanbanBoard";
import { createDefaultSettings } from "./domain/settings";

function App() {
  const [settings] = useState(createDefaultSettings);

  return (
    <main className="container">
      <Header
        projectName={settings.projectName}
        onOpenSettings={() => {
          // 設定画面はタスク7.3で実装する
        }}
      />
      <KanbanBoard
        lanes={settings.lanes}
        onAddItem={() => {
          // 新規作成ダイアログはフェーズ5で実装する
        }}
      />
    </main>
  );
}

export default App;
