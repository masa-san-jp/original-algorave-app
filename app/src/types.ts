// ============================================================================
// 記法AST・イベント・エラーの型定義
// 記法仕様書 §3(EBNF) / §4(意味論) / §7(エラー) に対応
// ============================================================================

/** パターンASTノード。1行(レイヤー)は1つの Node にパースされる。 */
export type Node =
  | { type: 'rest' }
  | { type: 'sound'; name: string }
  | { type: 'seq'; children: Node[]; weights: number[] }
  | { type: 'stack'; children: Node[] }
  | { type: 'alt'; children: Node[] }
  | { type: 'fast'; n: number; child: Node }
  | { type: 'slow'; n: number; child: Node }
  | { type: 'prob'; p: number; child: Node }
  | { type: 'euclid'; k: number; n: number; r: number; child: Node };

/** query() が返す発音1回分。pos/dur はサイクル内比率(0 <= pos < 1)。 */
export interface Ev {
  pos: number;
  dur: number;
  tok: string;
}

/** パースエラー(記法仕様書 §7)。code は E-01〜E-06、line は1始まり。 */
export interface ParseErr {
  code: string;
  line: number;
  message: string;
}

/** parse() の結果。成功時は layers(1行=1レイヤー)、失敗時は最初のエラー1件。 */
export type ParseResult = { ok: true; layers: Node[] } | { ok: false; error: ParseErr };

/** 乱数関数(0 <= x < 1)。テスト時に注入可能(記法仕様書 §6)。 */
export type Rng = () => number;
