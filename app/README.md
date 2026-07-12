# Algorave Terminals v1(実装本体)

ブラウザだけで動くライブコーディング音楽アプリ。TypeScript + Vite + Tone.js。
記法は Strudel / TidalCycles のミニノーテーション互換サブセット(詳細は
[`../docs/20260703-algorave-v1-notation-spec.md`](../docs/20260703-algorave-v1-notation-spec.md))。

> ルート直下の `../index.html` は着想元の参照プロトタイプ(単一ファイル版)。
> 本ディレクトリ `app/` が仕様書に基づく v1 実装です。

## セットアップ

```bash
cd app
npm install
```

## 開発・ビルド・検証

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー(HMR)。表示された URL を開く |
| `npm run build` | 型チェック + 本番ビルド → `dist/`(静的ファイル一式) |
| `npm run build:single` | 型チェック + **単一HTMLビルド** → `dist-single/index.html`(JS/CSS/Tone.js を全部インライン化した1枚) |
| `npm run preview` | ビルド結果 `dist/` をローカル配信 |
| `npm test` | 単体テスト(記法ゴールデンテストベクタ + Bjorklund) |
| `npm run coverage` | カバレッジ計測(parser / pattern / euclid) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier 整形 |

## 本番配信

`npm run build` で生成される `dist/` は、単純な静的サーバーでそのまま動きます
(アセット参照は相対パス。サブパス配信も可)。

```bash
cd app
npm run build
python3 -m http.server 8000 --directory dist
# → http://localhost:8000
```

初回ロード後はネットワーク断でも演奏機能が動作します(AI機能を除く。Tone.js はバンドル同梱)。

### 単一HTMLファイルとして配布する

ビルド不要・CDN不要で「HTMLファイル1枚」を配りたい場合:

```bash
cd app
npm run build:single      # → dist-single/index.html(全部インライン、外部参照ゼロ)
```

生成される `dist-single/index.html` は JS・CSS・Tone.js をすべて埋め込んだ1ファイルです。
サーバーに置いても、ブラウザでそのまま開いても(Chromium で `file://` 起動を確認済み)動きます。
※ AI 機能は `file://` では通信がブロックされることがあるため、AI を使う場合は http 配信を推奨。

## モジュール構成

| ファイル | 役割 | 依存 |
|---|---|---|
| `src/parser.ts` | テキスト → AST(記法仕様書 §3/§7) | 純粋・ブラウザ非依存 |
| `src/pattern.ts` | AST + cycle + rng → イベント列(§4) | 純粋・ブラウザ非依存 |
| `src/euclid.ts` | Bjorklund ユークリッド(§5) | 純粋 |
| `src/audio.ts` | Tone.js 音源・ミキサー(機能仕様書 §6) | Tone.js |
| `src/scheduler.ts` | サイクル同期スケジューラ(§7) | Tone.js |
| `src/state.ts` | 状態モデル・定数(§8) | — |
| `src/storage.ts` | localStorage 永続化(FR-11) | — |
| `src/ai.ts` | Anthropic API 連携(§9 / FR-10) | fetch |
| `src/ui.ts` | トラックDOM生成・描画(§5) | DOM |
| `src/main.ts` | 全体の配線・エントリポイント | 全モジュール |

`parser` / `pattern` / `euclid` はブラウザ API 非依存の純粋モジュールで、Node 上で
テスト可能です(`tests/`)。

## AI 機能(任意)

画面上部の「APIキー」欄に Anthropic の API キー(`sk-ant-...`)を入れ、「AI指示」欄に方向性を
書いて各トラックの ✦AI を押すと、生成パターンがエディタに挿入されます(自動再生はしない
ステージング方式)。内容を確認して RUN で反映します。キーはこの端末の localStorage にのみ
保存され、`api.anthropic.com` へ直接送信されます。公開URLで運用する場合はサーバー側プロキシ
構成に変更してください。
