import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createParentItem } from "../domain/parentItem";
import { ParentItemDetail } from "./ParentItemDetail";

function buildItem() {
  return createParentItem({
    id: "P-1",
    summary: "設計する",
    size: 5,
    status: "InProgress",
    assignee: "野村",
    reason: "リリースに必要",
    schedule: "2026-09-30",
    notes: "備考メモ",
    comments: ["最初のコメント"],
  });
}

describe("ParentItemDetail", () => {
  it("ダイアログとして表示され、全フィールドの現在値が表示される", () => {
    render(
      <ParentItemDetail
        item={buildItem()}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("P-1")).toBeInTheDocument();
    expect(screen.getByLabelText("概要")).toHaveValue("設計する");
    expect(screen.getByLabelText("サイズ")).toHaveValue("5");
    expect(screen.getByLabelText("担当者")).toHaveValue("野村");
    expect(screen.getByLabelText("理由")).toHaveValue("リリースに必要");
    expect(screen.getByLabelText("日程")).toHaveValue("2026-09-30");
    expect(screen.getByLabelText("備考")).toHaveValue("備考メモ");
    expect(screen.getByLabelText("コメント")).toHaveValue("最初のコメント");
  });

  it("ステータスは読み取り専用で表示される（変更はD&Dで行う）", () => {
    render(
      <ParentItemDetail
        item={buildItem()}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("InProgress")).toBeInTheDocument();
    expect(screen.queryByLabelText("ステータス")).not.toBeInTheDocument();
  });

  it("サイズの選択肢はフィボナッチ数列のみである", () => {
    render(
      <ParentItemDetail
        item={buildItem()}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const options = screen
      .getAllByRole("option")
      .map((o) => (o as HTMLOptionElement).value);
    expect(options).toEqual(["0", "1", "2", "3", "5", "8", "13", "♾️"]);
  });

  it("編集して保存すると変更内容がonSaveに渡される", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <ParentItemDetail item={buildItem()} onSave={onSave} onClose={vi.fn()} />,
    );
    const summary = screen.getByLabelText("概要");
    await user.clear(summary);
    await user.type(summary, "詳細設計する");
    await user.selectOptions(screen.getByLabelText("サイズ"), "8");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ summary: "詳細設計する", size: 8 }),
    );
  });

  it("担当者・理由・日程・備考も編集して保存できる", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <ParentItemDetail item={buildItem()} onSave={onSave} onClose={vi.fn()} />,
    );
    await user.type(screen.getByLabelText("担当者"), "2");
    await user.type(screen.getByLabelText("理由"), "！");
    await user.type(screen.getByLabelText("日程"), "頃");
    await user.type(screen.getByLabelText("備考"), "追記");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        assignee: "野村2",
        reason: "リリースに必要！",
        schedule: "2026-09-30頃",
        notes: "備考メモ追記",
      }),
    );
  });

  it("サイズに♾️を選択して保存できる", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <ParentItemDetail item={buildItem()} onSave={onSave} onClose={vi.fn()} />,
    );
    await user.selectOptions(screen.getByLabelText("サイズ"), "♾️");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ size: "♾️" }),
    );
  });

  it("コメントは1行1件として保存される", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <ParentItemDetail item={buildItem()} onSave={onSave} onClose={vi.fn()} />,
    );
    const comments = screen.getByLabelText("コメント");
    await user.clear(comments);
    await user.type(comments, "一つ目{enter}二つ目");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ comments: ["一つ目", "二つ目"] }),
    );
  });

  it("キャンセルするとonCloseが呼ばれ、onSaveは呼ばれない", async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <ParentItemDetail item={buildItem()} onSave={onSave} onClose={onClose} />,
    );
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
