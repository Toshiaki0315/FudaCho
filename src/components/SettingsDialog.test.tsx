import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Lane } from "../domain/lane";
import { createDefaultSettings } from "../domain/settings";
import { SettingsDialog } from "./SettingsDialog";

function renderDialog(
  overrides: Partial<Parameters<typeof SettingsDialog>[0]> = {},
) {
  return render(
    <SettingsDialog
      settings={createDefaultSettings()}
      onSave={vi.fn()}
      onClose={vi.fn()}
      {...overrides}
    />,
  );
}

describe("SettingsDialog", () => {
  it("プロジェクト名と全レーンの現在値を表示する", () => {
    renderDialog();
    expect(screen.getByRole("dialog", { name: "設定" })).toBeInTheDocument();
    expect(screen.getByLabelText("プロジェクト名")).toHaveValue("札帖");
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(5);
    expect(within(rows[0]).getByRole("textbox")).toHaveValue("未着手");
  });

  it("投入先レーンにはバッジが表示される", () => {
    renderDialog();
    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getByText("投入先")).toBeInTheDocument();
    expect(within(rows[1]).queryByText("投入先")).not.toBeInTheDocument();
  });

  it("プロジェクト名とレーン名を変更して保存できる（IDは不変）", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onSave });
    const projectName = screen.getByLabelText("プロジェクト名");
    await user.clear(projectName);
    await user.type(projectName, "新しい名前");
    const firstLaneName = within(screen.getAllByRole("listitem")[0]).getByRole(
      "textbox",
    );
    await user.clear(firstLaneName);
    await user.type(firstLaneName, "バックログ");
    await user.click(screen.getByRole("button", { name: "保存" }));
    const saved = onSave.mock.calls[0][0];
    expect(saved.projectName).toBe("新しい名前");
    expect(saved.lanes[0]).toMatchObject({
      id: "lane-1",
      name: "バックログ",
      isDefaultEntry: true,
    });
  });

  it("レーンを削除して保存できる", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onSave });
    const closeLane = screen.getAllByRole("listitem")[3];
    await user.click(within(closeLane).getByRole("button", { name: "削除" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    await user.click(screen.getByRole("button", { name: "保存" }));
    const saved = onSave.mock.calls[0][0];
    expect(saved.lanes.map((l: Lane) => l.id)).toEqual([
      "lane-1",
      "lane-2",
      "lane-3",
      "lane-5",
    ]);
  });

  it("レーンを追加すると新しいIDが採番される", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onSave });
    await user.click(screen.getByRole("button", { name: "＋レーンを追加" }));
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(6);
    expect(within(rows[5]).getByRole("textbox")).toHaveValue("新しいレーン");
    await user.click(screen.getByRole("button", { name: "保存" }));
    const saved = onSave.mock.calls[0][0];
    expect(saved.lanes[5]).toMatchObject({
      id: "lane-6",
      name: "新しいレーン",
    });
  });

  it("削除後に追加してもIDは重複しない", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onSave });
    // lane-5（中断）を削除してから追加 → 新IDは lane-6 ではなく最大値+1
    const rows = screen.getAllByRole("listitem");
    await user.click(within(rows[4]).getByRole("button", { name: "削除" }));
    await user.click(screen.getByRole("button", { name: "＋レーンを追加" }));
    await user.click(screen.getByRole("button", { name: "保存" }));
    const saved = onSave.mock.calls[0][0];
    const ids = saved.lanes.map((l: Lane) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("lane-5");
  });

  it("「上へ」でレーンの順序を入れ替えて保存できる", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onSave });
    const rows = screen.getAllByRole("listitem");
    await user.click(within(rows[1]).getByRole("button", { name: "上へ" }));
    await user.click(screen.getByRole("button", { name: "保存" }));
    const saved = onSave.mock.calls[0][0];
    expect(saved.lanes.map((l: Lane) => l.name)).toEqual([
      "作業中",
      "未着手",
      "完了",
      "クローズ",
      "中断",
    ]);
  });

  it("「下へ」でレーンの順序を入れ替えられる", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onSave });
    const rows = screen.getAllByRole("listitem");
    await user.click(within(rows[0]).getByRole("button", { name: "下へ" }));
    await user.click(screen.getByRole("button", { name: "保存" }));
    const saved = onSave.mock.calls[0][0];
    expect(saved.lanes.map((l: Lane) => l.name).slice(0, 2)).toEqual([
      "作業中",
      "未着手",
    ]);
  });

  it("先頭の「上へ」と末尾の「下へ」は無効である", () => {
    renderDialog();
    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getByRole("button", { name: "上へ" })).toBeDisabled();
    expect(within(rows[4]).getByRole("button", { name: "下へ" })).toBeDisabled();
    expect(
      within(rows[2]).getByRole("button", { name: "上へ" }),
    ).not.toBeDisabled();
  });

  it("lane-n形式でないIDがあっても追加時の採番は壊れない", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    const settings = createDefaultSettings();
    settings.lanes = [
      { ...settings.lanes[0], id: "custom-id" },
      ...settings.lanes.slice(1),
    ];
    renderDialog({ onSave, settings });
    await user.click(screen.getByRole("button", { name: "＋レーンを追加" }));
    await user.click(screen.getByRole("button", { name: "保存" }));
    const saved = onSave.mock.calls[0][0];
    const ids = saved.lanes.map((l: Lane) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("保存が失敗した場合はエラーメッセージを表示して閉じない", async () => {
    const onSave = vi.fn(() => {
      throw new Error("レーン名は必須です");
    });
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onSave, onClose });
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.getByText(/レーン名は必須です/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Error以外の例外も文字列化して表示する", async () => {
    const onSave = vi.fn(() => {
      throw "文字列の例外";
    });
    const user = userEvent.setup();
    renderDialog({ onSave });
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.getByText("文字列の例外")).toBeInTheDocument();
  });

  it("保存が成功したら閉じる", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onClose });
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("キャンセルするとonCloseが呼ばれ、onSaveは呼ばれない", async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onSave, onClose });
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
