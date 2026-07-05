// ============================================================================
// Bjorklund 規範ベクタ(記法仕様書 §5.1)
// ============================================================================

import { describe, it, expect } from 'vitest';
import { bjorklund, euclidBits } from '../src/euclid';

function bits(a: number[]): string {
  return a.join('');
}

describe('bjorklund 規範ベクタ', () => {
  it('E(1,4) = 1000', () => {
    expect(bits(bjorklund(1, 4))).toBe('1000');
  });
  it('E(2,4) = 1010', () => {
    expect(bits(bjorklund(2, 4))).toBe('1010');
  });
  it('E(3,8) = 10010010', () => {
    expect(bits(bjorklund(3, 8))).toBe('10010010');
  });
  it('E(5,8) = 10110110', () => {
    expect(bits(bjorklund(5, 8))).toBe('10110110');
  });
  it('E(7,16) はオンセット数7・長さ16', () => {
    const b = bjorklund(7, 16);
    expect(b.length).toBe(16);
    expect(b.reduce((s, x) => s + x, 0)).toBe(7);
  });
  it('境界: k>=n は全オンセット、k<=0 は全休符', () => {
    expect(bits(bjorklund(4, 4))).toBe('1111');
    expect(bits(bjorklund(0, 4))).toBe('0000');
  });
});

describe('euclidBits 回転(§5.2)', () => {
  it('E(3,8,1) は左回転で 00100101', () => {
    expect(bits(euclidBits(3, 8, 1))).toBe('00100101');
  });
  it('回転0は元のパターン', () => {
    expect(bits(euclidBits(3, 8, 0))).toBe('10010010');
  });
});
