interface HeaderProps {
  projectName: string;
  onOpenSettings: () => void;
}

export function Header({ projectName, onOpenSettings }: HeaderProps) {
  return (
    <header className="app-header">
      <h1>{projectName}</h1>
      <button type="button" onClick={onOpenSettings}>
        設定
      </button>
    </header>
  );
}
