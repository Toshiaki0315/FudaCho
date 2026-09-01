import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBoardStore } from "../store/boardStore";
import { BoardView } from "./BoardView";

// デフォルトレーン: lane-1=PBL, lane-2=SBL, lane-3=作業中(自由), lane-4=Close, lane-5=Drop

describe("BoardView", () => {
  beforeEach(() => {
    useBoardStore.getState().reset();
  });

  it("親アイテムはPBL、子アイテムはSBLレーンに表示される", () => {
    const parentId = useBoardStore
      .getState()
      .addParent({ summary: "設計する" });
    useBoardStore.getState().addChild({ parentId, description: "図を描く" });
    render(<BoardView />);
    const pblLane = screen.getByRole("region", { name: "PBL" });
    expect(within(pblLane).getByText("設計する")).toBeInTheDocument();
    const sblLane = screen.getByRole("region", { name: "SBL" });
    expect(within(sblLane).getByText("図を描く")).toBeInTheDocument();
  });

  it("PBLの「＋新規作成」で親アイテムが追加される", async () => {
    const user = userEvent.setup();
    render(<BoardView />);
    const pblLane = screen.getByRole("region", { name: "PBL" });
    await user.click(
      within(pblLane).getByRole("button", { name: "＋新規作成" }),
    );
    expect(within(pblLane).getByText("P-1")).toBeInTheDocument();
    expect(useBoardStore.getState().parents["P-1"].laneId).toBe("lane-1");
  });

  it("SBLの「＋新規作成」で親なしの子アイテムが追加される", async () => {
    const user = userEvent.setup();
    render(<BoardView />);
    const sblLane = screen.getByRole("region", { name: "SBL" });
    await user.click(
      within(sblLane).getByRole("button", { name: "＋新規作成" }),
    );
    expect(within(sblLane).getByText("C-1")).toBeInTheDocument();
    expect(useBoardStore.getState().children["C-1"].parentId).toBeNull();
  });

  it("レーン内の優先順位どおりの順序でカードを表示する", () => {
    useBoardStore.getState().addParent({ summary: "A" });
    useBoardStore.getState().addParent({ summary: "B" });
    useBoardStore.getState().reorderLane("lane-1", 1, 0);
    render(<BoardView />);
    const pblLane = screen.getByRole("region", { name: "PBL" });
    const cards = within(pblLane).getAllByRole("article");
    expect(cards[0]).toHaveTextContent("B");
    expect(cards[1]).toHaveTextContent("A");
  });

  it("移動できないD&Dは通知が表示され、閉じるボタンで消せる", async () => {
    const user = userEvent.setup();
    useBoardStore.getState().addParent({ summary: "A" });
    render(<BoardView />);
    act(() => {
      useBoardStore.getState().handleDragEnd("P-1", "lane-3");
    });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "親アイテムはCloseまたはDropレーンへのみ移動できます",
    );
    await user.click(within(alert).getByRole("button", { name: "閉じる" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("通知は数秒後に自動で消える", async () => {
    vi.useFakeTimers();
    try {
      useBoardStore.getState().addParent({ summary: "A" });
      render(<BoardView />);
      act(() => {
        useBoardStore.getState().handleDragEnd("P-1", "lane-2");
      });
      expect(screen.getByRole("alert")).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("親カードをダブルクリックすると詳細ビューが開きレーン名が表示される", async () => {
    const user = userEvent.setup();
    useBoardStore.getState().addParent({ summary: "設計する" });
    render(<BoardView />);
    await user.dblClick(screen.getByText("設計する"));
    const dialog = screen.getByRole("dialog", { name: "P-1 の詳細" });
    expect(within(dialog).getByText("PBL")).toBeInTheDocument();
    expect(screen.getByLabelText("概要")).toHaveValue("設計する");
  });

  it("親詳細ビューで編集して保存するとカードに反映されダイアログが閉じる", async () => {
    const user = userEvent.setup();
    useBoardStore.getState().addParent({ summary: "設計する" });
    render(<BoardView />);
    await user.dblClick(screen.getByText("設計する"));
    const summary = screen.getByLabelText("概要");
    await user.clear(summary);
    await user.type(summary, "詳細設計する");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("詳細設計する")).toBeInTheDocument();
  });

  it("子カードをダブルクリックすると子詳細ビューが開き、保存で反映される", async () => {
    const user = userEvent.setup();
    useBoardStore.getState().addChild({ description: "図を描く" });
    render(<BoardView />);
    await user.dblClick(screen.getByText("図を描く"));
    expect(
      screen.getByRole("dialog", { name: "C-1 の詳細" }),
    ).toBeInTheDocument();
    expect(screen.getByText("親: なし")).toBeInTheDocument();
    const description = screen.getByLabelText("作業内容");
    await user.clear(description);
    await user.type(description, "詳細図を描く");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("詳細図を描く")).toBeInTheDocument();
  });

  it("親を持つ子の詳細ビューには親から引き継いだラベルが表示される", async () => {
    const user = userEvent.setup();
    const parentId = useBoardStore
      .getState()
      .addParent({ summary: "設計する", labels: ["設計"] });
    useBoardStore.getState().addChild({ parentId, description: "図を描く" });
    render(<BoardView />);
    await user.dblClick(screen.getByText("図を描く"));
    const inherited = screen.getByRole("list", {
      name: "親から引き継いだラベル",
    });
    expect(within(inherited).getByText("設計")).toBeInTheDocument();
  });

  it("詳細ビューをキャンセルすると変更されずに閉じる", async () => {
    const user = userEvent.setup();
    useBoardStore.getState().addParent({ summary: "設計する" });
    render(<BoardView />);
    await user.dblClick(screen.getByText("設計する"));
    const summary = screen.getByLabelText("概要");
    await user.clear(summary);
    await user.type(summary, "変更したが保存しない");
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(useBoardStore.getState().parents["P-1"].summary).toBe("設計する");
  });

  it("Readyな親の詳細ビューから子アイテムを追加するとSBLに作成される", async () => {
    const user = userEvent.setup();
    useBoardStore
      .getState()
      .addParent({ summary: "設計する", reason: "理由", ready: true });
    render(<BoardView />);
    await user.dblClick(screen.getByText("設計する"));
    await user.click(
      screen.getByRole("button", { name: "＋子アイテムを追加" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const state = useBoardStore.getState();
    expect(state.parents["P-1"].childIds).toEqual(["C-1"]);
    expect(state.children["C-1"].laneId).toBe("lane-2");
    const sblLane = screen.getByRole("region", { name: "SBL" });
    expect(within(sblLane).getByText("C-1")).toBeInTheDocument();
  });

  describe("ラベルと絞り込み", () => {
    function seedLabeledBoard() {
      const p1 = useBoardStore
        .getState()
        .addParent({ summary: "設計タスク", labels: ["設計"] });
      useBoardStore
        .getState()
        .addChild({ parentId: p1, description: "図を描く" });
      useBoardStore.getState().addParent({ summary: "別のタスク" });
      useBoardStore.getState().addChild({
        description: "独自ラベル作業",
        labels: ["フロント"],
      });
    }

    it("カードにラベルが表示され、子は親のラベルを引き継いで表示する", () => {
      seedLabeledBoard();
      render(<BoardView />);
      // 親カードのラベル + 子カードに引き継がれたラベル
      expect(screen.getAllByRole("button", { name: "設計" })).toHaveLength(2);
      expect(
        screen.getByRole("button", { name: "フロント" }),
      ).toBeInTheDocument();
    });

    it("子の実効ラベル（親から継承）でも絞り込める", async () => {
      const user = userEvent.setup();
      seedLabeledBoard();
      render(<BoardView />);
      const sblLane = screen.getByRole("region", { name: "SBL" });
      // 子カード上の継承ラベル「設計」をクリック → 子（継承）と親が残る
      await user.click(within(sblLane).getByRole("button", { name: "設計" }));
      expect(screen.getByText("図を描く")).toBeInTheDocument();
      expect(screen.queryByText("独自ラベル作業")).not.toBeInTheDocument();
    });

    it("複数ラベルのAND絞り込みと個別解除ができる", async () => {
      const user = userEvent.setup();
      // 1: A,B / 2: なし / 3: B / 4: A
      useBoardStore
        .getState()
        .addParent({ summary: "アイテム1", labels: ["A", "B"] });
      useBoardStore.getState().addParent({ summary: "アイテム2" });
      useBoardStore
        .getState()
        .addParent({ summary: "アイテム3", labels: ["B"] });
      useBoardStore
        .getState()
        .addParent({ summary: "アイテム4", labels: ["A"] });
      render(<BoardView />);
      const board = screen.getByRole("region", { name: "PBL" });
      const visible = () => within(board).queryAllByRole("article");

      await user.click(within(board).getAllByRole("button", { name: "A" })[0]);
      expect(visible()).toHaveLength(2);
      await user.click(within(board).getAllByRole("button", { name: "B" })[0]);
      expect(visible()).toHaveLength(1);
      await user.click(within(board).getAllByRole("button", { name: "B" })[0]);
      expect(visible()).toHaveLength(2);
      await user.click(within(board).getAllByRole("button", { name: "A" })[0]);
      expect(visible()).toHaveLength(4);
      expect(screen.queryByText(/絞り込み中/)).not.toBeInTheDocument();
    });

    it("絞り込みバーのチップで個別解除、「すべて解除」で全解除できる", async () => {
      const user = userEvent.setup();
      useBoardStore
        .getState()
        .addParent({ summary: "アイテム1", labels: ["A", "B"] });
      useBoardStore
        .getState()
        .addParent({ summary: "アイテム4", labels: ["A"] });
      render(<BoardView />);
      const board = screen.getByRole("region", { name: "PBL" });
      await user.click(within(board).getAllByRole("button", { name: "A" })[0]);
      await user.click(within(board).getByRole("button", { name: "B" }));
      await user.click(
        screen.getByRole("button", {
          name: "ラベル「B」の絞り込みを解除",
        }),
      );
      expect(within(board).queryAllByRole("article")).toHaveLength(2);
      await user.click(screen.getByRole("button", { name: "すべて解除" }));
      expect(screen.queryByText(/絞り込み中/)).not.toBeInTheDocument();
    });
  });

  describe("右クリックメニュー", () => {
    it("PBL/SBLのアイテムは詳細表示・Drop・削除のメニューが表示される", () => {
      useBoardStore.getState().addParent({ summary: "設計する" });
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("設計する"));
      const items = screen.getAllByRole("menuitem");
      expect(items.map((i) => i.textContent)).toEqual([
        "詳細表示",
        "Drop",
        "削除",
      ]);
    });

    it("自由レーンのアイテムも詳細表示・Drop・削除のメニューが表示される", () => {
      useBoardStore.getState().addChild({ description: "作業" });
      useBoardStore.getState().moveItem("C-1", "lane-3");
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("作業"));
      expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(
        ["詳細表示", "Drop", "削除"],
      );
    });

    it("Close/DropレーンのアイテムはDropメニューが表示されない", () => {
      useBoardStore.getState().addChild({ description: "作業" });
      useBoardStore.getState().moveItem("C-1", "lane-4");
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("作業"));
      expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(
        ["詳細表示", "削除"],
      );
    });

    it("詳細表示メニューで詳細ビューが開く", async () => {
      const user = userEvent.setup();
      useBoardStore.getState().addParent({ summary: "設計する" });
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("設計する"));
      await user.click(screen.getByRole("menuitem", { name: "詳細表示" }));
      expect(
        screen.getByRole("dialog", { name: "P-1 の詳細" }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("Dropメニューで親をDropすると子もすべてDropされる", async () => {
      const user = userEvent.setup();
      const parentId = useBoardStore
        .getState()
        .addParent({ summary: "設計する" });
      useBoardStore.getState().addChild({ parentId, description: "作業1" });
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("設計する"));
      await user.click(screen.getByRole("menuitem", { name: "Drop" }));
      const state = useBoardStore.getState();
      expect(state.parents["P-1"].laneId).toBe("lane-5");
      expect(state.children["C-1"].laneId).toBe("lane-5");
    });

    it("子アイテムをDropすると親カードの子カウント表示が更新される", async () => {
      const user = userEvent.setup();
      const parentId = useBoardStore
        .getState()
        .addParent({ summary: "設計する" });
      useBoardStore.getState().addChild({ parentId, description: "作業1" });
      useBoardStore.getState().addChild({ parentId, description: "作業2" });
      render(<BoardView />);
      expect(screen.getByText("子 0 / 2")).toBeInTheDocument();
      fireEvent.contextMenu(screen.getByText("作業1"));
      await user.click(screen.getByRole("menuitem", { name: "Drop" }));
      expect(screen.getByText("子 0 / 1")).toBeInTheDocument();
    });

    it("削除メニューで親を削除すると子アイテムのカードも消える", async () => {
      const user = userEvent.setup();
      const parentId = useBoardStore
        .getState()
        .addParent({ summary: "設計する" });
      useBoardStore.getState().addChild({ parentId, description: "作業1" });
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("設計する"));
      await user.click(screen.getByRole("menuitem", { name: "削除" }));
      expect(screen.queryByText("設計する")).not.toBeInTheDocument();
      expect(screen.queryByText("作業1")).not.toBeInTheDocument();
    });

    it("Drop先レーンがWIP制限に達している場合はDropメニューが無効になる", () => {
      const { settings } = useBoardStore.getState();
      useBoardStore.getState().updateSettings({
        projectName: settings.projectName,
        lanes: settings.lanes.map((lane) =>
          lane.role === "drop" ? { ...lane, wipLimit: 1 } : lane,
        ),
      });
      useBoardStore.getState().addChild({ description: "A" });
      useBoardStore.getState().addChild({ description: "B" });
      useBoardStore.getState().moveItem("C-1", "lane-5");
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("B"));
      expect(screen.getByRole("menuitem", { name: "Drop" })).toBeDisabled();
    });

    it("メニューの外側をクリック/右クリックするとメニューが閉じる", async () => {
      const user = userEvent.setup();
      useBoardStore.getState().addParent({ summary: "設計する" });
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("設計する"));
      await user.click(screen.getByLabelText("メニューを閉じる"));
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      fireEvent.contextMenu(screen.getByText("設計する"));
      fireEvent.contextMenu(screen.getByLabelText("メニューを閉じる"));
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("カードはドラッグ可能である（ドラッグ属性を持つ）", () => {
    useBoardStore.getState().addParent({ summary: "設計する" });
    render(<BoardView />);
    const pblLane = screen.getByRole("region", { name: "PBL" });
    const card = within(pblLane).getByRole("article");
    expect(card.closest("[aria-roledescription='sortable']")).not.toBeNull();
  });

  it("ドラッグ中はオーバーレイに複製が表示され、元のカードはプレースホルダになる", async () => {
    const user = userEvent.setup();
    const parentId = useBoardStore
      .getState()
      .addParent({ summary: "設計する" });
    useBoardStore.getState().addChild({ parentId, description: "作業" });
    const { container } = render(<BoardView />);
    const sortable = container.querySelector<HTMLElement>(
      "[aria-roledescription='sortable']",
    )!;
    sortable.focus();
    await user.keyboard(" ");
    expect(screen.getAllByText("設計する")).toHaveLength(2);
    expect(sortable.className).toContain("dragging");
    await user.keyboard("{Escape}");
    expect(screen.getAllByText("設計する")).toHaveLength(1);
  });

  it("キーボード操作でドラッグを完了するとオーバーレイが消える", async () => {
    const user = userEvent.setup();
    useBoardStore.getState().addChild({ description: "図を描く" });
    const { container } = render(<BoardView />);
    const sortable = container.querySelector<HTMLElement>(
      "[aria-roledescription='sortable']",
    )!;
    sortable.focus();
    await user.keyboard(" ");
    expect(screen.getAllByText("図を描く")).toHaveLength(2);
    await user.keyboard(" ");
    expect(screen.getAllByText("図を描く")).toHaveLength(1);
  });
});
