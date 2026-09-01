# 札帖 (FudaCho)

個人向けのカンバン型タスク管理デスクトップアプリ。macOS (Apple Silicon) 専用。

## 特徴

- 親タスク・子タスクの2階層管理（子の完了状況から親の進捗率を自動計算）
- 設定可能なレーン（ステータスと表示名の1対1マッピング、増減・改名可能）
- ドラッグ&ドロップによるレーン間移動（ステータス変更）とレーン内並び替え（優先順位）
- Drop（中断）はデータを保持したまま参照可能
- 親タスクのサイズはフィボナッチ数列（0, 1, 2, 3, 5, 8, 13, ♾️）のみ
- マークダウン形式でのインポート・エクスポート（完全ラウンドトリップ対応）

## 技術スタック

- Tauri v2（Rust）+ React 19 + TypeScript + Vite
- 状態管理: Zustand / D&D: dnd-kit
- テスト: Vitest + React Testing Library（カバレッジ閾値90%）

## 開発

```bash
npm install        # 依存関係のインストール
npm run tauri dev  # ネイティブアプリとして起動
npm run dev        # ブラウザでの開発用サーバー
npm test           # テスト実行
npm run coverage   # カバレッジ付きテスト
npm run lint       # ESLint
npm run format     # Prettier
```

## ビルド（Apple Silicon）

```bash
npm run tauri build -- --target aarch64-apple-darwin
```

`src-tauri/target/aarch64-apple-darwin/release/bundle/` に `.app` と `.dmg` が生成されます。
