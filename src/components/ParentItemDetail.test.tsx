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
    laneId: "lane-2",
    assignee: "野村",
    reason: "リリースに必要",
    plannedStartDate: "2026-09-01",
    plannedEndDate: "2026-09-30",
    notes: "備考メモ",
    comments: ["最初のコメント"],
  });
}

function renderDetail(
  overrides: Partial<Parameters<typeof ParentItemDetail>[0]> = {},
) {
  return render(
    <ParentItemDetail
      item={buildItem()}
      laneName="作業中"
      onSave={vi.fn()}
      onClose={vi.fn()}
      {...overrides}
    />,
  );
}

describe("ParentItemDetail", () => {
  it("ダイアログとして表示され、全フィールドの現在値が表示される", () => {
    renderDetail();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("P-1")).toBeInTheDocument();
    expect(screen.getByLabelText("概要")).toHaveValue("設計する");
    expect(screen.getByLabelText("サイズ")).toHaveValue("5");
    expect(screen.getByLabelText("担当者")).toHaveValue("野村");
    expect(screen.getByLabelText("理由")).toHaveValue("リリースに必要");
    expect(screen.getByLabelText("開始予定日")).toHaveValue("2026-09-01");
    expect(screen.getByLabelText("終了予定日")).toHaveValue("2026-09-30");
    expect(screen.getByLabelText("備考")).toHaveValue("備考メモ");
    expect(screen.getByLabelText("コメント")).toHaveValue("最初のコメント");
  });

  it("所属レーン名は読み取り専用で表示される（移動はD&Dで行う）", () => {
    renderDetail();
    expect(screen.getByText("作業中")).toBeInTheDocument();
    expect(screen.queryByLabelText("レーン")).not.toBeInTheDocument();
  });

  it("サイズの選択肢はフィボナッチ数列のみである", () => {
    renderDetail();
    const options = screen
      .getAllByRole("option")
      .map((o) => (o as HTMLOptionElement).value);
    expect(options).toEqual(["0", "1", "2", "3", "5", "8", "13", "♾️"]);
  });

  it("編集して保存すると変更内容がonSaveに渡される", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderDetail({ onSave });
    const summary = screen.getByLabelText("概要");
    await user.clear(summary);
    await user.type(summary, "詳細設計する");
    await user.selectOptions(screen.getByLabelText("サイズ"), "8");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ summary: "詳細設計する", size: 8 }),
    );
  });

  it("担当者・理由・開始/終了予定日・備考も編集して保存できる", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderDetail({ onSave });
    await user.type(screen.getByLabelText("担当者"), "2");
    await user.type(screen.getByLabelText("理由"), "！");
    await user.type(screen.getByLabelText("開始予定日"), "頃");
    await user.type(screen.getByLabelText("終了予定日"), "頃");
    await user.type(screen.getByLabelText("備考"), "追記");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        assignee: "野村2",
        reason: "リリースに必要！",
        plannedStartDate: "2026-09-01頃",
        plannedEndDate: "2026-09-30頃",
        notes: "備考メモ追記",
      }),
    );
  });

  it("サイズに♾️を選択して保存できる", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderDetail({ onSave });
    await user.selectOptions(screen.getByLabelText("サイズ"), "♾️");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ size: "♾️" }),
    );
  });

  it("コメントは1行1件として保存される", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderDetail({ onSave });
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
    renderDetail({ onSave, onClose });
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("onAddChildを渡すと「＋子アイテムを追加」ボタンが表示されクリックで呼ばれる", async () => {
    const onAddChild = vi.fn();
    const user = userEvent.setup();
    renderDetail({ onAddChild });
    await user.click(
      screen.getByRole("button", { name: "＋子アイテムを追加" }),
    );
    expect(onAddChild).toHaveBeenCalledTimes(1);
  });
});
