import "./App.css";
import { BoardView } from "./components/BoardView";
import { Header } from "./components/Header";
import { useBoardStore } from "./store/boardStore";

function App() {
  const projectName = useBoardStore((state) => state.settings.projectName);

  return (
    <main className="container">
      <Header
        projectName={projectName}
        onOpenSettings={() => {
          // 設定画面はタスク7.3で実装する
        }}
      />
      <BoardView />
    </main>
  );
}

export default App;
