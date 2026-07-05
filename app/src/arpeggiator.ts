// ============================================================================
// アルペジエイター(追補): コード指定 → 既存記法の音名トークン列を自動生成する。
// 生成物はただの mini-notation テキスト行なので、parser/pattern/scheduler は無変更。
// ============================================================================

export const ARP_ROOTS = [
  'c',
  'c#',
  'd',
  'd#',
  'e',
  'f',
  'f#',
  'g',
  'g#',
  'a',
  'a#',
  'b',
] as const;
export type ArpRoot = (typeof ARP_ROOTS)[number];

export type ArpQuality = 'maj' | 'min' | 'maj7' | 'min7' | 'dom7' | 'sus4';
export const ARP_QUALITIES: ArpQuality[] = ['maj', 'min', 'maj7', 'min7', 'dom7', 'sus4'];

export type ArpPattern = 'up' | 'down' | 'updown' | 'random';
export const ARP_PATTERNS: ArpPattern[] = ['up', 'down', 'updown', 'random'];

export interface ArpConfig {
  enabled: boolean;
  root: ArpRoot;
  octave: number;
  quality: ArpQuality;
  pattern: ArpPattern;
}

export function defaultArpConfig(): ArpConfig {
  return { enabled: false, root: 'c', octave: 3, quality: 'maj', pattern: 'up' };
}

// 半音間隔(ルートからの相対値)
const CHORD_INTERVALS: Record<ArpQuality, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  sus4: [0, 5, 7],
};

const ROOT_INDEX: Record<ArpRoot, number> = {
  c: 0,
  'c#': 1,
  d: 2,
  'd#': 3,
  e: 4,
  f: 5,
  'f#': 6,
  g: 7,
  'g#': 8,
  a: 9,
  'a#': 10,
  b: 11,
};

function noteAt(root: ArpRoot, octave: number, semitoneOffset: number): string {
  const total = ROOT_INDEX[root] + semitoneOffset;
  const oct = octave + Math.floor(total / 12);
  const idx = ((total % 12) + 12) % 12;
  return `${ARP_ROOTS[idx]}${oct}`;
}

/** コード構成音(root からのパターン適用前の生の和音、上行順)。 */
export function chordNotes(config: Pick<ArpConfig, 'root' | 'octave' | 'quality'>): string[] {
  return CHORD_INTERVALS[config.quality].map((iv) => noteAt(config.root, config.octave, iv));
}

/**
 * コード設定 → stepCount 個の音名トークン列。
 * pattern='random' も再現性のため擬似乱数(Math.random不使用)で決定的に選ぶ。
 */
export function arpToTokens(config: ArpConfig, stepCount: number): string[] {
  const notes = chordNotes(config);
  if (notes.length === 0) return new Array(stepCount).fill('~') as string[];

  let sequence: string[];
  switch (config.pattern) {
    case 'up':
      sequence = notes;
      break;
    case 'down':
      sequence = [...notes].reverse();
      break;
    case 'updown':
      sequence = notes.length > 2 ? [...notes, ...[...notes].reverse().slice(1, -1)] : notes;
      break;
    case 'random':
      sequence = notes; // 下のループで擬似ランダムに選択する
      break;
  }

  const tokens: string[] = [];
  for (let i = 0; i < stepCount; i++) {
    if (config.pattern === 'random') {
      const idx = (i * 7 + 3) % notes.length;
      tokens.push(notes[idx]);
    } else {
      tokens.push(sequence[i % sequence.length]);
    }
  }
  return tokens;
}

/** STEPモードのコード行として使う文字列。無効時は ''(コードに含めない)。 */
export function arpToCodeLine(config: ArpConfig, stepCount: number): string {
  if (!config.enabled) return '';
  return arpToTokens(config, stepCount).join(' ');
}
