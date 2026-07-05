// ============================================================================
// オーディオエンジン(機能仕様書 §6 音源)
// Tone.js ラッパ。トラックごとに音源一式をインスタンス化する。
// ============================================================================

import * as Tone from 'tone';
import { DRUM_NAMES, NOTE_RE } from './parser';

let master: Tone.Gain | null = null;

/** マスターゲイン(全トラック共通、0.9)を遅延生成する。 */
export function getMaster(): Tone.Gain {
  if (!master) master = new Tone.Gain(0.9).toDestination();
  return master;
}

/** パッド(pd)の固定コード(Cメジャートライアド)。機能仕様書追補(ベース/シンセパッド)。 */
const PAD_CHORD = ['C3', 'E3', 'G3'];
/** ベース(bs)の固定ノート。 */
const BASS_NOTE = 'C1';

export interface Instrument {
  /** トラックVOL(0..1) */
  gain: Tone.Gain;
  /** ローパスフィルタ(カットオフ 80..12000Hz) */
  filter: Tone.Filter;
  /** トークンを time(秒)に発音する。例外は握りつぶし演奏を止めない。 */
  trigger(tok: string, time: number): void;
  /** サンプラー(sm)へ音声を読み込む(アップロード/録音どちらも objectURL 経由)。 */
  loadSampleFromUrl(url: string): Promise<void>;
  /** サンプルが読み込み済みか。 */
  hasSample(): boolean;
  /** 全ノードを破棄する(トラック削除時)。 */
  dispose(): void;
}

/**
 * トラック1本分の音源一式を生成する。
 * 信号経路: 各音源 → gain(VOL) → filter(LPF) → master → destination
 * hh/oh のみ 8kHz HPF を経由。
 */
export function buildInstrument(): Instrument {
  const m = getMaster();
  const filter = new Tone.Filter(12000, 'lowpass').connect(m);
  const gain = new Tone.Gain(0.8).connect(filter);

  const kick = new Tone.MembraneSynth({ octaves: 6, pitchDecay: 0.045 }).connect(gain);
  const snare = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.001, decay: 0.14, sustain: 0 },
  }).connect(gain);
  const hatHP = new Tone.Filter(8000, 'highpass').connect(gain);
  const hat = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.04, sustain: 0 },
  }).connect(hatHP);
  const hatOpen = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.25, sustain: 0 },
  }).connect(hatHP);
  const clap = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.002, decay: 0.2, sustain: 0 },
  }).connect(gain);
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.005, decay: 0.15, sustain: 0.15, release: 0.08 },
    volume: -8,
  }).connect(gain);
  // ベース(bs): 固定ノート(C1)を鳴らす単音シンセ(サブ的な低域、短めのフィルタエンベロープ)
  const bass = new Tone.MonoSynth({
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.2 },
    filterEnvelope: { attack: 0.01, decay: 0.15, sustain: 0.3, baseFrequency: 90, octaves: 2.5 },
    volume: -4,
  }).connect(gain);
  // シンセパッド(pd): 固定コード(Cメジャー)を鳴らすスロー・アタックのポリシンセ
  const pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'fatsawtooth', count: 3, spread: 20 },
    envelope: { attack: 0.4, decay: 0.3, sustain: 0.6, release: 1.6 },
    volume: -14,
  }).connect(gain);
  // サンプラー(sm): アップロード/録音した音声を1ショット再生(未読込時は無音)
  const sampler = new Tone.Player().connect(gain);
  let sampleLoaded = false;

  return {
    gain,
    filter,
    trigger(tok: string, time: number): void {
      try {
        if (tok === 'bd') kick.triggerAttackRelease('C1', '8n', time);
        else if (tok === 'sd') snare.triggerAttackRelease('16n', time);
        else if (tok === 'hh') hat.triggerAttackRelease('32n', time);
        else if (tok === 'oh') hatOpen.triggerAttackRelease('16n', time);
        else if (tok === 'cp') clap.triggerAttackRelease('16n', time);
        else if (tok === 'bs') bass.triggerAttackRelease(BASS_NOTE, '8n', time);
        else if (tok === 'pd') pad.triggerAttackRelease(PAD_CHORD, '2n', time);
        else if (tok === 'sm') {
          if (sampleLoaded) sampler.start(time);
        } else if (NOTE_RE.test(tok)) synth.triggerAttackRelease(tok.toUpperCase(), '16n', time);
        else if (!DRUM_NAMES.has(tok)) {
          /* 未知トークンはパーサ段で弾かれる。防御的に無視 */
        }
      } catch {
        /* 高速連打時の Tone.js 例外を握りつぶし、演奏を止めない */
      }
    },
    async loadSampleFromUrl(url: string): Promise<void> {
      await sampler.load(url);
      sampleLoaded = true;
    },
    hasSample(): boolean {
      return sampleLoaded;
    },
    dispose(): void {
      [kick, snare, hat, hatOpen, clap, synth, bass, pad, sampler, hatHP, gain, filter].forEach(
        (n) => n.dispose(),
      );
    },
  };
}
