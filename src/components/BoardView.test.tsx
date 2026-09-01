import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBoardStore } from "../store/boardStore";
import { BoardView } from "./BoardView";

// デフォルトレーン: lane-1=未着手, lane-2=作業中, lane-3=完了, lane-4=クローズ, lane-5=中断

describe("BoardView", () => {
  beforeEach(() => {
    useBoardStore.getState().reset();
  });

  function enableDropOn(laneId: string) {
    const { settings } = useBoardStore.getState();
    useBoardStore.getState().updateSettings({
      projectName: settings.projectName,
      lanes: settings.lanes.map((lane) =>
        lane.id === laneId ? { ...lane, hasDropAction: true } : lane,
      ),
    });
  }

  it("ストアの親アイテムを対応するレーンに表示する", () => {
    const store = useBoardStore.getState();
    store.addParent({ summary: "設計する" });
    useBoardStore.getState().addParent({ summary: "実装する" });
    useBoardStore.getState().moveItem("P-2", "lane-2");
    render(<BoardView />);
    const todoLane = screen.getByRole("region", { name: "未着手" });
    expect(within(todoLane).getByText("設計する")).toBeInTheDocument();
    const inProgressLane = screen.getByRole("region", { name: "作業中" });
    expect(within(inProgressLane).getByText("実装する")).toBeInTheDocument();
  });

  it("子アイテムも対応するレーンに表示する", () => {
    const store = useBoardStore.getState();
    const parentId = store.addParent({ summary: "設計する" });
    useBoardStore.getState().addChild({ parentId, description: "図を描く" });
    render(<BoardView />);
    const todoLane = screen.getByRole("region", { name: "未着手" });
    expect(within(todoLane).getByText("図を描く")).toBeInTheDocument();
  });

  it("レーン内の優先順位どおりの順序でカードを表示する", () => {
    const store = useBoardStore.getState();
    store.addParent({ summary: "A" });
    useBoardStore.getState().addParent({ summary: "B" });
    useBoardStore.getState().reorderLane("lane-1", 1, 0);
    render(<BoardView />);
    const todoLane = screen.getByRole("region", { name: "未着手" });
    const cards = within(todoLane).getAllByRole("article");
    expect(cards[0]).toHaveTextContent("B");
    expect(cards[1]).toHaveTextContent("A");
  });

  it("「＋新規作成」で親アイテムが追加される", async () => {
    const user = userEvent.setup();
    render(<BoardView />);
    await user.click(screen.getByRole("button", { name: "＋新規作成" }));
    const todoLane = screen.getByRole("region", { name: "未着手" });
    expect(within(todoLane).getByText("P-1")).toBeInTheDocument();
  });

  it("Drop操作を有効にしたレーンのカードにDropボタンが表示される", () => {
    enableDropOn("lane-2");
    useBoardStore.getState().addParent({ summary: "設計する" });
    useBoardStore.getState().moveItem("P-1", "lane-2");
    render(<BoardView />);
    const inProgressLane = screen.getByRole("region", { name: "作業中" });
    expect(
      within(inProgressLane).getByRole("button", { name: "Drop" }),
    ).toBeInTheDocument();
  });

  it("デフォルトではどのレーンにもDropボタンが表示されない", () => {
    useBoardStore.getState().addParent({ summary: "設計する" });
    useBoardStore.getState().addParent({ summary: "実装する" });
    useBoardStore.getState().moveItem("P-2", "lane-2");
    render(<BoardView />);
    expect(
      screen.queryByRole("button", { name: "Drop" }),
    ).not.toBeInTheDocument();
  });

  it("Dropボタンで作業中のアイテムが中断レーンに移動しデータは保持される", async () => {
    const user = userEvent.setup();
    enableDropOn("lane-2");
    useBoardStore.getState().addParent({ summary: "設計する" });
    useBoardStore.getState().moveItem("P-1", "lane-2");
    render(<BoardView />);
    await user.click(screen.getByRole("button", { name: "Drop" }));
    expect(useBoardStore.getState().parents["P-1"].laneId).toBe("lane-5");
    const droppedLane = screen.getByRole("region", { name: "中断" });
    expect(within(droppedLane).getByText("設計する")).toBeInTheDocument();
  });

  it("Drop先レーンがWIP制限に達している場合はDropボタンが無効になる", () => {
    const { settings } = useBoardStore.getState();
    useBoardStore.getState().updateSettings({
      projectName: settings.projectName,
      lanes: settings.lanes.map((lane) => {
        if (lane.id === "lane-5") {
          return { ...lane, wipLimit: 1 };
        }
        return lane.id === "lane-2" ? { ...lane, hasDropAction: true } : lane;
      }),
    });
    useBoardStore.getState().addParent({ summary: "A" });
    useBoardStore.getState().addParent({ summary: "B" });
    useBoardStore.getState().moveItem("P-1", "lane-5");
    useBoardStore.getState().moveItem("P-2", "lane-2");
    render(<BoardView />);
    expect(screen.getByRole("button", { name: "Drop" })).toBeDisabled();
  });

  it("WIP制限で移動できない場合は通知が表示され、閉じるボタンで消せる", async () => {
    const user = userEvent.setup();
    const { settings } = useBoardStore.getState();
    useBoardStore.getState().updateSettings({
      projectName: settings.projectName,
      lanes: settings.lanes.map((lane) =>
        lane.id === "lane-2" ? { ...lane, wipLimit: 1 } : lane,
      ),
    });
    useBoardStore.getState().addParent({ summary: "A" });
    useBoardStore.getState().addParent({ summary: "B" });
    useBoardStore.getState().moveItem("P-1", "lane-2");
    render(<BoardView />);
    useBoardStore.getState().handleDragEnd("P-2", "lane-2");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "レーン「作業中」はWIP制限（1）に達しているため移動できません",
    );
    await user.click(within(alert).getByRole("button", { name: "閉じる" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("通知は数秒後に自動で消える", async () => {
    vi.useFakeTimers();
    try {
      const { settings } = useBoardStore.getState();
      useBoardStore.getState().updateSettings({
        projectName: settings.projectName,
        lanes: settings.lanes.map((lane) =>
          lane.id === "lane-2" ? { ...lane, wipLimit: 1 } : lane,
        ),
      });
      useBoardStore.getState().addParent({ summary: "A" });
      useBoardStore.getState().addParent({ summary: "B" });
      useBoardStore.getState().moveItem("P-1", "lane-2");
      render(<BoardView />);
      act(() => {
        useBoardStore.getState().handleDragEnd("P-2", "lane-2");
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
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("未着手")).toBeInTheDocument();
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
    expect(useBoardStore.getState().parents["P-1"].summary).toBe(
      "詳細設計する",
    );
  });

  it("子カードをダブルクリックすると子詳細ビューが開き、保存で反映される", async () => {
    const user = userEvent.setup();
    const parentId = useBoardStore.getState().addParent({ summary: "設計" });
    useBoardStore.getState().addChild({ parentId, description: "図を描く" });
    render(<BoardView />);
    await user.dblClick(screen.getByText("図を描く"));
    expect(
      screen.getByRole("dialog", { name: "C-1 の詳細" }),
    ).toBeInTheDocument();
    const description = screen.getByLabelText("作業内容");
    await user.clear(description);
    await user.type(description, "詳細図を描く");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("詳細図を描く")).toBeInTheDocument();
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
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(useBoardStore.getState().parents["P-1"].summary).toBe("設計する");
  });

  it("親詳細ビューから子アイテムを追加できる", async () => {
    const user = userEvent.setup();
    useBoardStore.getState().addParent({ summary: "設計する" });
    render(<BoardView />);
    await user.dblClick(screen.getByText("設計する"));
    await user.click(
      screen.getByRole("button", { name: "＋子アイテムを追加" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const state = useBoardStore.getState();
    expect(state.parents["P-1"].childIds).toEqual(["C-1"]);
    const todoLane = screen.getByRole("region", { name: "未着手" });
    expect(within(todoLane).getByText("C-1")).toBeInTheDocument();
  });

  describe("ラベルと絞り込み", () => {
    function seedLabeledBoard() {
      const store = useBoardStore.getState();
      const p1 = store.addParent({ summary: "設計タスク", labels: ["設計"] });
      useBoardStore
        .getState()
        .addChild({ parentId: p1, description: "図を描く" });
      useBoardStore.getState().addParent({ summary: "別のタスク" });
      useBoardStore.getState().addChild({
        parentId: "P-2",
        description: "独自ラベル作業",
        labels: ["フロント"],
      });
    }

    it("カードにラベルが表示され、子は親のラベルを引き継いで表示する", () => {
      seedLabeledBoard();
      render(<BoardView />);
      const todoLane = screen.getByRole("region", { name: "未着手" });
      // 親カードのラベル + 子カードに引き継がれたラベル
      expect(
        within(todoLane).getAllByRole("button", { name: "設計" }),
      ).toHaveLength(2);
      expect(
        within(todoLane).getByRole("button", { name: "フロント" }),
      ).toBeInTheDocument();
    });

    it("ラベルをクリックすると絞り込まれ、絞り込みバーが表示される", async () => {
      const user = userEvent.setup();
      seedLabeledBoard();
      render(<BoardView />);
      await user.click(screen.getAllByRole("button", { name: "設計" })[0]);
      expect(screen.getByText(/ラベルで絞り込み中/)).toBeInTheDocument();
      // 設計ラベルを持つ親とその子だけが表示される
      expect(screen.getByText("設計タスク")).toBeInTheDocument();
      expect(screen.getByText("図を描く")).toBeInTheDocument();
      expect(screen.queryByText("別のタスク")).not.toBeInTheDocument();
      expect(screen.queryByText("独自ラベル作業")).not.toBeInTheDocument();
    });

    it("子の独自ラベルでも絞り込める（親は対象外）", async () => {
      const user = userEvent.setup();
      seedLabeledBoard();
      render(<BoardView />);
      await user.click(screen.getByRole("button", { name: "フロント" }));
      expect(screen.getByText("独自ラベル作業")).toBeInTheDocument();
      expect(screen.queryByText("別のタスク")).not.toBeInTheDocument();
      expect(screen.queryByText("設計タスク")).not.toBeInTheDocument();
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
      const board = screen.getByRole("region", { name: "未着手" });
      const visible = () =>
        within(board)
          .queryAllByRole("article")
          .map((c) => c.textContent);

      // Aで絞り込み → 1と4が残る
      await user.click(within(board).getAllByRole("button", { name: "A" })[0]);
      expect(visible().join()).toContain("アイテム1");
      expect(visible().join()).toContain("アイテム4");
      expect(visible()).toHaveLength(2);

      // さらにBで絞り込み（AND） → 1だけになる
      await user.click(within(board).getAllByRole("button", { name: "B" })[0]);
      expect(visible()).toHaveLength(1);
      expect(visible().join()).toContain("アイテム1");

      // Bを解除（カード上のチップを再クリック） → Aの絞り込みは有効なまま1と4
      await user.click(within(board).getAllByRole("button", { name: "B" })[0]);
      expect(visible()).toHaveLength(2);

      // Aを解除 → 全部表示
      await user.click(within(board).getAllByRole("button", { name: "A" })[0]);
      expect(visible()).toHaveLength(4);
      expect(screen.queryByText(/絞り込み中/)).not.toBeInTheDocument();
    });

    it("絞り込みバーのラベルチップをクリックしてもそのラベルだけ解除できる", async () => {
      const user = userEvent.setup();
      useBoardStore
        .getState()
        .addParent({ summary: "アイテム1", labels: ["A", "B"] });
      useBoardStore
        .getState()
        .addParent({ summary: "アイテム4", labels: ["A"] });
      render(<BoardView />);
      const board = screen.getByRole("region", { name: "未着手" });
      await user.click(within(board).getAllByRole("button", { name: "A" })[0]);
      await user.click(within(board).getByRole("button", { name: "B" }));
      const bar = screen.getByText(/ラベルで絞り込み中/).parentElement!;
      await user.click(
        within(bar).getByRole("button", {
          name: "ラベル「B」の絞り込みを解除",
        }),
      );
      expect(within(board).queryAllByRole("article")).toHaveLength(2);
      expect(screen.getByText(/ラベルで絞り込み中/)).toBeInTheDocument();
    });

    it("「すべて解除」で絞り込みが解除され全アイテムが表示される", async () => {
      const user = userEvent.setup();
      seedLabeledBoard();
      render(<BoardView />);
      await user.click(screen.getAllByRole("button", { name: "設計" })[0]);
      await user.click(screen.getByRole("button", { name: "すべて解除" }));
      expect(screen.queryByText(/絞り込み中/)).not.toBeInTheDocument();
      expect(screen.getByText("別のタスク")).toBeInTheDocument();
      expect(screen.getByText("独自ラベル作業")).toBeInTheDocument();
    });
  });

  describe("右クリックメニュー", () => {
    it("カードを右クリックするとDropメニューが表示され、Dropで中断レーンへ移動する", async () => {
      const user = userEvent.setup();
      const parentId = useBoardStore
        .getState()
        .addParent({ summary: "設計する" });
      useBoardStore.getState().addChild({ parentId, description: "作業1" });
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("設計する"));
      const menu = screen.getByRole("menu");
      await user.click(within(menu).getByRole("menuitem", { name: "Drop" }));
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      const state = useBoardStore.getState();
      // 親をDropすると子もすべてDropされる
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
      expect(useBoardStore.getState().children["C-1"].laneId).toBe("lane-5");
    });

    it("メニューの外側をクリックするとメニューが閉じる", async () => {
      const user = userEvent.setup();
      useBoardStore.getState().addParent({ summary: "設計する" });
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("設計する"));
      expect(screen.getByRole("menu")).toBeInTheDocument();
      await user.click(screen.getByLabelText("メニューを閉じる"));
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("Dropの下に削除メニューがあり、子アイテムを完全削除できる", async () => {
      const user = userEvent.setup();
      const parentId = useBoardStore
        .getState()
        .addParent({ summary: "設計する" });
      useBoardStore.getState().addChild({ parentId, description: "作業1" });
      useBoardStore.getState().addChild({ parentId, description: "作業2" });
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("作業1"));
      const items = screen.getAllByRole("menuitem");
      expect(items.map((i) => i.textContent)).toEqual(["Drop", "削除"]);
      await user.click(screen.getByRole("menuitem", { name: "削除" }));
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(screen.queryByText("作業1")).not.toBeInTheDocument();
      expect(useBoardStore.getState().children["C-1"]).toBeUndefined();
      // 親カードの子カウントも更新される
      expect(screen.getByText("子 0 / 1")).toBeInTheDocument();
    });

    it("親アイテムを削除すると子アイテムのカードも消える", async () => {
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

    it("メニューの外側を右クリックしてもメニューが閉じる", () => {
      useBoardStore.getState().addParent({ summary: "設計する" });
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("設計する"));
      fireEvent.contextMenu(screen.getByLabelText("メニューを閉じる"));
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("Drop済みのアイテムではDropメニューが無効になる", () => {
      useBoardStore.getState().addParent({ summary: "設計する" });
      useBoardStore.getState().dropItem("P-1");
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("設計する"));
      expect(screen.getByRole("menuitem", { name: "Drop" })).toBeDisabled();
    });
  });

  it("カードはドラッグ可能である（ドラッグ属性を持つ）", () => {
    useBoardStore.getState().addParent({ summary: "設計する" });
    render(<BoardView />);
    const todoLane = screen.getByRole("region", { name: "未着手" });
    const card = within(todoLane).getByRole("article");
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
    // オーバーレイの複製 + 元カード（プレースホルダ）の2枚が存在する
    expect(screen.getAllByText("設計する")).toHaveLength(2);
    expect(sortable.className).toContain("dragging");
    // Escapeでキャンセルすると1枚に戻る
    await user.keyboard("{Escape}");
    expect(screen.getAllByText("設計する")).toHaveLength(1);
    expect(sortable.className).not.toContain("dragging");
  });

  it("キーボード操作でドラッグを完了するとオーバーレイが消える", async () => {
    const user = userEvent.setup();
    const parentId = useBoardStore.getState().addParent({ summary: "設計" });
    useBoardStore.getState().addChild({ parentId, description: "図を描く" });
    const { container } = render(<BoardView />);
    const sortables = container.querySelectorAll<HTMLElement>(
      "[aria-roledescription='sortable']",
    );
    // 子アイテムのカードでドラッグ開始→そのままドロップ
    sortables[1].focus();
    await user.keyboard(" ");
    expect(screen.getAllByText("図を描く")).toHaveLength(2);
    await user.keyboard(" ");
    expect(screen.getAllByText("図を描く")).toHaveLength(1);
  });
});
