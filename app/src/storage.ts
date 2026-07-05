// ============================================================================
// 永続化(機能仕様書 FR-11)
// localStorage が使えない環境では例外を握りつぶして動作継続する。
// ============================================================================

const KEY_API = 'algorave_api_key';
const KEY_PATTERNS = 'algorave_patterns_v1';

export interface SavedState {
  patterns: string[];
  bpm: number;
}

export function saveApiKey(key: string): void {
  try {
    localStorage.setItem(KEY_API, key);
  } catch {
    /* プライベートモード等では保存しない */
  }
}

export function loadApiKey(): string {
  try {
    return localStorage.getItem(KEY_API) ?? '';
  } catch {
    return '';
  }
}

export function savePatterns(state: SavedState): void {
  try {
    localStorage.setItem(KEY_PATTERNS, JSON.stringify(state));
  } catch {
    /* 保存なしで継続 */
  }
}

export function loadPatterns(): SavedState | null {
  try {
    const raw = localStorage.getItem(KEY_PATTERNS);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedState>;
    if (!Array.isArray(parsed.patterns) || parsed.patterns.length === 0) return null;
    const bpm = typeof parsed.bpm === 'number' ? parsed.bpm : 132;
    return { patterns: parsed.patterns.map(String), bpm };
  } catch {
    return null;
  }
}

/** デバウンス付きの保存関数を作る(FR-11: 入力から1秒)。 */
export function makeDebouncedSaver(delayMs = 1000): (state: SavedState) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (state: SavedState) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => savePatterns(state), delayMs);
  };
}
