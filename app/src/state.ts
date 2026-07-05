// ============================================================================
// 状態モデル(機能仕様書 §8)
// ============================================================================

import type { Node } from './types';
import type { Instrument } from './audio';
import { emptyGrid } from './stepgrid';
import type { StepGrid } from './stepgrid';

export const HUES = ['#ffb454', '#59f7ff', '#ff5ce1', '#a6ff4d', '#c09bff', '#ff7a59'];
export const MAX_TRACKS = 6;

// デモパターン(機能仕様書 FR-02。プロトタイプと同一)
export const DEFAULT_PATTERNS = ['bd ~ bd ~\n~ sn ~ sn\nhh*8', 'c2 ~ [c2 c3] g1\n~ ~ eb2 ~'];
export const NEW_TRACK_CODE = 'bd ~ ~ bd';

export type TrackMode = 'code' | 'step';

export interface TrackRefs {
  name: HTMLElement;
  status: HTMLElement;
  muteTag: HTMLElement;
  textarea: HTMLTextAreaElement;
  error: HTMLElement;
  run: HTMLButtonElement;
  stop: HTMLButtonElement;
  mute: HTMLButtonElement;
  ai: HTMLButtonElement;
  modeBtn: HTMLButtonElement;
  /** [レーン順(STEP_LANES) の index][ステップ index] */
  stepCells: HTMLButtonElement[][];
}

export interface Track {
  id: number;
  code: string;
  layers: Node[] | null; // パース済みAST(次サイクルから反映)
  running: boolean;
  muted: boolean;
  gain: number; // 0..1
  cutoff: number; // 0..100
  error: string | null;
  inst: Instrument | null;
  el: HTMLElement | null;
  refs: TrackRefs | null;
  /** 'code'(エディタ) / 'step'(ステップシーケンサー)。既定は 'code'、リロードでも常に 'code' に戻る
   *  (パターン本体は t.code として永続化されるため、表示モードだけが初期化される)。 */
  mode: TrackMode;
  /** STEPモード用のグリッド。code とは gridToCode/codeToGrid で相互変換する別ビュー。 */
  grid: StepGrid;
}

let uid = 0;

export function newTrack(code: string): Track {
  return {
    id: ++uid,
    code,
    layers: null,
    running: false,
    muted: false,
    gain: 0.8,
    cutoff: 100,
    error: null,
    inst: null,
    el: null,
    refs: null,
    mode: 'code',
    grid: emptyGrid(),
  };
}

/** FILT スライダー値(0..100)→ カットオフ周波数(80..12000Hz)。機能仕様書 FR-06 */
export function cutoffToFreq(cutoff: number): number {
  return 80 * Math.pow(150, cutoff / 100);
}

/** BPM → 1小節の秒数 */
export function measureSeconds(bpm: number): number {
  return (60 / bpm) * 4;
}
