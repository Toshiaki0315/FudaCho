import { useState } from "react";

interface ExportDialogProps {
  markdown: string;
  onClose: () => void;
}

export function ExportDialog({ markdown, onClose }: ExportDialogProps) {
  return (
    <div className="modal-backdrop">
      <div
        role="dialog"
        aria-label="マークダウンエクスポート"
        className="item-detail"
      >
        <label>
          エクスポート結果
          <textarea readOnly value={markdown} className="markdown-textarea" />
        </label>
        <footer className="item-detail-footer">
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(markdown)}
          >
            コピー
          </button>
          <button type="button" onClick={onClose}>
            閉じる
          </button>
        </footer>
      </div>
    </div>
  );
}

interface ImportDialogProps {
  onImport: (markdown: string) => void;
  onClose: () => void;
}

export function ImportDialog({ onImport, onClose }: ImportDialogProps) {
  const [markdown, setMarkdown] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    try {
      onImport(markdown);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="modal-backdrop">
      <div
        role="dialog"
        aria-label="マークダウンインポート"
        className="item-detail"
      >
        <label>
          マークダウン
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="markdown-textarea"
          />
        </label>
        {error !== null && <p className="import-error">{error}</p>}
        <footer className="item-detail-footer">
          <button type="button" onClick={onClose}>
            キャンセル
          </button>
          <button type="button" onClick={handleImport}>
            取り込み
          </button>
        </footer>
      </div>
    </div>
  );
}
