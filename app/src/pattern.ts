// ============================================================================
// パターン評価器(記法仕様書 §4 意味論)
// query(layers, cycleIndex, rng) -> Ev[]。純粋関数(参照透過)。
// ============================================================================

import type { Node, Ev, Rng } from './types';
import { euclidBits } from './euclid';

/**
 * 全レイヤーを cycle 番号で評価してイベント列を返す。
 * 各レイヤーはサイクル [0,1) を占め、複数レイヤーは並列(和集合)。
 * イベントは各シーケンス内で左→右の順に生成される(? の乱数消費順を安定させるため)。
 */
export function query(layers: Node[], cycle: number, rng: Rng): Ev[] {
  const out: Ev[] = [];
  for (const layer of layers) evalNode(layer, cycle, rng, 0, 1, out);
  return out;
}

function evalNode(
  node: Node,
  cycle: number,
  rng: Rng,
  start: number,
  span: number,
  out: Ev[],
): void {
  switch (node.type) {
    case 'rest':
      return;

    case 'sound':
      out.push({ pos: start, dur: span, tok: node.name });
      return;

    case 'seq': {
      let total = 0;
      for (const w of node.weights) total += w;
      if (total <= 0) return;
      let cursor = start;
      for (let i = 0; i < node.children.length; i++) {
        const childSpan = (span * node.weights[i]) / total;
        evalNode(node.children[i], cycle, rng, cursor, childSpan, out);
        cursor += childSpan;
      }
      return;
    }

    case 'stack':
      for (const child of node.children) evalNode(child, cycle, rng, start, span, out);
      return;

    case 'alt': {
      const len = node.children.length;
      if (len === 0) return;
      const idx = ((cycle % len) + len) % len;
      evalNode(node.children[idx], cycle, rng, start, span, out);
      return;
    }

    case 'fast': {
      const step = span / node.n;
      for (let i = 0; i < node.n; i++) {
        evalNode(node.child, cycle, rng, start + i * step, step, out);
      }
      return;
    }

    case 'slow': {
      if (((cycle % node.n) + node.n) % node.n === 0) {
        evalNode(node.child, cycle, rng, start, span, out);
      }
      return;
    }

    case 'prob': {
      const tmp: Ev[] = [];
      evalNode(node.child, cycle, rng, start, span, tmp);
      // イベントごと・サイクルごとに独立試行(記法仕様書 §4/§6)。
      // 生成順(左→右)に rng を消費する。
      for (const ev of tmp) {
        if (rng() < node.p) out.push(ev);
      }
      return;
    }

    case 'euclid': {
      const bits = euclidBits(node.k, node.n, node.r);
      const step = span / node.n;
      for (let i = 0; i < node.n; i++) {
        if (bits[i]) evalNode(node.child, cycle, rng, start + i * step, step, out);
      }
      return;
    }
  }
}
