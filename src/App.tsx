import { useState } from "react";
import "./App.css";
import { BoardView } from "./components/BoardView";
import { Header } from "./components/Header";
import { ExportDialog, ImportDialog } from "./components/MarkdownDialogs";
import { SettingsDialog } from "./components/SettingsDialog";
import { useBoardStore } from "./store/boardStore";

type DialogKind = "export" | "import" | "settings" | null;

function App() {
  const settings = useBoardStore((state) => state.settings);
  const exportMarkdown = useBoardStore((state) => state.exportMarkdown);
  const importMarkdown = useBoardStore((state) => state.importMarkdown);
  const updateSettings = useBoardStore((state) => state.updateSettings);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const closeDialog = () => setDialog(null);

  return (
    <main className="container">
      <Header
        projectName={settings.projectName}
        onOpenSettings={() => setDialog("settings")}
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
      {dialog === "settings" && (
        <SettingsDialog
          settings={settings}
          onSave={updateSettings}
          onClose={closeDialog}
        />
      )}
    </main>
  );
}

export default App;
