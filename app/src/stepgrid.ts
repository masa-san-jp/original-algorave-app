// ============================================================================
// STEPモード(ステップシーケンサー): コードと16ステップグリッドの相互変換
// グリッドは単なる別ビューであり、情報源は常に Track.code のまま保つ
// (query/parser には一切手を入れず、生成したコードが既存のRUN経路をそのまま通る)。
// ============================================================================

export const STEP_LANES = ['bd', 'sd', 'hh', 'oh', 'cp', 'bs', 'pd', 'sm'] as const;
export type Lane = (typeof STEP_LANES)[number];

export const STEP_LABELS: Record<Lane, string> = {
  bd: 'BD',
  sd: 'SD',
  hh: 'HH',
  oh: 'OH',
  cp: 'CP',
  bs: 'BS',
  pd: 'PD',
  sm: 'SM',
};

export const STEP_COUNT = 16;

export type StepGrid = Record<Lane, boolean[]>;

// 記法仕様書 §2.1 の別名をレーンへ正規化する
const LANE_ALIASES: Record<string, Lane> = {
  sn: 'sd',
  kick: 'bd',
  clap: 'cp',
  bass: 'bs',
  pad: 'pd',
  sample: 'sm',
  smp: 'sm',
};
const LANE_SET: ReadonlySet<string> = new Set(STEP_LANES);

function normalizeTok(raw: string): string {
  const t = raw.toLowerCase();
  return LANE_ALIASES[t] ?? t;
}

export function emptyGrid(): StepGrid {
  const g = {} as StepGrid;
  for (const lane of STEP_LANES) g[lane] = new Array(STEP_COUNT).fill(false) as boolean[];
  return g;
}

/** グリッド → コード。全レーン空なら ''(RUN すると FR-03 の「有効なトークンがありません」になる)。 */
export function gridToCode(grid: StepGrid): string {
  const lines: string[] = [];
  for (const lane of STEP_LANES) {
    if (grid[lane].some(Boolean)) {
      lines.push(grid[lane].map((on) => (on ? lane : '~')).join(' '));
    }
  }
  return lines.join('\n');
}

/**
 * コード → グリッド(ベストエフォート変換)。
 * 各行が「ちょうど STEP_COUNT 個の空白区切りトークンで、休符(~)以外は単一レーン名
 * (別名可)のみで構成される」という形のときだけ、その行を該当レーンへ反映する。
 * 1行でもこの形に一致しない場合(グループ・修飾子・音名・別の分割数など)は
 * exact=false を返し、呼び出し側はその旨をユーザーに案内する(仕様上のスコープ:
 * STEPモードは記法のフラットな部分集合のみを表現し、CODEモードは全記法をカバーする)。
 */
export function codeToGrid(code: string): { grid: StepGrid; exact: boolean } {
  const grid = emptyGrid();
  const lines = code
    .split('\n')
    .map((l) => l.replace(/#.*$/, '').trim())
    .filter(Boolean);
  let exact = true;
  for (const line of lines) {
    const toks = line.split(/\s+/);
    if (toks.length !== STEP_COUNT) {
      exact = false;
      continue;
    }
    let lane: Lane | null = null;
    let ok = true;
    for (const raw of toks) {
      const t = normalizeTok(raw);
      if (t === '~') continue;
      if (!LANE_SET.has(t)) {
        ok = false;
        break;
      }
      if (lane !== null && lane !== t) {
        ok = false;
        break;
      }
      lane = t as Lane;
    }
    if (!ok || lane === null) {
      exact = false;
      continue;
    }
    const fixedLane = lane;
    toks.forEach((raw, i) => {
      if (normalizeTok(raw) === fixedLane) grid[fixedLane][i] = true;
    });
  }
  return { grid, exact };
}
