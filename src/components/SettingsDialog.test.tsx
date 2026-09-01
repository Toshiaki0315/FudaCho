import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createDefaultSettings } from "../domain/settings";
import { SettingsDialog } from "./SettingsDialog";

describe("SettingsDialog", () => {
  it("プロジェクト名と全レーンの現在値を表示する", () => {
    render(
      <SettingsDialog
        settings={createDefaultSettings()}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog", { name: "設定" })).toBeInTheDocument();
    expect(screen.getByLabelText("プロジェクト名")).toHaveValue("札帖");
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(5);
    expect(within(rows[0]).getByText("ToDo")).toBeInTheDocument();
    expect(within(rows[0]).getByRole("textbox")).toHaveValue("未着手");
  });

  it("プロジェクト名とレーン名を変更して保存できる", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <SettingsDialog
        settings={createDefaultSettings()}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    const projectName = screen.getByLabelText("プロジェクト名");
    await user.clear(projectName);
    await user.type(projectName, "新しい名前");
    const firstLaneName = within(screen.getAllByRole("listitem")[0]).getByRole(
      "textbox",
    );
    await user.clear(firstLaneName);
    await user.type(firstLaneName, "バックログ");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        projectName: "新しい名前",
        lanes: expect.arrayContaining([
          { status: "ToDo", displayName: "バックログ" },
        ]),
      }),
    );
  });

  it("レーンを削除して保存できる", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <SettingsDialog
        settings={createDefaultSettings()}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    const closeLane = screen.getAllByRole("listitem")[3];
    await user.click(within(closeLane).getByRole("button", { name: "削除" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    await user.click(screen.getByRole("button", { name: "保存" }));
    const saved = onSave.mock.calls[0][0];
    expect(saved.lanes.map((l: { status: string }) => l.status)).toEqual([
      "ToDo",
      "InProgress",
      "Done",
      "Dropped",
    ]);
  });

  it("削除したレーンのステータスを再追加できる", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <SettingsDialog
        settings={createDefaultSettings()}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    const closeLane = screen.getAllByRole("listitem")[3];
    await user.click(within(closeLane).getByRole("button", { name: "削除" }));
    await user.click(screen.getByRole("button", { name: "＋レーンを追加" }));
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(5);
    // 再追加されたレーンは未使用ステータス（Close）でデフォルト名を持つ
    expect(within(rows[4]).getByText("Close")).toBeInTheDocument();
    expect(within(rows[4]).getByRole("textbox")).toHaveValue("Close");
  });

  it("全ステータス使用中は追加ボタンを表示しない", () => {
    render(
      <SettingsDialog
        settings={createDefaultSettings()}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "＋レーンを追加" }),
    ).not.toBeInTheDocument();
  });

  it("保存が失敗した場合はエラーメッセージを表示して閉じない", async () => {
    const onSave = vi.fn(() => {
      throw new Error("レーン名は必須です");
    });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <SettingsDialog
        settings={createDefaultSettings()}
        onSave={onSave}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.getByText(/レーン名は必須です/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("保存が成功したら閉じる", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <SettingsDialog
        settings={createDefaultSettings()}
        onSave={vi.fn()}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("キャンセルするとonCloseが呼ばれ、onSaveは呼ばれない", async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <SettingsDialog
        settings={createDefaultSettings()}
        onSave={onSave}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
