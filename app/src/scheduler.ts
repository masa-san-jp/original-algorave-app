// ============================================================================
// スケジューラ(機能仕様書 §7)
// 1小節ごとに各 RUNNING トラックのパターンを query し発音予約する。
// ============================================================================

import * as Tone from 'tone';
import { query } from './pattern';
import { measureSeconds } from './state';
import type { Track } from './state';
import type { Rng } from './types';

let loopId: number | null = null;
let cycle = 0;
const rng: Rng = () => Math.random();

export function getCycle(): number {
  return cycle;
}

/**
 * トランスポートを開始し、1小節ごとのスケジューリングループを1度だけ張る。
 * @param tracks 参照を保持し、毎サイクル最新状態を読む
 * @param onCycle オーディオスレッド基準(Tone.Draw)でサイクル番号を通知
 */
export async function ensureTransport(
  tracks: Track[],
  onCycle: (c: number) => void,
): Promise<void> {
  await Tone.start();
  if (loopId === null) {
    loopId = Tone.Transport.scheduleRepeat((time) => {
      const measure = measureSeconds(Tone.Transport.bpm.value);
      for (const t of tracks) {
        if (!t.running || t.muted || !t.layers || !t.inst) continue;
        const events = query(t.layers, cycle, rng);
        for (const ev of events) t.inst.trigger(ev.tok, time + ev.pos * measure);
      }
      const c = ++cycle;
      Tone.Draw.schedule(() => onCycle(c), time);
    }, '1m');
  }
  if (Tone.Transport.state !== 'started') {
    Tone.Transport.start('+0.05');
  }
}

export function stopTransport(): void {
  Tone.Transport.stop();
}

export function setBpm(bpm: number): void {
  Tone.Transport.bpm.value = bpm;
}
