// ============================================================================
// ゴールデンテストベクタ(記法仕様書 §8)
// 全件パスが M1 の検収条件。テスト名に GV-ID を含める。
// ============================================================================

import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser';
import { query } from '../src/pattern';
import type { Ev, Rng } from '../src/types';

function run(input: string, cycle = 0, rng: Rng = () => 0.999): Ev[] {
  const r = parse(input);
  if (!r.ok) throw new Error(`parse failed (${r.error.code}): ${r.error.message}`);
  return query(r.layers, cycle, rng);
}

function sortEv(a: Ev[]): Ev[] {
  return [...a].sort((x, y) => x.pos - y.pos || x.tok.localeCompare(y.tok) || x.dur - y.dur);
}

function E(tok: string, pos: number, dur: number): Ev {
  return { tok, pos, dur };
}

function expectEv(actual: Ev[], expected: Ev[]): void {
  const A = sortEv(actual);
  const X = sortEv(expected);
  expect(A.length, `event count\n  got: ${JSON.stringify(A)}\n  exp: ${JSON.stringify(X)}`).toBe(
    X.length,
  );
  for (let i = 0; i < X.length; i++) {
    expect(A[i].tok).toBe(X[i].tok);
    expect(A[i].pos).toBeCloseTo(X[i].pos, 9);
    expect(A[i].dur).toBeCloseTo(X[i].dur, 9);
  }
}

// 与えた列を順に返す乱数(記法仕様書 §6, GV-24)
function seqRng(values: number[]): Rng {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('§8.1 基本(プロトタイプ互換)', () => {
  it('GV-01 bd ~ bd ~', () => {
    expectEv(run('bd ~ bd ~'), [E('bd', 0, 1 / 4), E('bd', 1 / 2, 1 / 4)]);
  });
  it('GV-02 ~ sn ~ sn (sn→sd 正規化)', () => {
    expectEv(run('~ sn ~ sn'), [E('sd', 1 / 4, 1 / 4), E('sd', 3 / 4, 1 / 4)]);
  });
  it('GV-03 hh*8', () => {
    const exp = Array.from({ length: 8 }, (_, k) => E('hh', k / 8, 1 / 8));
    expectEv(run('hh*8'), exp);
  });
  it('GV-04 bd [sn sn]', () => {
    expectEv(run('bd [sn sn]'), [E('bd', 0, 1 / 2), E('sd', 1 / 2, 1 / 4), E('sd', 3 / 4, 1 / 4)]);
  });
  it('GV-05 c2 ~ [c2 c3] g1', () => {
    expectEv(run('c2 ~ [c2 c3] g1'), [
      E('c2', 0, 1 / 4),
      E('c2', 1 / 2, 1 / 8),
      E('c3', 5 / 8, 1 / 8),
      E('g1', 3 / 4, 1 / 4),
    ]);
  });
  it('GV-06 bd [hh [hh hh]]', () => {
    expectEv(run('bd [hh [hh hh]]'), [
      E('bd', 0, 1 / 2),
      E('hh', 1 / 2, 1 / 4),
      E('hh', 3 / 4, 1 / 8),
      E('hh', 7 / 8, 1 / 8),
    ]);
  });
  it('GV-07 [bd sn]*2', () => {
    expectEv(run('[bd sn]*2'), [
      E('bd', 0, 1 / 4),
      E('sd', 1 / 4, 1 / 4),
      E('bd', 1 / 2, 1 / 4),
      E('sd', 3 / 4, 1 / 4),
    ]);
  });
  it('GV-08 コメント除去', () => {
    expectEv(run('bd ~ ~ ~ # kick only'), [E('bd', 0, 1 / 4)]);
  });
  it('GV-09 大文字許容', () => {
    expectEv(run('BD ~ Hh ~'), [E('bd', 0, 1 / 4), E('hh', 1 / 2, 1 / 4)]);
  });
  it('GV-10 空行・コメントのみ', () => {
    expectEv(run('\n# comment\n   '), []);
  });
  it('GV-11 全角スペース区切り', () => {
    expectEv(run('bd　~　bd　~'), [E('bd', 0, 1 / 4), E('bd', 1 / 2, 1 / 4)]);
  });
  it('GV-11b 音名中の # はコメントにしない', () => {
    expectEv(run('bd g#2 ~ ~ # sharp test'), [E('bd', 0, 1 / 4), E('g#2', 1 / 4, 1 / 4)]);
  });
});

describe('§8.2 拡張記法', () => {
  it('GV-12 bd!3 sn', () => {
    expectEv(run('bd!3 sn'), [
      E('bd', 0, 1 / 4),
      E('bd', 1 / 4, 1 / 4),
      E('bd', 1 / 2, 1 / 4),
      E('sd', 3 / 4, 1 / 4),
    ]);
  });
  it('GV-13 bd@3 sn', () => {
    expectEv(run('bd@3 sn'), [E('bd', 0, 3 / 4), E('sd', 3 / 4, 1 / 4)]);
  });
  it('GV-14 <bd sn cp> 交替', () => {
    expectEv(run('<bd sn cp>', 0), [E('bd', 0, 1)]);
    expectEv(run('<bd sn cp>', 1), [E('sd', 0, 1)]);
    expectEv(run('<bd sn cp>', 2), [E('cp', 0, 1)]);
    expectEv(run('<bd sn cp>', 3), [E('bd', 0, 1)]);
  });
  it('GV-15 hh <hh oh>', () => {
    expectEv(run('hh <hh oh>', 0), [E('hh', 0, 1 / 2), E('hh', 1 / 2, 1 / 2)]);
    expectEv(run('hh <hh oh>', 1), [E('hh', 0, 1 / 2), E('oh', 1 / 2, 1 / 2)]);
  });
  it('GV-16 <[bd bd] sn>', () => {
    expectEv(run('<[bd bd] sn>', 0), [E('bd', 0, 1 / 2), E('bd', 1 / 2, 1 / 2)]);
    expectEv(run('<[bd bd] sn>', 1), [E('sd', 0, 1)]);
  });
  it('GV-17 bd(3,8)', () => {
    expectEv(run('bd(3,8)'), [E('bd', 0, 1 / 8), E('bd', 3 / 8, 1 / 8), E('bd', 6 / 8, 1 / 8)]);
  });
  it('GV-18 bd(3,8,1) 回転', () => {
    expectEv(run('bd(3,8,1)'), [
      E('bd', 2 / 8, 1 / 8),
      E('bd', 5 / 8, 1 / 8),
      E('bd', 7 / 8, 1 / 8),
    ]);
  });
  it('GV-19 bd cp(5,8)', () => {
    expectEv(run('bd cp(5,8)'), [
      E('bd', 0, 1 / 2),
      E('cp', 8 / 16, 1 / 16),
      E('cp', 10 / 16, 1 / 16),
      E('cp', 11 / 16, 1 / 16),
      E('cp', 13 / 16, 1 / 16),
      E('cp', 14 / 16, 1 / 16),
    ]);
  });
  it('GV-20 bd/2 sn', () => {
    expectEv(run('bd/2 sn', 0), [E('bd', 0, 1 / 2), E('sd', 1 / 2, 1 / 2)]);
    expectEv(run('bd/2 sn', 1), [E('sd', 1 / 2, 1 / 2)]);
  });
  it('GV-21 bd*4, hh*8 (スタック)', () => {
    const exp = [
      ...Array.from({ length: 4 }, (_, k) => E('bd', k / 4, 1 / 4)),
      ...Array.from({ length: 8 }, (_, k) => E('hh', k / 8, 1 / 8)),
    ];
    expectEv(run('bd*4, hh*8'), exp);
  });
  it('GV-22 hh? (rng=0 で残る)', () => {
    expectEv(
      run('hh?', 0, () => 0),
      [E('hh', 0, 1)],
    );
  });
  it('GV-23 hh? (rng=0.9 で消える)', () => {
    expectEv(
      run('hh?', 0, () => 0.9),
      [],
    );
  });
  it('GV-24 hh*4?0.3 (rng列 0.1,0.5,0.2,0.9)', () => {
    expectEv(run('hh*4?0.3', 0, seqRng([0.1, 0.5, 0.2, 0.9])), [
      E('hh', 0, 1 / 4),
      E('hh', 1 / 2, 1 / 4),
    ]);
  });
  it('GV-25 [bd, hh*2] sn', () => {
    expectEv(run('[bd, hh*2] sn'), [
      E('bd', 0, 1 / 2),
      E('hh', 0, 1 / 4),
      E('hh', 1 / 4, 1 / 4),
      E('sd', 1 / 2, 1 / 2),
    ]);
  });
  it('GV-26 bd hh hh (3等分, 誤差1e-9)', () => {
    expectEv(run('bd hh hh'), [E('bd', 0, 1 / 3), E('hh', 1 / 3, 1 / 3), E('hh', 2 / 3, 1 / 3)]);
  });
});

describe('§8.3 エラー系', () => {
  function errOf(input: string) {
    const r = parse(input);
    if (r.ok) throw new Error('expected parse error but succeeded');
    return r.error;
  }
  it('GV-30 bd [sn → E-01', () => {
    const e = errOf('bd [sn');
    expect(e.code).toBe('E-01');
    expect(e.line).toBe(1);
  });
  it('GV-31 bd xyz bd → E-02', () => {
    const e = errOf('bd xyz bd');
    expect(e.code).toBe('E-02');
    expect(e.message).toContain('xyz');
  });
  it('GV-32 s("bd sd") → E-03', () => {
    expect(errOf('s("bd sd")').code).toBe('E-03');
  });
  it('GV-33 bd*0 → E-04', () => {
    expect(errOf('bd*0').code).toBe('E-04');
  });
  it('GV-34 bd(9,8) → E-04', () => {
    expect(errOf('bd(9,8)').code).toBe('E-04');
  });
  it('GV-35 bd!2*2 → E-05', () => {
    expect(errOf('bd!2*2').code).toBe('E-05');
  });
  it('GV-36 [bd sn]/2 → E-06', () => {
    expect(errOf('[bd sn]/2').code).toBe('E-06');
  });
  it('GV-37 bd . sn → E-03', () => {
    expect(errOf('bd . sn').code).toBe('E-03');
  });
  it('GV-38 2行目にエラー → 行番号2', () => {
    const e = errOf('bd ~ bd ~\nbd [sn');
    expect(e.code).toBe('E-01');
    expect(e.line).toBe(2);
  });
});

describe('参照透過性(受け入れテスト §5-3)', () => {
  it('同一 AST・同一サイクル・同一乱数で同一結果', () => {
    const r = parse('bd*4?0.5, hh*8');
    if (!r.ok) throw new Error('parse failed');
    const a = query(r.layers, 3, seqRng([0.1, 0.9, 0.2, 0.8]));
    const b = query(r.layers, 3, seqRng([0.1, 0.9, 0.2, 0.8]));
    expect(a).toEqual(b);
  });
});
