import { render, screen, within } from "@testing-library/react";
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
  });

  it("概要と理由は複数行が入力できるテキストエリアである", () => {
    renderDetail();
    expect(screen.getByLabelText("概要").tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText("理由").tagName).toBe("TEXTAREA");
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
    expect(options).toEqual(["0", "1", "2", "3", "5", "8", "13", "21", "♾️"]);
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

  it("既存のコメントが一覧表示される", () => {
    const item = createParentItem({
      id: "P-1",
      summary: "設計する",
      laneId: "lane-1",
      comments: ["一つ目", "二つ目"],
    });
    renderDetail({ item });
    const list = screen.getByRole("list", { name: "コメント" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("一つ目");
    expect(rows[1]).toHaveTextContent("二つ目");
  });

  it("コメントを何件でも追加でき、入力欄は追加のたびにクリアされる", async () => {
    const user = userEvent.setup();
    renderDetail();
    const input = screen.getByLabelText("新しいコメント");
    await user.type(input, "追加コメント1");
    await user.click(screen.getByRole("button", { name: "コメントを追加" }));
    expect(input).toHaveValue("");
    await user.type(input, "追加コメント2");
    await user.click(screen.getByRole("button", { name: "コメントを追加" }));
    const list = screen.getByRole("list", { name: "コメント" });
    const rows = within(list).getAllByRole("listitem");
    // 既存1件 + 追加2件
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent("追加コメント1");
    expect(rows[2]).toHaveTextContent("追加コメント2");
  });

  it("空のコメントは追加できない", async () => {
    const user = userEvent.setup();
    renderDetail();
    await user.click(screen.getByRole("button", { name: "コメントを追加" }));
    const list = screen.getByRole("list", { name: "コメント" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
  });

  it("追加したコメントは保存時にすべて渡される", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderDetail({ onSave });
    await user.type(screen.getByLabelText("新しいコメント"), "レビュー済み");
    await user.click(screen.getByRole("button", { name: "コメントを追加" }));
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        comments: ["最初のコメント", "レビュー済み"],
      }),
    );
  });

  it("ラベルを追加・削除して保存できる（不正・重複ラベルは追加されない）", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderDetail({ onSave });
    const input = screen.getByLabelText("新しいラベル");
    const addButton = screen.getByRole("button", { name: "ラベルを追加" });
    await user.type(input, "設計");
    await user.click(addButton);
    expect(input).toHaveValue("");
    // 重複は追加されない
    await user.type(input, "設計");
    await user.click(addButton);
    // 区切り文字入りは追加されない
    await user.clear(input);
    await user.type(input, "a;b");
    await user.click(addButton);
    const list = screen.getByRole("list", { name: "ラベル" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    await user.clear(input);
    await user.type(input, "急ぎ");
    await user.click(addButton);
    await user.click(
      screen.getByRole("button", { name: "ラベル「設計」を削除" }),
    );
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ labels: ["急ぎ"] }),
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
