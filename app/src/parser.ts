// ============================================================================
// 記法パーサ(記法仕様書 §2 字句 / §3 文法 / §7 エラー)
// text -> AST。純粋関数。DOM / Tone.js 非依存で Node 上テスト可能。
// ============================================================================

import type { Node, ParseResult, ParseErr } from './types';

// ---- ドラム別名の正規化(記法仕様書 §2.1)----
const DRUM_ALIASES: Record<string, string> = {
  bd: 'bd',
  kick: 'bd',
  sd: 'sd',
  sn: 'sd',
  hh: 'hh',
  oh: 'oh',
  cp: 'cp',
  clap: 'cp',
  // ベース/シンセパッド/サンプラー(追補: STEPモードのベース・パッド・サンプラー)
  bs: 'bs',
  bass: 'bs',
  pd: 'pd',
  pad: 'pd',
  sm: 'sm',
  sample: 'sm',
  smp: 'sm',
};

// ドラムの正規名(音源トリガのために使う集合)
export const DRUM_NAMES = new Set(['bd', 'sd', 'hh', 'oh', 'cp', 'bs', 'pd', 'sm']);

// 音名(記法仕様書 §2.2)
export const NOTE_RE = /^[a-g](#|b)?[0-8]$/;

// 明確に未対応の文字(記法仕様書 §9 / エラー E-03)。'.' は ?0.3 と衝突するため
// ここには含めず、要素の先頭位置で個別検出する。
const HARD_UNSUPPORTED = /["'{}%:|`\\]/;

// トークンを構成しうる文字
const TOKEN_CHAR = /[a-z0-9#]/;

class ParseError extends Error {
  constructor(
    public code: string,
    public msg: string,
  ) {
    super(msg);
  }
}

// ---- 1行分の走査カーソル ----
class Cursor {
  i = 0;
  constructor(public s: string) {}
  peek(): string {
    return this.i < this.s.length ? this.s[this.i] : '';
  }
  at(offset: number): string {
    const j = this.i + offset;
    return j < this.s.length ? this.s[j] : '';
  }
  next(): string {
    return this.s[this.i++];
  }
  eof(): boolean {
    return this.i >= this.s.length;
  }
  skipSpace(): void {
    while (this.peek() === ' ') this.i++;
  }
}

/**
 * コメント除去(記法仕様書 §2)。
 * '#' は「行頭 or 空白直後」のときだけコメント開始とみなす。
 * これにより音名 g#2 の '#' はコメント扱いされない。
 * 全角スペース(U+3000)・タブは半角スペースに正規化する。
 */
function stripComment(rawLine: string): string {
  // 正規表現の文字クラスは タブ と 全角スペース(U+3000) を半角スペースへ正規化する
  const line = rawLine.replace(/\r/g, '').replace(/[\t　]/g, ' ');
  let prev = ' '; // 行頭は「空白直後」とみなす
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '#' && (prev === ' ' || i === 0)) {
      return line.slice(0, i);
    }
    prev = c;
  }
  return line;
}

// ---- 数値・確率の読み取り ----
function readInt(cur: Cursor, snippetPrefix: string): number {
  let digits = '';
  while (/[0-9]/.test(cur.peek())) digits += cur.next();
  if (digits === '') {
    // 未対応文字なら E-03、そうでなければ E-04(数値不正)
    const c = cur.peek();
    if (HARD_UNSUPPORTED.test(c) || c === '"' || c === "'") {
      throw new ParseError('E-03', `未対応の記法: "${c}"`);
    }
    throw new ParseError('E-04', `数値が不正です: "${snippetPrefix}${c}"`);
  }
  return parseInt(digits, 10);
}

function readProb(cur: Cursor): number {
  let s = '';
  while (/[0-9.]/.test(cur.peek())) s += cur.next();
  if (s === '') return 0.5; // 省略時 0.5
  const v = parseFloat(s);
  if (Number.isNaN(v)) throw new ParseError('E-04', `数値が不正です: "?${s}"`);
  return v;
}

// ---- atom(トークン / 休符 / グループ / 交替)----
interface Atom {
  node: Node;
  isSound: boolean;
}

function parseAtom(cur: Cursor): Atom {
  const c = cur.peek();
  if (c === '[') {
    cur.next();
    const node = parseStack(cur, ']');
    if (cur.peek() !== ']') throw new ParseError('E-01', '"[" が閉じられていません');
    cur.next();
    return { node, isSound: false };
  }
  if (c === '<') {
    cur.next();
    const seq = parseSequence(cur, '>');
    if (cur.peek() !== '>') throw new ParseError('E-01', '"<" が閉じられていません');
    cur.next();
    return { node: { type: 'alt', children: seq.children }, isSound: false };
  }
  if (c === '~') {
    cur.next();
    return { node: { type: 'rest' }, isSound: false };
  }
  if (c === ']' || c === '>' || c === ')') {
    throw new ParseError('E-01', `対応しない "${c}" があります`);
  }
  if (TOKEN_CHAR.test(c)) {
    let tok = '';
    while (TOKEN_CHAR.test(cur.peek())) tok += cur.next();
    // Strudel 関数API(例: s("...") )は '(' が続いた未知トークンとして検出
    const norm = DRUM_ALIASES[tok];
    if (norm) return { node: { type: 'sound', name: norm }, isSound: true };
    if (NOTE_RE.test(tok)) return { node: { type: 'sound', name: tok }, isSound: true };
    if (cur.peek() === '(') {
      throw new ParseError('E-03', `未対応の記法: "${tok}(" — 対応記法はヘルプ参照`);
    }
    throw new ParseError('E-02', `不明なトークン: "${tok}"`);
  }
  // '.' や '-' '+' 等
  throw new ParseError('E-03', `未対応の記法: "${c}" — 対応記法はヘルプ参照`);
}

// ---- 修飾子つき要素(記法仕様書 §3 modifier / §4 意味論)----
interface Element {
  node: Node;
  weight: number;
  replicate: number;
}

function parseElement(cur: Cursor): Element {
  const atom = parseAtom(cur);
  let node = atom.node;
  let weight = 1;
  let replicate = 1;
  let layoutSet = false; // ! または @ を見たら以後の修飾子は禁止
  const used = new Set<string>();

  for (;;) {
    const c = cur.peek();
    if (c !== '*' && c !== '/' && c !== '?' && c !== '(' && c !== '!' && c !== '@') break;
    if (layoutSet) {
      throw new ParseError('E-05', `修飾子の組合せが不正です: "${c}"`);
    }
    if (c === '*') {
      cur.next();
      if (used.has('*')) throw new ParseError('E-05', '修飾子 "*" が重複しています');
      const n = readInt(cur, '*');
      if (n < 1 || n > 64) throw new ParseError('E-04', `数値が不正です: "*${n}"`);
      used.add('*');
      node = { type: 'fast', n, child: node };
    } else if (c === '/') {
      cur.next();
      if (!atom.isSound)
        throw new ParseError('E-06', '"/n" は単一トークンにのみ使えます。<a b> を検討してください');
      if (used.has('/')) throw new ParseError('E-05', '修飾子 "/" が重複しています');
      const n = readInt(cur, '/');
      if (n < 2 || n > 16) throw new ParseError('E-04', `数値が不正です: "/${n}"`);
      used.add('/');
      node = { type: 'slow', n, child: node };
    } else if (c === '?') {
      cur.next();
      if (used.has('?')) throw new ParseError('E-05', '修飾子 "?" が重複しています');
      const p = readProb(cur);
      if (!(p > 0 && p <= 1)) throw new ParseError('E-04', `数値が不正です: "?${p}"`);
      used.add('?');
      node = { type: 'prob', p, child: node };
    } else if (c === '(') {
      if (used.has('(')) throw new ParseError('E-05', 'ユークリッド修飾子が重複しています');
      used.add('(');
      node = parseEuclid(cur, node);
    } else if (c === '!') {
      cur.next();
      const n = readInt(cur, '!');
      if (n < 2 || n > 16) throw new ParseError('E-04', `数値が不正です: "!${n}"`);
      replicate = n;
      layoutSet = true;
    } else {
      // '@'
      cur.next();
      const n = readInt(cur, '@');
      if (n < 1 || n > 16) throw new ParseError('E-04', `数値が不正です: "@${n}"`);
      weight = n;
      layoutSet = true;
    }
  }
  return { node, weight, replicate };
}

function parseEuclid(cur: Cursor, child: Node): Node {
  cur.next(); // '('
  const k = readInt(cur, '(');
  cur.skipSpace();
  if (cur.peek() !== ',') throw new ParseError('E-04', 'ユークリッド記法は (k,n[,r]) 形式です');
  cur.next();
  cur.skipSpace();
  const n = readInt(cur, '(,');
  let r = 0;
  cur.skipSpace();
  if (cur.peek() === ',') {
    cur.next();
    cur.skipSpace();
    r = readInt(cur, '(,,');
  }
  cur.skipSpace();
  if (cur.peek() !== ')') throw new ParseError('E-01', '"(" が閉じられていません');
  cur.next();
  if (!(k >= 1 && n >= 1 && k <= n && n <= 64 && r >= 0 && r < n)) {
    throw new ParseError('E-04', `数値が不正です: "(${k},${n},${r})"`);
  }
  return { type: 'euclid', k, n, r, child };
}

// ---- sequence / stack ----
function parseSequence(cur: Cursor, close: string): Node & { type: 'seq' } {
  const children: Node[] = [];
  const weights: number[] = [];
  for (;;) {
    cur.skipSpace();
    const c = cur.peek();
    if (c === '' || c === close || c === ',') break;
    const el = parseElement(cur);
    for (let r = 0; r < el.replicate; r++) {
      children.push(el.node);
      weights.push(el.weight);
    }
  }
  return { type: 'seq', children, weights };
}

function parseStack(cur: Cursor, close: string): Node {
  const seqs: Node[] = [parseSequence(cur, close)];
  while (cur.peek() === ',') {
    cur.next();
    seqs.push(parseSequence(cur, close));
  }
  return seqs.length === 1 ? seqs[0] : { type: 'stack', children: seqs };
}

function parseLine(line: string): Node {
  const cur = new Cursor(line);
  const node = parseStack(cur, '');
  cur.skipSpace();
  if (!cur.eof()) {
    // ここに来るのは対応しない閉じ括弧など
    const c = cur.peek();
    if (c === ']' || c === '>' || c === ')') {
      throw new ParseError('E-01', `対応しない "${c}" があります`);
    }
    throw new ParseError('E-03', `未対応の記法: "${c}" — 対応記法はヘルプ参照`);
  }
  return node;
}

/**
 * コード全文をパースする。1行 = 1レイヤー(記法仕様書 §2)。
 * 成功時は空でないレイヤー配列、失敗時は最初のエラー1件(行番号付き)。
 */
export function parse(code: string): ParseResult {
  const rawLines = code.split('\n');
  const layers: Node[] = [];
  for (let li = 0; li < rawLines.length; li++) {
    // 大文字小文字は区別しない(記法仕様書 §2): 小文字化してから解析
    const stripped = stripComment(rawLines[li]).toLowerCase().trim();
    if (HARD_UNSUPPORTED.test(stripped)) {
      const ch = stripped.match(HARD_UNSUPPORTED)![0];
      return err('E-03', li + 1, `未対応の記法(行${li + 1}): "${ch}" — 対応記法はヘルプ参照`);
    }
    if (stripped === '') continue; // 空行・コメントのみは無視
    try {
      layers.push(parseLine(stripped));
    } catch (e) {
      if (e instanceof ParseError) {
        return err(e.code, li + 1, withLine(e, li + 1));
      }
      throw e;
    }
  }
  return { ok: true, layers };
}

function withLine(e: ParseError, line: number): string {
  // コード別に読みやすい行番号付き文言へ整形(記法仕様書 §7)
  switch (e.code) {
    case 'E-01':
      return `記法エラー(行${line}): ${e.msg}`;
    case 'E-02':
      return `不明なトークン(行${line}): ${e.msg.replace(/^不明なトークン: /, '')}`;
    case 'E-03':
      return e.msg.includes('行')
        ? e.msg
        : `未対応の記法(行${line}): ${e.msg.replace(/^未対応の記法: /, '')}`;
    case 'E-04':
      return `数値が不正です(行${line}): ${e.msg.replace(/^数値が不正です: /, '')}`;
    case 'E-05':
      return `修飾子の組合せが不正です(行${line}): ${e.msg}`;
    case 'E-06':
      return `${e.msg}(行${line})`;
    default:
      return `記法エラー(行${line}): ${e.msg}`;
  }
}

function err(code: string, line: number, message: string): ParseResult {
  const error: ParseErr = { code, line, message };
  return { ok: false, error };
}

/** AST に発音(sound)ノードが1つでも含まれるか(FR-03 の空判定用)。 */
export function hasSound(node: Node): boolean {
  switch (node.type) {
    case 'sound':
      return true;
    case 'rest':
      return false;
    case 'seq':
    case 'stack':
    case 'alt':
      return node.children.some(hasSound);
    case 'fast':
    case 'slow':
    case 'prob':
    case 'euclid':
      return hasSound(node.child);
  }
}

export function layersHaveSound(layers: Node[]): boolean {
  return layers.some(hasSound);
}
