import { describe, expect, it } from "vitest";
import { displayName } from "./itemName";

describe("displayName", () => {
  it("タイトルが設定されていればタイトルを返す", () => {
    expect(displayName({ id: "P-1", title: "ログイン改善" })).toBe(
      "ログイン改善",
    );
  });

  it("タイトルが空ならIDを返す", () => {
    expect(displayName({ id: "P-1", title: "" })).toBe("P-1");
  });

  it("アイテムがnullなら「なし」を返す", () => {
    expect(displayName(null)).toBe("なし");
  });
});
