import { describe, expect, it } from "vitest";
import { mergeLabels, validateLabels } from "./labels";

describe("mergeLabels", () => {
  it("親のラベルと独自ラベルを結合する（親が先）", () => {
    expect(mergeLabels(["設計", "急ぎ"], ["フロント"])).toEqual([
      "設計",
      "急ぎ",
      "フロント",
    ]);
  });

  it("重複するラベルは1つにまとめる", () => {
    expect(mergeLabels(["設計", "急ぎ"], ["急ぎ", "フロント"])).toEqual([
      "設計",
      "急ぎ",
      "フロント",
    ]);
  });

  it("どちらも空なら空配列を返す", () => {
    expect(mergeLabels([], [])).toEqual([]);
  });
});

describe("validateLabels", () => {
  it("通常のラベルは妥当である", () => {
    expect(() => validateLabels(["設計", "急ぎ"])).not.toThrow();
  });

  it("空のラベルはエラーになる", () => {
    expect(() => validateLabels([""])).toThrow(/ラベル/);
    expect(() => validateLabels(["  "])).toThrow(/ラベル/);
  });

  it("区切り文字（; , 括弧）を含むラベルはエラーになる", () => {
    expect(() => validateLabels(["a;b"])).toThrow(/ラベル/);
    expect(() => validateLabels(["a,b"])).toThrow(/ラベル/);
    expect(() => validateLabels(["a(b"])).toThrow(/ラベル/);
    expect(() => validateLabels(["a)b"])).toThrow(/ラベル/);
  });

  it("重複するラベルはエラーになる", () => {
    expect(() => validateLabels(["設計", "設計"])).toThrow(/重複/);
  });
});
