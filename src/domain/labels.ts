/**
 * ラベルのユーティリティ。
 * 子アイテムの実効ラベルは「親のラベル + 独自ラベル」を都度合成して求める
 * （親のラベル変更が自動的に子へ引き継がれる）。
 */

/** 親のラベルと独自ラベルを、親を先頭に重複なしで結合する。 */
export function mergeLabels(
  parentLabels: readonly string[],
  ownLabels: readonly string[],
): string[] {
  return [...new Set([...parentLabels, ...ownLabels])];
}

/** マークダウン入出力の区切り文字と衝突しない、妥当なラベル群か検証する。 */
export function validateLabels(labels: readonly string[]): void {
  for (const label of labels) {
    if (label.trim() === "") {
      throw new Error("ラベルは空にできません");
    }
    if (/[;,()（）]/.test(label)) {
      throw new Error(`ラベルに ; , ( ) は使えません: ${label}`);
    }
  }
  if (new Set(labels).size !== labels.length) {
    throw new Error("ラベルが重複しています");
  }
}
