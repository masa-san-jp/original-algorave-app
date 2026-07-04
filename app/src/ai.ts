// ============================================================================
// AI 生成(機能仕様書 §9 / FR-10)
// Anthropic Messages API をブラウザから直接呼ぶ(ステージング方式)。
// ============================================================================

// 差し替え可能な単一定数(機能仕様書 §9)
export const AI_MODEL = 'claude-sonnet-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const TIMEOUT_MS = 30_000;

const AI_SYSTEM = `You generate patterns for a mini live-coding music language used in an algorave app.
Tokens:
- Drums: bd(kick) sd(snare) hh(closed hihat) oh(open hihat) cp(clap)
- Notes: note names like c2 e3 g#2 a#1 eb2 (playable synth notes)
- ~ = rest
- [a b] = subdivide one step; nesting allowed
- token*n = repeat n times within its step (e.g. hh*8)
- <a b c> = alternate between a, b, c on successive cycles
- token(k,n) or token(k,n,r) = euclidean rhythm (e.g. bd(3,8))
- token?  or token?0.3 = probabilistic trigger
- token!n = duplicate across steps; token@n = weight (widen) a step
- comma separates layers within one line; a newline is also a parallel layer
Each line is one 4/4 measure cycle; multiple lines play in parallel.
Keep patterns musical, danceable, and performable live. 2-5 lines max.
Respond ONLY with JSON: {"pattern":"line1\\nline2"} - no markdown, no explanation.`;

export interface AiParams {
  apiKey: string;
  bpm: number;
  currentPattern: string;
  otherPatterns: string[]; // 他トラック(アンサンブル文脈)
  instruction: string;
}

export interface AiResult {
  pattern: string;
}

/**
 * AI にパターンを生成させる。成功時は {pattern}、失敗時は Error を投げる。
 * 呼び出し側でクライアントパースして記法エラーを検出する(FR-10 / §9)。
 */
export async function aiGenerate(params: AiParams): Promise<AiResult> {
  const ensemble =
    params.otherPatterns.length > 0
      ? `\n\nOther tracks currently playing (for ensemble context):\n${params.otherPatterns
          .map((p, i) => `[track ${i + 1}]\n${p || '(empty)'}`)
          .join('\n')}`
      : '';
  const instruction =
    params.instruction.trim() ||
    'Evolve this pattern: keep the groove recognizable but add variation and energy.';

  const userMsg =
    `BPM: ${params.bpm}\nCurrent pattern:\n${params.currentPattern || '(empty)'}` +
    `${ensemble}\n\nInstruction: ${instruction}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': params.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 1000,
        system: AI_SYSTEM,
        messages: [{ role: 'user', content: userMsg }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`api ${res.status}`);
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('\n');
    let parsed: { pattern?: unknown };
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      throw new Error('応答を解釈できません');
    }
    if (typeof parsed.pattern !== 'string' || parsed.pattern.trim() === '') {
      throw new Error('応答を解釈できません');
    }
    return { pattern: parsed.pattern };
  } finally {
    clearTimeout(timer);
  }
}
