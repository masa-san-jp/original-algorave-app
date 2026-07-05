// ============================================================================
// UI: トラックDOMの生成・状態描画(機能仕様書 §5)
// ユーザー入力は textContent / value 経由で扱い innerHTML に入れない(§5.3 XSS防止)。
// ============================================================================

import type { Track, TrackRefs } from './state';
import { STEP_LANES, STEP_LABELS, STEP_COUNT } from './stepgrid';
import type { Lane } from './stepgrid';

export interface TrackCallbacks {
  onRun: (t: Track) => void;
  onStop: (t: Track) => void;
  onMute: (t: Track) => void;
  onAi: (t: Track) => void;
  onVol: (t: Track, v: number) => void;
  onFilt: (t: Track, v: number) => void;
  onDelete: (t: Track) => void;
  onCodeChange: (t: Track, code: string) => void;
  onToggleMode: (t: Track) => void;
  onStepToggle: (t: Track, lane: Lane, step: number) => void;
}

// STEPビューは固定形状(5レーン×16ステップ)の静的マークアップ。値は定数のみなので
// innerHTML に埋め込んでも安全(ユーザー入力は一切含まない)。
function stepCellsHTML(lane: Lane): string {
  let s = '';
  for (let i = 0; i < STEP_COUNT; i++) {
    s += `<button type="button" class="stepcell" data-step="${i}" aria-pressed="false" aria-label="${STEP_LABELS[lane]} ${i + 1}拍目"></button>`;
  }
  return s;
}
function stepViewHTML(): string {
  const rows = STEP_LANES.map(
    (lane) =>
      `<div class="steprow" data-lane="${lane}"><span class="stepname">${STEP_LABELS[lane]}</span><div class="stepcells">${stepCellsHTML(lane)}</div></div>`,
  ).join('');
  return `<div class="stepview"><div class="stepgridinner">${rows}<div class="stepplayhead" aria-hidden="true"></div></div></div>`;
}

// 静的テンプレート(ユーザー入力を含まないため innerHTML 使用可)
const TEMPLATE = `
  <div class="thead">
    <span class="tname"></span>
    <span class="tstatus" style="opacity:0.6"></span>
    <button type="button" class="modebtn" aria-label="STEP/CODEモード切替"></button>
    <span class="tmute" style="color:#ff5ce1"></span>
    <button class="x" aria-label="トラックを削除">×</button>
  </div>
  <div class="editorwrap">
    <textarea class="codeview" spellcheck="false" aria-label="パターンコード"></textarea>
    ${stepViewHTML()}
    <div class="playhead" aria-hidden="true"></div>
  </div>
  <div class="terr"></div>
  <div class="tfoot">
    <button class="btn solid run">RUN ⏎</button>
    <button class="btn stop">STOP</button>
    <button class="btn mute">MUTE</button>
    <button class="btn ai">✦ AI</button>
    <label>VOL<input type="range" class="vol" min="0" max="1" step="0.01" aria-label="音量"></label>
    <label>FILT<input type="range" class="filt" min="0" max="100" aria-label="フィルタ"></label>
  </div>`;

export function buildTrackDOM(t: Track, hue: string, cb: TrackCallbacks): HTMLElement {
  const div = document.createElement('div');
  div.className = 'term';
  div.style.setProperty('--hue', hue);
  div.innerHTML = TEMPLATE;

  const q = <T extends Element>(sel: string): T => div.querySelector(sel) as T;
  const refs: TrackRefs = {
    name: q('.tname'),
    status: q('.tstatus'),
    muteTag: q('.tmute'),
    textarea: q<HTMLTextAreaElement>('.codeview'),
    error: q('.terr'),
    run: q<HTMLButtonElement>('.run'),
    stop: q<HTMLButtonElement>('.stop'),
    mute: q<HTMLButtonElement>('.mute'),
    ai: q<HTMLButtonElement>('.ai'),
    modeBtn: q<HTMLButtonElement>('.modebtn'),
    stepCells: STEP_LANES.map((lane) =>
      Array.from(
        div.querySelectorAll<HTMLButtonElement>(`.steprow[data-lane="${lane}"] .stepcell`),
      ),
    ),
  };
  t.el = div;
  t.refs = refs;

  refs.textarea.value = t.code; // value 経由(XSS安全)
  q<HTMLInputElement>('.vol').value = String(t.gain);
  q<HTMLInputElement>('.filt').value = String(t.cutoff);

  refs.textarea.addEventListener('input', (e) =>
    cb.onCodeChange(t, (e.target as HTMLTextAreaElement).value),
  );
  refs.textarea.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      cb.onRun(t);
    }
  });
  refs.run.addEventListener('click', () => cb.onRun(t));
  refs.stop.addEventListener('click', () => cb.onStop(t));
  refs.mute.addEventListener('click', () => cb.onMute(t));
  refs.ai.addEventListener('click', () => cb.onAi(t));
  q<HTMLInputElement>('.vol').addEventListener('input', (e) =>
    cb.onVol(t, +(e.target as HTMLInputElement).value),
  );
  q<HTMLInputElement>('.filt').addEventListener('input', (e) =>
    cb.onFilt(t, +(e.target as HTMLInputElement).value),
  );
  q<HTMLButtonElement>('.x').addEventListener('click', () => cb.onDelete(t));
  refs.modeBtn.addEventListener('click', () => cb.onToggleMode(t));
  refs.stepCells.forEach((cells, laneIdx) => {
    cells.forEach((btn, stepIdx) => {
      btn.addEventListener('click', () => cb.onStepToggle(t, STEP_LANES[laneIdx], stepIdx));
    });
  });

  return div;
}

/** 状態から一意にトラック表示を更新する(冪等)。機能仕様書 §8 */
export function paintTrack(t: Track, name: string, playing: boolean, deletable: boolean): void {
  if (!t.el || !t.refs) return;
  const r = t.refs;
  t.el.classList.toggle('running', t.running && playing && !t.muted);
  t.el.classList.toggle('mode-step', t.mode === 'step');
  r.name.textContent = name;
  r.status.textContent = t.running ? 'RUNNING' : 'IDLE';
  r.muteTag.textContent = t.muted ? 'MUTED' : '';
  r.mute.textContent = t.muted ? 'UNMUTE' : 'MUTE';
  r.stop.disabled = !t.running;
  r.error.textContent = t.error ?? '';
  r.modeBtn.textContent = t.mode === 'step' ? '⌨ CODE' : '⊞ STEP';
  const x = t.el.querySelector<HTMLButtonElement>('.x');
  if (x) x.disabled = !deletable;
  STEP_LANES.forEach((lane, laneIdx) => {
    r.stepCells[laneIdx].forEach((btn, stepIdx) => {
      const on = t.grid[lane][stepIdx];
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  });
}
