// ============================================================================
// エントリポイント: 状態を保持し全モジュールを配線する(機能仕様書 全FR)
// ============================================================================

import * as Tone from 'tone';
import './style.css';
import { parse, layersHaveSound } from './parser';
import { buildInstrument } from './audio';
import { ensureTransport, stopTransport, setBpm } from './scheduler';
import { aiGenerate } from './ai';
import { gridToCode, codeToGrid } from './stepgrid';
import type { Lane } from './stepgrid';
import {
  HUES,
  MAX_TRACKS,
  DEFAULT_PATTERNS,
  NEW_TRACK_CODE,
  newTrack,
  cutoffToFreq,
  measureSeconds,
} from './state';
import type { Track } from './state';
import { buildTrackDOM, paintTrack } from './ui';
import type { TrackCallbacks } from './ui';
import {
  loadApiKey,
  saveApiKey,
  loadPatterns,
  makeDebouncedSaver,
  type SavedState,
} from './storage';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

// ---- アプリ状態(機能仕様書 §8)----
let tracks: Track[] = [];
let playing = false;
let booted = false;
let mobileTab = 0;

const saveDebounced = makeDebouncedSaver(1000);

// ---------------------------------------------------------------------------
// 永続化ヘルパ
// ---------------------------------------------------------------------------
function currentSavedState(): SavedState {
  return { patterns: tracks.map((t) => t.code), bpm: +$<HTMLInputElement>('bpm').value };
}
function persist(): void {
  saveDebounced(currentSavedState());
}

// ---------------------------------------------------------------------------
// トラック名・色
// ---------------------------------------------------------------------------
function trackName(t: Track): string {
  return 'TRACK ' + String.fromCharCode(65 + tracks.indexOf(t));
}
function hueOf(t: Track): string {
  return HUES[tracks.indexOf(t) % HUES.length];
}

// ---------------------------------------------------------------------------
// 描画
// ---------------------------------------------------------------------------
function repaint(t: Track): void {
  paintTrack(t, trackName(t), playing, tracks.length > 1);
  renderTabs();
}
function repaintAll(): void {
  tracks.forEach(repaint);
}

function renderTabs(): void {
  const tabs = $('tabs');
  tabs.innerHTML = '';
  tracks.slice(0, 2).forEach((t, i) => {
    const hue = HUES[i % HUES.length];
    const b = document.createElement('button');
    b.className = 'btn';
    b.style.setProperty('--hue', hue);
    b.textContent = 'TRACK ' + String.fromCharCode(65 + i) + (t.running && playing ? ' ●' : '');
    if (mobileTab === i) {
      b.style.background = hue;
      b.style.color = '#05070d';
    }
    b.addEventListener('click', () => {
      mobileTab = i;
      renderTabs();
      applyMobile();
    });
    tabs.appendChild(b);
  });
}

function applyMobile(): void {
  const mobile = window.innerWidth < 760;
  tracks.forEach((t, i) => {
    if (!t.el) return;
    const hidden = mobile && (i >= 2 || i !== Math.min(mobileTab, 1));
    t.el.classList.toggle('m-hidden', hidden);
  });
}

// ---------------------------------------------------------------------------
// トラックDOM構築
// ---------------------------------------------------------------------------
const callbacks: TrackCallbacks = {
  onRun: (t) => void runTrack(t),
  onStop: (t) => {
    t.running = false;
    repaint(t);
  },
  onMute: (t) => {
    t.muted = !t.muted;
    repaint(t);
  },
  onAi: (t) => void aiOnTrack(t),
  onVol: (t, v) => {
    t.gain = v;
    if (t.inst) t.inst.gain.gain.rampTo(v, 0.05);
  },
  onFilt: (t, v) => {
    t.cutoff = v;
    if (t.inst) t.inst.filter.frequency.rampTo(cutoffToFreq(v), 0.05);
  },
  onDelete: (t) => deleteTrack(t),
  onCodeChange: (t, code) => {
    t.code = code;
    persist();
  },
  onToggleMode: (t) => toggleMode(t),
  onStepToggle: (t, lane, step) => stepToggle(t, lane, step),
};

// ---------------------------------------------------------------------------
// STEPモード(ステップシーケンサー): グリッドは常に t.code の別ビュー(stepgrid.ts)
// ---------------------------------------------------------------------------
function toggleMode(t: Track): void {
  if (t.mode === 'code') {
    const { grid, exact } = codeToGrid(t.code);
    t.grid = grid;
    t.mode = 'step';
    t.error = exact
      ? null
      : '現在のコードはSTEPモードで完全には表現できません(変換できた範囲のみ反映)';
  } else {
    t.mode = 'code';
  }
  repaint(t);
}

function stepToggle(t: Track, lane: Lane, step: number): void {
  t.grid[lane][step] = !t.grid[lane][step];
  t.code = gridToCode(t.grid);
  if (t.refs) t.refs.textarea.value = t.code;
  persist();
  // ステップ操作は「叩いた通りにすぐ音が変わる」ことが直感的なため、
  // 明示RUNを待たず即座に反映する(次サイクル境界からという挙動はFR-03のまま)。
  void runTrack(t);
}

function mountTrack(t: Track): void {
  const el = buildTrackDOM(t, hueOf(t), callbacks);
  $('tracks').appendChild(el);
  repaint(t);
}

function renderAll(): void {
  $('tracks').innerHTML = '';
  tracks.forEach((t) => {
    t.el = null;
    t.refs = null;
    mountTrack(t);
  });
  applyMobile();
}

function deleteTrack(t: Track): void {
  if (tracks.length <= 1) return;
  tracks = tracks.filter((x) => x !== t);
  if (t.inst) t.inst.dispose();
  t.el?.remove();
  renderAll();
  persist();
}

// ---------------------------------------------------------------------------
// RUN / 再生制御
// ---------------------------------------------------------------------------
async function runTrack(t: Track): Promise<void> {
  const result = parse(t.code);
  if (!result.ok) {
    // パースエラー: 旧パターンを維持しエラー表示のみ(FR-03)
    t.error = result.error.message;
    repaint(t);
    return;
  }
  if (result.layers.length === 0 || !layersHaveSound(result.layers)) {
    // 有効トークン0件: 次サイクルから停止(FR-03)
    t.layers = [];
    t.running = false;
    t.error = '有効なトークンがありません';
    repaint(t);
    return;
  }
  if (!t.inst) t.inst = buildInstrument();
  t.layers = result.layers;
  t.running = true;
  t.error = null;
  hideOverlay();
  await ensureTransport(tracks, onCycle);
  playing = true;
  updateMaster();
  repaintAll();
}

async function runAll(): Promise<void> {
  await Tone.start();
  for (const t of tracks) {
    const result = parse(t.code);
    if (result.ok && result.layers.length > 0 && layersHaveSound(result.layers)) {
      if (!t.inst) t.inst = buildInstrument();
      t.layers = result.layers;
      t.running = true;
      t.error = null;
    }
  }
  hideOverlay();
  await ensureTransport(tracks, onCycle);
  playing = true;
  updateMaster();
  repaintAll();
}

function stopAll(): void {
  stopTransport();
  playing = false;
  tracks.forEach((t) => {
    t.running = false;
  });
  updateMaster();
  repaintAll();
}

function onCycle(c: number): void {
  $('cycle').textContent = String(c);
}

function updateMaster(): void {
  const b = $<HTMLButtonElement>('master');
  b.textContent = playing ? '■ STOP ALL' : '▶ START ALL';
  b.style.setProperty('--hue', playing ? '#ff5ce1' : '#a6ff4d');
  document.body.style.setProperty(
    '--measure',
    measureSeconds(+$<HTMLInputElement>('bpm').value) + 's',
  );
}

function hideOverlay(): void {
  if (!booted) {
    booted = true;
    $('overlay').style.display = 'none';
  }
}

// ---------------------------------------------------------------------------
// AI(機能仕様書 §9 / FR-10)
// ---------------------------------------------------------------------------
async function aiOnTrack(t: Track): Promise<void> {
  if (!t.refs) return;
  const key = $<HTMLInputElement>('apiKey').value.trim();
  if (!key) {
    t.error = 'AI機能にはAPIキーが必要です(上の入力欄へ)';
    repaint(t);
    return;
  }
  saveApiKey(key);
  t.refs.ai.disabled = true;
  t.refs.ai.textContent = 'AI…';
  t.error = null;
  repaint(t);
  try {
    const result = await aiGenerate({
      apiKey: key,
      bpm: +$<HTMLInputElement>('bpm').value,
      currentPattern: t.code,
      otherPatterns: tracks.filter((x) => x !== t).map((x) => x.code),
      instruction: $<HTMLInputElement>('aiPrompt').value,
    });
    t.code = result.pattern;
    t.refs.textarea.value = result.pattern;
    // クライアント側でもパースし記法エラーを検知(§9)
    const check = parse(result.pattern);
    t.error = check.ok
      ? 'AI案を挿入しました。RUNで反映'
      : 'AI案の記法にエラーがあります。修正してRUNしてください';
    persist();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    t.error =
      msg === '応答を解釈できません'
        ? 'AI生成に失敗: 応答を解釈できません'
        : `AI生成に失敗: ${msg}(キーとネット接続を確認)`;
  } finally {
    t.refs.ai.disabled = false;
    t.refs.ai.textContent = '✦ AI';
    repaint(t);
  }
}

// ---------------------------------------------------------------------------
// マスター操作の配線
// ---------------------------------------------------------------------------
function wireControls(): void {
  $<HTMLInputElement>('bpm').addEventListener('input', (e) => {
    const bpm = +(e.target as HTMLInputElement).value;
    $('bpmVal').textContent = String(bpm);
    setBpm(bpm);
    document.body.style.setProperty('--measure', measureSeconds(bpm) + 's');
    persist();
  });
  $('master').addEventListener('click', () => (playing ? stopAll() : void runAll()));
  $('addTrack').addEventListener('click', () => {
    if (tracks.length >= MAX_TRACKS) return;
    const t = newTrack(NEW_TRACK_CODE);
    tracks.push(t);
    mountTrack(t);
    applyMobile();
    updateAddButton();
    persist();
  });
  $('boot').addEventListener('click', () => void runAll());
  window.addEventListener('resize', applyMobile);
}

function updateAddButton(): void {
  $<HTMLButtonElement>('addTrack').disabled = tracks.length >= MAX_TRACKS;
}

// ---------------------------------------------------------------------------
// 初期化
// ---------------------------------------------------------------------------
function init(): void {
  const saved = loadPatterns();
  const bpm = saved?.bpm ?? 132;
  setBpm(bpm);
  $<HTMLInputElement>('bpm').value = String(bpm);
  $('bpmVal').textContent = String(bpm);

  const key = loadApiKey();
  if (key) $<HTMLInputElement>('apiKey').value = key;

  const patterns = saved?.patterns ?? DEFAULT_PATTERNS;
  tracks = patterns.map((c) => newTrack(c));

  wireControls();
  renderAll();
  updateMaster();
  updateAddButton();
}

init();
