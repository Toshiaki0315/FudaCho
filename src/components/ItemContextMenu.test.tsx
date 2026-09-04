import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ItemContextMenu } from "./ItemContextMenu";

function renderMenu(overrides: Partial<Parameters<typeof ItemContextMenu>[0]>) {
  const props = {
    x: 10,
    y: 20,
    isParent: false,
    isFiltered: false,
    showDrop: true,
    canDrop: true,
    onShowDetail: vi.fn(),
    onToggleParentFilter: vi.fn(),
    onDrop: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<ItemContextMenu {...props} />);
  return props;
}

describe("ItemContextMenu", () => {
  it("指定された座標にメニューを表示する", () => {
    renderMenu({ x: 120, y: 240 });
    expect(screen.getByRole("menu")).toHaveStyle({
      left: "120px",
      top: "240px",
    });
  });

  it("詳細表示をクリックするとコールバックを呼ぶ", async () => {
    const user = userEvent.setup();
    const props = renderMenu({});
    await user.click(screen.getByRole("menuitem", { name: "詳細表示" }));
    expect(props.onShowDetail).toHaveBeenCalled();
  });

  it("子アイテムでは絞り込みメニューを表示しない", () => {
    renderMenu({ isParent: false });
    expect(
      screen.queryByRole("menuitem", { name: "この親で絞り込み" }),
    ).not.toBeInTheDocument();
  });

  it("親アイテムでは絞り込みメニューを表示する", async () => {
    const user = userEvent.setup();
    const props = renderMenu({ isParent: true });
    await user.click(
      screen.getByRole("menuitem", { name: "この親で絞り込み" }),
    );
    expect(props.onToggleParentFilter).toHaveBeenCalled();
  });

  it("絞り込み中の親では解除メニューを表示する", () => {
    renderMenu({ isParent: true, isFiltered: true });
    expect(
      screen.getByRole("menuitem", { name: "絞り込みを解除" }),
    ).toBeInTheDocument();
  });

  it("showDropがfalseならDropメニューを表示しない", () => {
    renderMenu({ showDrop: false });
    expect(
      screen.queryByRole("menuitem", { name: "Drop" }),
    ).not.toBeInTheDocument();
  });

  it("canDropがfalseならDropメニューは押せない", () => {
    renderMenu({ canDrop: false });
    expect(screen.getByRole("menuitem", { name: "Drop" })).toBeDisabled();
  });

  it("Dropをクリックするとコールバックを呼ぶ", async () => {
    const user = userEvent.setup();
    const props = renderMenu({});
    await user.click(screen.getByRole("menuitem", { name: "Drop" }));
    expect(props.onDrop).toHaveBeenCalled();
  });

  it("削除をクリックするとコールバックを呼ぶ", async () => {
    const user = userEvent.setup();
    const props = renderMenu({});
    await user.click(screen.getByRole("menuitem", { name: "削除" }));
    expect(props.onDelete).toHaveBeenCalled();
  });

  it("背景をクリックすると閉じる", async () => {
    const user = userEvent.setup();
    const props = renderMenu({});
    await user.click(screen.getByLabelText("メニューを閉じる"));
    expect(props.onClose).toHaveBeenCalled();
  });

  it("背景を右クリックしても閉じる（既定のOSメニューは出さない）", () => {
    const props = renderMenu({});
    const backdrop = screen.getByLabelText("メニューを閉じる");
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    backdrop.dispatchEvent(event);
    expect(props.onClose).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });
});
