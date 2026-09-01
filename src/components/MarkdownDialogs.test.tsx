import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExportDialog, ImportDialog } from "./MarkdownDialogs";

describe("ExportDialog", () => {
  it("マークダウンを読み取り専用で表示する", () => {
    render(<ExportDialog markdown={"# 札帖\n"} onClose={vi.fn()} />);
    const textarea = screen.getByRole("textbox", {
      name: "エクスポート結果",
    });
    expect(textarea).toHaveValue("# 札帖\n");
    expect(textarea).toHaveAttribute("readonly");
  });

  it("コピーするとクリップボードに書き込まれる", async () => {
    const user = userEvent.setup();
    render(<ExportDialog markdown={"# 札帖\n"} onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "コピー" }));
    expect(await navigator.clipboard.readText()).toBe("# 札帖\n");
  });

  it("閉じるとonCloseが呼ばれる", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ExportDialog markdown={"# 札帖\n"} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "閉じる" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ImportDialog", () => {
  it("入力したマークダウンで取り込みを実行し、成功したら閉じる", async () => {
    const onImport = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ImportDialog onImport={onImport} onClose={onClose} />);
    await user.type(
      screen.getByRole("textbox", { name: "マークダウン" }),
      "# 取込テスト",
    );
    await user.click(screen.getByRole("button", { name: "取り込み" }));
    expect(onImport).toHaveBeenCalledWith("# 取込テスト");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("取り込みが失敗した場合はエラーメッセージを表示して閉じない", async () => {
    const onImport = vi.fn(() => {
      throw new Error("プロジェクト名の見出しが見つかりません");
    });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ImportDialog onImport={onImport} onClose={onClose} />);
    await user.type(
      screen.getByRole("textbox", { name: "マークダウン" }),
      "不正な内容",
    );
    await user.click(screen.getByRole("button", { name: "取り込み" }));
    expect(
      screen.getByText(/プロジェクト名の見出しが見つかりません/),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Error以外の例外も文字列化して表示する", async () => {
    const onImport = vi.fn(() => {
      throw "文字列の例外";
    });
    const user = userEvent.setup();
    render(<ImportDialog onImport={onImport} onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "取り込み" }));
    expect(screen.getByText("文字列の例外")).toBeInTheDocument();
  });

  it("キャンセルするとonCloseが呼ばれ、取り込みは実行されない", async () => {
    const onImport = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ImportDialog onImport={onImport} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onImport).not.toHaveBeenCalled();
  });
});
