import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createLane, type Lane } from "../domain/lane";
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
    expect(within(rows[0]).getByRole("textbox")).toHaveValue("PBL");
  });

  it("固定レーン（PBL/SBL/Close/Drop）は役割バッジが表示され、削除・並び替えボタンがない", () => {
    renderDialog();
    const rows = screen.getAllByRole("listitem");
    for (const [index, badge] of [
      [0, "PBL"],
      [1, "SBL"],
      [3, "Close"],
      [4, "Drop"],
    ] as const) {
      expect(within(rows[index]).getByText(badge)).toBeInTheDocument();
      expect(
        within(rows[index]).queryByRole("button", { name: "削除" }),
      ).not.toBeInTheDocument();
      expect(
        within(rows[index]).queryByRole("button", { name: "上へ" }),
      ).not.toBeInTheDocument();
    }
  });

  it("固定レーンにはWIP入力がなく、自由レーンにはある", () => {
    renderDialog();
    const rows = screen.getAllByRole("listitem");
    for (const index of [0, 1, 3, 4]) {
      expect(
        within(rows[index]).queryByRole("spinbutton", { name: /WIP/ }),
      ).not.toBeInTheDocument();
    }
    expect(
      within(rows[2]).getByRole("spinbutton", { name: /WIP/ }),
    ).toBeInTheDocument();
  });

  it("固定レーンにWIP制限が残っていても保存時にnullへ正規化される", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    const settings = createDefaultSettings();
    settings.lanes = settings.lanes.map((lane) =>
      lane.role === "drop" ? { ...lane, wipLimit: 5 } : lane,
    );
    renderDialog({ onSave, settings });
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave.mock.calls[0][0].lanes[4].wipLimit).toBeNull();
  });

  it("＋レーンを追加ボタンは自由レーンセクション内（Closeの手前）にある", () => {
    renderDialog();
    const list = screen.getByRole("list");
    const items = Array.from(list.children).map((el) => el.textContent ?? "");
    const addIndex = items.findIndex((text) => text.includes("＋レーンを追加"));
    const closeIndex = items.findIndex((text) => text.includes("Close"));
    const freeIndex = items.findIndex((text) => text.includes("作業中"));
    expect(addIndex).toBeGreaterThan(freeIndex);
    expect(addIndex).toBeLessThan(closeIndex);
  });

  it("固定レーンと自由レーンの間に区切り線が表示される", () => {
    const { container } = renderDialog();
    expect(container.querySelectorAll(".settings-lane-divider")).toHaveLength(
      2,
    );
  });

  it("固定レーンも改名して保存できる（IDと役割は不変）", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onSave });
    const pblName = within(screen.getAllByRole("listitem")[0]).getByRole(
      "textbox",
    );
    await user.clear(pblName);
    await user.type(pblName, "要求一覧");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave.mock.calls[0][0].lanes[0]).toMatchObject({
      id: "lane-1",
      name: "要求一覧",
      role: "pbl",
    });
  });

  it("自由レーンには上へ・下へ・削除ボタンがある", () => {
    renderDialog();
    const freeRow = screen.getAllByRole("listitem")[2];
    expect(
      within(freeRow).getByRole("button", { name: "削除" }),
    ).toBeInTheDocument();
    expect(
      within(freeRow).getByRole("button", { name: "上へ" }),
    ).toBeInTheDocument();
  });

  it("＋レーンを追加はCloseの手前に自由レーンを挿入する", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onSave });
    await user.click(screen.getByRole("button", { name: "＋レーンを追加" }));
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(6);
    expect(within(rows[3]).getByRole("textbox")).toHaveValue("新しいレーン");
    await user.click(screen.getByRole("button", { name: "保存" }));
    const saved = onSave.mock.calls[0][0];
    expect(saved.lanes.map((l: Lane) => l.role)).toEqual([
      "pbl",
      "sbl",
      "free",
      "free",
      "close",
      "drop",
    ]);
    expect(saved.lanes[3].id).toBe("lane-6");
  });

  it("自由レーンを削除して保存できる（自由レーンが残る場合）", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    const settings = createDefaultSettings();
    settings.lanes = [
      ...settings.lanes.slice(0, 3),
      createLane({ id: "lane-6", name: "レビュー" }),
      ...settings.lanes.slice(3),
    ];
    renderDialog({ onSave, settings });
    const rows = screen.getAllByRole("listitem");
    await user.click(within(rows[2]).getByRole("button", { name: "削除" }));
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave.mock.calls[0][0].lanes.map((l: Lane) => l.name)).toEqual([
      "PBL",
      "SBL",
      "レビュー",
      "Close",
      "Drop",
    ]);
  });

  it("自由レーン同士で上へ・下へで並び替えられる（範囲外は無効）", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    const settings = createDefaultSettings();
    settings.lanes = [
      ...settings.lanes.slice(0, 3),
      createLane({ id: "lane-6", name: "レビュー" }),
      ...settings.lanes.slice(3),
    ];
    renderDialog({ onSave, settings });
    const rows = screen.getAllByRole("listitem");
    // 先頭の自由レーンの「上へ」と末尾の自由レーンの「下へ」は無効
    expect(
      within(rows[2]).getByRole("button", { name: "上へ" }),
    ).toBeDisabled();
    expect(
      within(rows[3]).getByRole("button", { name: "下へ" }),
    ).toBeDisabled();
    await user.click(within(rows[3]).getByRole("button", { name: "上へ" }));
    // 入れ替え後、先頭になったレビューの「下へ」で元に戻せる
    await user.click(
      within(screen.getAllByRole("listitem")[2]).getByRole("button", {
        name: "下へ",
      }),
    );
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave.mock.calls[0][0].lanes.map((l: Lane) => l.name)).toEqual([
      "PBL",
      "SBL",
      "作業中",
      "レビュー",
      "Close",
      "Drop",
    ]);
  });

  it("レーン毎のWIP制限を設定して保存できる（空欄=制限なし）", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onSave });
    const rows = screen.getAllByRole("listitem");
    await user.type(
      within(rows[2]).getByRole("spinbutton", { name: /WIP/ }),
      "3",
    );
    await user.click(screen.getByRole("button", { name: "保存" }));
    const saved = onSave.mock.calls[0][0];
    expect(saved.lanes[2].wipLimit).toBe(3);
    expect(saved.lanes[0].wipLimit).toBeNull();
  });

  it("WIP制限を空欄に戻すと制限なしとして保存される", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    const settings = createDefaultSettings();
    settings.lanes = settings.lanes.map((lane) =>
      lane.id === "lane-3" ? { ...lane, wipLimit: 5 } : lane,
    );
    renderDialog({ onSave, settings });
    const wipInput = within(screen.getAllByRole("listitem")[2]).getByRole(
      "spinbutton",
      { name: /WIP/ },
    );
    expect(wipInput).toHaveValue(5);
    await user.clear(wipInput);
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave.mock.calls[0][0].lanes[2].wipLimit).toBeNull();
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
    const ids = onSave.mock.calls[0][0].lanes.map((l: Lane) => l.id);
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
