interface HeaderProps {
  projectName: string;
  onOpenSettings: () => void;
  onExport?: () => void;
  onImport?: () => void;
}

export function Header({
  projectName,
  onOpenSettings,
  onExport,
  onImport,
}: HeaderProps) {
  return (
    <header className="app-header">
      <h1>{projectName}</h1>
      <div className="header-actions">
        {onImport && (
          <button type="button" onClick={onImport}>
            インポート
          </button>
        )}
        {onExport && (
          <button type="button" onClick={onExport}>
            エクスポート
          </button>
        )}
        <button type="button" onClick={onOpenSettings}>
          設定
        </button>
      </div>
    </header>
  );
}
