import { useState } from "react";
import "./App.css";
import { BoardView } from "./components/BoardView";
import { Header } from "./components/Header";
import { ExportDialog, ImportDialog } from "./components/MarkdownDialogs";
import { useBoardStore } from "./store/boardStore";

type DialogKind = "export" | "import" | null;

function App() {
  const projectName = useBoardStore((state) => state.settings.projectName);
  const exportMarkdown = useBoardStore((state) => state.exportMarkdown);
  const importMarkdown = useBoardStore((state) => state.importMarkdown);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const closeDialog = () => setDialog(null);

  return (
    <main className="container">
      <Header
        projectName={projectName}
        onOpenSettings={() => {
          // 設定画面はタスク7.3で実装する
        }}
        onExport={() => setDialog("export")}
        onImport={() => setDialog("import")}
      />
      <BoardView />
      {dialog === "export" && (
        <ExportDialog markdown={exportMarkdown()} onClose={closeDialog} />
      )}
      {dialog === "import" && (
        <ImportDialog onImport={importMarkdown} onClose={closeDialog} />
      )}
    </main>
  );
}

export default App;
