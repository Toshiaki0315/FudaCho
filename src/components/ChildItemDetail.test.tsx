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
    laneId: "lane-2",
    assignee: "野村",
    estimatedHours: 4,
    actualHours: 2.5,
    startDate: "2026-09-01",
    endDate: "2026-09-02",
  });
}

function renderDetail(
  overrides: Partial<Parameters<typeof ChildItemDetail>[0]> = {},
) {
  return render(
    <ChildItemDetail
      item={buildItem()}
      laneName="作業中"
      onSave={vi.fn()}
      onClose={vi.fn()}
      {...overrides}
    />,
  );
}

describe("ChildItemDetail", () => {
  it("ダイアログとして表示され、全フィールドの現在値が表示される", () => {
    renderDetail();
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

  it("作業内容は複数行が見える大きめのテキストエリアである", () => {
    renderDetail();
    const description = screen.getByLabelText("作業内容");
    expect(description.tagName).toBe("TEXTAREA");
    expect(description).toHaveAttribute("rows", "4");
  });

  it("所属レーン名は読み取り専用で表示される（移動はD&Dで行う）", () => {
    renderDetail();
    expect(screen.getByText("作業中")).toBeInTheDocument();
    expect(screen.queryByLabelText("レーン")).not.toBeInTheDocument();
  });

  it("全フィールドを編集して保存すると変更内容がonSaveに渡される", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderDetail({ onSave });
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
    renderDetail({ onSave });
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
      laneId: "lane-1",
    });
    renderDetail({ item });
    expect(screen.getByLabelText("見積時間")).toHaveValue(null);
    expect(screen.getByLabelText("実績時間")).toHaveValue(null);
  });

  it("キャンセルするとonCloseが呼ばれ、onSaveは呼ばれない", async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderDetail({ onSave, onClose });
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
