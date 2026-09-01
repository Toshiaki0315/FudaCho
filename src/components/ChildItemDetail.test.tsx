import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createChildItem } from "../domain/childItem";
import { ChildItemDetail } from "./ChildItemDetail";

function buildItem() {
  return createChildItem({
    id: "C-1",
    parentId: "P-1",
    description: "図を描く",
    assignee: "野村",
    estimatedHours: 4,
    actualHours: 2.5,
    status: "InProgress",
    startDate: "2026-09-01",
    endDate: "2026-09-02",
  });
}

describe("ChildItemDetail", () => {
  it("ダイアログとして表示され、全フィールドの現在値が表示される", () => {
    render(
      <ChildItemDetail item={buildItem()} onSave={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("C-1")).toBeInTheDocument();
    expect(screen.getByText(/P-1/)).toBeInTheDocument();
    expect(screen.getByLabelText("作業内容")).toHaveValue("図を描く");
    expect(screen.getByLabelText("担当者")).toHaveValue("野村");
    expect(screen.getByLabelText("見積時間")).toHaveValue(4);
    expect(screen.getByLabelText("実績時間")).toHaveValue(2.5);
    expect(screen.getByLabelText("開始日")).toHaveValue("2026-09-01");
    expect(screen.getByLabelText("終了日")).toHaveValue("2026-09-02");
  });

  it("ステータスは読み取り専用で表示される（変更はD&Dで行う）", () => {
    render(
      <ChildItemDetail item={buildItem()} onSave={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByText("InProgress")).toBeInTheDocument();
    expect(screen.queryByLabelText("ステータス")).not.toBeInTheDocument();
  });

  it("全フィールドを編集して保存すると変更内容がonSaveに渡される", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <ChildItemDetail item={buildItem()} onSave={onSave} onClose={vi.fn()} />,
    );
    const description = screen.getByLabelText("作業内容");
    await user.clear(description);
    await user.type(description, "詳細図を描く");
    await user.type(screen.getByLabelText("担当者"), "2");
    const estimated = screen.getByLabelText("見積時間");
    await user.clear(estimated);
    await user.type(estimated, "6");
    const actual = screen.getByLabelText("実績時間");
    await user.clear(actual);
    await user.type(actual, "3.5");
    const start = screen.getByLabelText("開始日");
    await user.clear(start);
    await user.type(start, "2026-09-03");
    const end = screen.getByLabelText("終了日");
    await user.clear(end);
    await user.type(end, "2026-09-04");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith({
      description: "詳細図を描く",
      assignee: "野村2",
      estimatedHours: 6,
      actualHours: 3.5,
      startDate: "2026-09-03",
      endDate: "2026-09-04",
    });
  });

  it("見積時間・実績時間を空にするとnullとして保存される", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <ChildItemDetail item={buildItem()} onSave={onSave} onClose={vi.fn()} />,
    );
    await user.clear(screen.getByLabelText("見積時間"));
    await user.clear(screen.getByLabelText("実績時間"));
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ estimatedHours: null, actualHours: null }),
    );
  });

  it("見積時間・実績時間が未設定の場合は空欄で表示される", () => {
    const item = createChildItem({
      id: "C-2",
      parentId: "P-1",
      description: "作業",
    });
    render(<ChildItemDetail item={item} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByLabelText("見積時間")).toHaveValue(null);
    expect(screen.getByLabelText("実績時間")).toHaveValue(null);
  });

  it("キャンセルするとonCloseが呼ばれ、onSaveは呼ばれない", async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <ChildItemDetail item={buildItem()} onSave={onSave} onClose={onClose} />,
    );
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
