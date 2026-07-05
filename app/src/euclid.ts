// ============================================================================
// ユークリッドリズム(記法仕様書 §5)
// Bjorklund アルゴリズムの規範実装。純粋関数。
// ============================================================================

/**
 * k 個のオンセットを n スロットへ最も均等に配置する Bjorklund アルゴリズム。
 * 返り値は長さ n の 0/1 配列。
 * 規範ベクタ(記法仕様書 §5.1): E(3,8)=10010010, E(5,8)=10110110 等。
 */
export function bjorklund(k: number, n: number): number[] {
  if (n <= 0) return [];
  if (k <= 0) return new Array(n).fill(0);
  if (k >= n) return new Array(n).fill(1);

  let a: number[][] = [];
  let b: number[][] = [];
  for (let i = 0; i < k; i++) a.push([1]);
  for (let i = 0; i < n - k; i++) b.push([0]);

  while (b.length > 1) {
    const pairs = Math.min(a.length, b.length);
    const newA: number[][] = [];
    for (let i = 0; i < pairs; i++) newA.push(a[i].concat(b[i]));
    const rest = a.length > pairs ? a.slice(pairs) : b.slice(pairs);
    a = newA;
    b = rest;
  }

  const flat: number[] = [];
  for (const group of a.concat(b)) for (const x of group) flat.push(x);
  return flat;
}

/**
 * E(k,n) を左回転 r した 0/1 配列を返す(記法仕様書 §5.2)。
 * rotated[i] = base[(i + r) mod n]
 */
export function euclidBits(k: number, n: number, r: number): number[] {
  const base = bjorklund(k, n);
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i++) out[i] = base[(((i + r) % n) + n) % n];
  return out;
}
