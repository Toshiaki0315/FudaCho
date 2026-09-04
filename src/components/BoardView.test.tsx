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

  describe("新規作成（保存するまでボードに載せない）", () => {
    const clickNew = (user: ReturnType<typeof userEvent.setup>, lane: string) =>
      user.click(
        within(screen.getByRole("region", { name: lane })).getByRole("button", {
          name: "＋新規作成",
        }),
      );

    it("PBLの「＋新規作成」では詳細ダイアログだけが開き、まだ作成されない", async () => {
      const user = userEvent.setup();
      render(<BoardView />);
      await clickNew(user, "PBL");
      expect(
        screen.getByRole("dialog", { name: "新規親アイテムの詳細" }),
      ).toBeInTheDocument();
      expect(useBoardStore.getState().parents).toEqual({});
    });

    it("保存すると入力内容で親アイテムがPBLに作成される", async () => {
      const user = userEvent.setup();
      render(<BoardView />);
      await clickNew(user, "PBL");
      await user.type(screen.getByLabelText("概要"), "設計する");
      await user.type(screen.getByLabelText("タイトル"), "画面設計");
      await user.click(screen.getByRole("button", { name: "保存" }));
      const parent = useBoardStore.getState().parents["P-1"];
      expect(parent.summary).toBe("設計する");
      expect(parent.title).toBe("画面設計");
      expect(parent.laneId).toBe("lane-1");
      const pblLane = screen.getByRole("region", { name: "PBL" });
      expect(within(pblLane).getByText("画面設計")).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("キャンセルすると親アイテムは作成されない", async () => {
      const user = userEvent.setup();
      render(<BoardView />);
      await clickNew(user, "PBL");
      await user.type(screen.getByLabelText("概要"), "設計する");
      await user.click(screen.getByRole("button", { name: "キャンセル" }));
      expect(useBoardStore.getState().parents).toEqual({});
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("SBLの「＋新規作成」は保存で親なしの子アイテムを作成する", async () => {
      const user = userEvent.setup();
      render(<BoardView />);
      await clickNew(user, "SBL");
      expect(
        screen.getByRole("dialog", { name: "新規子アイテムの詳細" }),
      ).toBeInTheDocument();
      expect(useBoardStore.getState().children).toEqual({});
      await user.type(screen.getByLabelText("作業内容"), "調査する");
      await user.click(screen.getByRole("button", { name: "保存" }));
      const child = useBoardStore.getState().children["C-1"];
      expect(child.description).toBe("調査する");
      expect(child.parentId).toBeNull();
      expect(child.laneId).toBe("lane-2");
    });

    it("SBLの新規作成をキャンセルすると子アイテムは作成されない", async () => {
      const user = userEvent.setup();
      render(<BoardView />);
      await clickNew(user, "SBL");
      await user.click(screen.getByRole("button", { name: "キャンセル" }));
      expect(useBoardStore.getState().children).toEqual({});
    });

    it("親詳細の「＋子アイテムを追加」も保存するまで作成しない", async () => {
      const user = userEvent.setup();
      useBoardStore
        .getState()
        .addParent({ summary: "設計する", reason: "理由", ready: true });
      render(<BoardView />);
      await user.dblClick(screen.getByText("設計する"));
      await user.click(
        screen.getByRole("button", { name: "＋子アイテムを追加" }),
      );
      expect(
        screen.getByRole("dialog", { name: "新規子アイテムの詳細" }),
      ).toBeInTheDocument();
      expect(useBoardStore.getState().children).toEqual({});
      await user.type(screen.getByLabelText("作業内容"), "図を描く");
      await user.click(screen.getByRole("button", { name: "保存" }));
      const child = useBoardStore.getState().children["C-1"];
      expect(child.parentId).toBe("P-1");
      expect(child.description).toBe("図を描く");
      expect(child.laneId).toBe("lane-2");
      expect(useBoardStore.getState().parents["P-1"].childIds).toEqual(["C-1"]);
      const sblLane = screen.getByRole("region", { name: "SBL" });
      expect(within(sblLane).getByText("C-1")).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
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
      "親アイテムはPBL・Close・Dropレーンへのみ移動できます",
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

  it("親を持つ子の詳細ビューには親のタイトルと引き継いだラベルが表示される", async () => {
    const user = userEvent.setup();
    const parentId = useBoardStore.getState().addParent({
      title: "画面設計",
      summary: "設計する",
      labels: ["設計"],
    });
    useBoardStore.getState().addChild({ parentId, description: "図を描く" });
    render(<BoardView />);
    await user.dblClick(screen.getByText("図を描く"));
    const inherited = screen.getByRole("list", {
      name: "親から引き継いだラベル",
    });
    expect(within(inherited).getByText("設計")).toBeInTheDocument();
    // カードにも親名が出るため、詳細ダイアログ内に限定して確認する
    const detail = screen.getByRole("dialog", { name: "C-1 の詳細" });
    expect(within(detail).getByText("親: 画面設計")).toBeInTheDocument();
  });

  it("親にタイトルがない場合、子詳細の「親:」には親IDが表示される", async () => {
    const user = userEvent.setup();
    const parentId = useBoardStore
      .getState()
      .addParent({ summary: "設計する" });
    useBoardStore.getState().addChild({ parentId, description: "図を描く" });
    render(<BoardView />);
    await user.dblClick(screen.getByText("図を描く"));
    const detail = screen.getByRole("dialog", { name: "C-1 の詳細" });
    expect(within(detail).getByText("親: P-1")).toBeInTheDocument();
  });

  it("親詳細の子アイテム一覧から子の詳細を開ける", async () => {
    const user = userEvent.setup();
    // 子をSBLの外へ動かすには親がReadyである必要がある
    const parentId = useBoardStore
      .getState()
      .addParent({ summary: "設計する", reason: "理由", ready: true });
    useBoardStore.getState().addChild({ parentId, description: "図を描く" });
    useBoardStore.getState().moveItem("C-1", "lane-3");
    render(<BoardView />);
    await user.dblClick(screen.getByText("設計する"));
    const list = screen.getByRole("list", { name: "子アイテム" });
    const row = within(list).getByRole("button");
    expect(row).toHaveTextContent("図を描く");
    expect(row).toHaveTextContent("作業中");
    await user.click(row);
    expect(
      screen.getByRole("dialog", { name: "C-1 の詳細" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "P-1 の詳細" }),
    ).not.toBeInTheDocument();
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

  describe("親アイテムによる絞り込み", () => {
    function seedTwoFamilies() {
      const p1 = useBoardStore
        .getState()
        .addParent({ title: "画面設計", summary: "設計する" });
      useBoardStore
        .getState()
        .addChild({ parentId: p1, description: "図を描く" });
      const p2 = useBoardStore.getState().addParent({ summary: "実装する" });
      useBoardStore
        .getState()
        .addChild({ parentId: p2, description: "コードを書く" });
      useBoardStore.getState().addChild({ description: "独立タスク" });
      return { p1, p2 };
    }

    it("親カードの右クリックメニューから絞り込むと、その親と子だけが表示される", async () => {
      const user = userEvent.setup();
      seedTwoFamilies();
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("設計する"));
      await user.click(
        screen.getByRole("menuitem", { name: "この親で絞り込み" }),
      );
      expect(screen.getByText("設計する")).toBeInTheDocument();
      expect(screen.getByText("図を描く")).toBeInTheDocument();
      expect(screen.queryByText("実装する")).not.toBeInTheDocument();
      expect(screen.queryByText("コードを書く")).not.toBeInTheDocument();
      expect(screen.queryByText("独立タスク")).not.toBeInTheDocument();
    });

    it("Readyな親の右クリックメニューから子アイテムを作成できる", async () => {
      const user = userEvent.setup();
      useBoardStore
        .getState()
        .addParent({ summary: "設計する", reason: "理由", ready: true });
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("設計する"));
      await user.click(
        screen.getByRole("menuitem", { name: "＋子アイテムを追加" }),
      );
      // メニューは閉じ、詳細ダイアログが開く（この時点ではまだ作成しない）
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(useBoardStore.getState().children).toEqual({});
      await user.click(screen.getByRole("button", { name: "保存" }));
      const state = useBoardStore.getState();
      expect(state.children["C-1"].parentId).toBe("P-1");
      // 作成先はSBLレーン
      expect(state.children["C-1"].laneId).toBe("lane-2");
      expect(state.parents["P-1"].childIds).toEqual(["C-1"]);
    });

    it("Readyでない親の右クリックメニューでは子アイテムを追加できない", () => {
      useBoardStore.getState().addParent({ summary: "設計する" });
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("設計する"));
      expect(
        screen.getByRole("menuitem", { name: "＋子アイテムを追加" }),
      ).toBeDisabled();
    });

    it("子カードの右クリックメニューには子アイテムの追加は表示されない", () => {
      seedTwoFamilies();
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("独立タスク"));
      expect(
        screen.queryByRole("menuitem", { name: "＋子アイテムを追加" }),
      ).not.toBeInTheDocument();
    });

    it("子カードの右クリックメニューには親絞り込みは表示されない", () => {
      seedTwoFamilies();
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("独立タスク"));
      expect(
        screen.queryByRole("menuitem", { name: "この親で絞り込み" }),
      ).not.toBeInTheDocument();
    });

    it("フィルターバーに親のタイトルが表示され、✕チップで解除できる", async () => {
      const user = userEvent.setup();
      seedTwoFamilies();
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("設計する"));
      await user.click(
        screen.getByRole("menuitem", { name: "この親で絞り込み" }),
      );
      const chip = screen.getByRole("button", {
        name: "親アイテム「画面設計」の絞り込みを解除",
      });
      expect(chip).toHaveTextContent("画面設計");
      await user.click(chip);
      expect(screen.getByText("実装する")).toBeInTheDocument();
      expect(screen.getByText("独立タスク")).toBeInTheDocument();
      expect(screen.queryByText(/絞り込み中/)).not.toBeInTheDocument();
    });

    it("タイトルのない親はIDでフィルターバーに表示される", async () => {
      const user = userEvent.setup();
      seedTwoFamilies();
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("実装する"));
      await user.click(
        screen.getByRole("menuitem", { name: "この親で絞り込み" }),
      );
      expect(
        screen.getByRole("button", {
          name: "親アイテム「P-2」の絞り込みを解除",
        }),
      ).toBeInTheDocument();
    });

    it("絞り込み中の親の右クリックメニューは「絞り込みを解除」になりトグルできる", async () => {
      const user = userEvent.setup();
      seedTwoFamilies();
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("設計する"));
      await user.click(
        screen.getByRole("menuitem", { name: "この親で絞り込み" }),
      );
      fireEvent.contextMenu(screen.getByText("設計する"));
      await user.click(
        screen.getByRole("menuitem", { name: "絞り込みを解除" }),
      );
      expect(screen.getByText("実装する")).toBeInTheDocument();
    });

    it("すべて解除でラベルと親の絞り込みが同時に解除される", async () => {
      const user = userEvent.setup();
      const { p1 } = seedTwoFamilies();
      useBoardStore.getState().updateParent(p1, { labels: ["設計"] });
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("設計する"));
      await user.click(
        screen.getByRole("menuitem", { name: "この親で絞り込み" }),
      );
      await user.click(screen.getAllByText("設計")[0]);
      await user.click(screen.getByRole("button", { name: "すべて解除" }));
      expect(screen.queryByText(/絞り込み中/)).not.toBeInTheDocument();
      expect(screen.getByText("独立タスク")).toBeInTheDocument();
    });

    it("ラベル絞り込みとAND条件で併用される", async () => {
      const user = userEvent.setup();
      const { p1, p2 } = seedTwoFamilies();
      useBoardStore.getState().updateParent(p1, { labels: ["設計"] });
      useBoardStore.getState().updateParent(p2, { labels: ["設計"] });
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("設計する"));
      await user.click(
        screen.getByRole("menuitem", { name: "この親で絞り込み" }),
      );
      // ラベル「設計」はP-2にも付いているが、親絞り込みとのANDでP-1系のみ残る
      await user.click(screen.getAllByText("設計")[0]);
      expect(screen.getByText("設計する")).toBeInTheDocument();
      expect(screen.getByText("図を描く")).toBeInTheDocument();
      expect(screen.queryByText("実装する")).not.toBeInTheDocument();
    });

    it("絞り込み中の親を削除すると絞り込みは無効になり全アイテムが表示される", async () => {
      const user = userEvent.setup();
      seedTwoFamilies();
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("設計する"));
      await user.click(
        screen.getByRole("menuitem", { name: "この親で絞り込み" }),
      );
      fireEvent.contextMenu(screen.getByText("設計する"));
      await user.click(screen.getByRole("menuitem", { name: "削除" }));
      expect(screen.getByText("実装する")).toBeInTheDocument();
      expect(screen.getByText("独立タスク")).toBeInTheDocument();
    });
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
    it("PBL/SBLのアイテムは詳細表示・子追加・絞り込み・Drop・削除のメニューが表示される", () => {
      useBoardStore.getState().addParent({ summary: "設計する" });
      render(<BoardView />);
      fireEvent.contextMenu(screen.getByText("設計する"));
      const items = screen.getAllByRole("menuitem");
      expect(items.map((i) => i.textContent)).toEqual([
        "詳細表示",
        "＋子アイテムを追加",
        "この親で絞り込み",
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
