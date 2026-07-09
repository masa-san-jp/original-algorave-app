# original-algorave-app

スマホ・ラップトップで演奏できるalgoraveアプリケーション。ターミナル形式で複数トラックを操作し、ミキシング・AI生成を行う。

## 公開版

`main` への push で `app/` が自動ビルド・公開されます。GitHub Pages と Cloudflare Pages の両方に対応しています(片方だけ使ってもOK)。

### Cloudflare Pages 👉 https://original-algorave-app.pages.dev

**方法1: Git 連携(推奨・git push だけで公開。GitHub Actions もシークレットも不要)**
1. Cloudflare ダッシュボード → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** で本リポジトリを接続。
2. ビルド設定(`app/wrangler.toml` に合わせる):
   - **Root directory**: `app`
   - **Build command**: `npm ci && npm run build`
   - **Build output directory**: `dist`(= `app/wrangler.toml` の `pages_build_output_dir`)
3. Save and Deploy。以後 `main`(や任意のブランチ)へ push するたびに Cloudflare が自動でビルド&公開します。PR ごとのプレビューURLも自動生成。

**方法2: GitHub Actions(構成をコードで管理したい場合)**
[deploy workflow](.github/workflows/cloudflare-pages.yml) を用意済み。GitHub の **Settings → Secrets and variables → Actions** に `CLOUDFLARE_API_TOKEN`(「Cloudflare Pages : Edit」権限)と `CLOUDFLARE_ACCOUNT_ID` を登録し、初回のみ Pages プロジェクト(名前 `original-algorave-app`)を作成すれば、push で自動デプロイされます。

> 方法1と方法2は排他です。Git 連携(方法1)を使う場合、二重デプロイを避けるため Actions 側の cloudflare-pages workflow は無効化(または削除)してかまいません。

### GitHub Pages 👉 https://masa-san-jp.github.io/original-algorave-app/
[deploy workflow](.github/workflows/deploy.yml)。初回のみ **Settings → Pages → Source** を「GitHub Actions」にする必要があります。

> 📦 Cloudflare Pages の無料デプロイ手順は再利用可能な Claude Code スキルにまとめてあります: [`.claude/skills/cloudflare-deploy/`](.claude/skills/cloudflare-deploy/SKILL.md)(CLI直接 / GitHub Actions / ダッシュボードGit連携の3方式、API トークン取得、ワンコマンド公開スクリプト付き)。`/cloudflare-deploy` で呼び出せます。

## 構成
- `app/` — **v1 実装本体**(TypeScript + Vite + Tone.js、テスト・CI付き)。詳細は [`app/README.md`](app/README.md)
- `index.html` — 着想元の参照プロトタイプ(単一ファイル、ビルド不要、Tone.jsをCDN読み込み)
- `docs/` — 仕様書・セットアップ手順

## v1 のクイックスタート
```bash
cd app && npm install && npm run dev
```

## v1 発注仕様書(外注実装用)
| 文書 | 内容 |
|---|---|
| [機能仕様書](docs/20260703-algorave-v1-external-spec.md) | 機能要件・UI・音源・AI連携・非機能要件・納品物・検収条件 |
| [記法仕様書](docs/20260703-algorave-v1-notation-spec.md) | Strudel/TidalCycles互換ミニノーテーションのEBNF・意味論・ゴールデンテストベクタ |
| [受け入れテスト仕様書](docs/20260703-algorave-v1-acceptance.md) | 検収条件・環境マトリクス・テストケース |
| [実装計画書](docs/20260703-algorave-v1-plan.md) | マイルストーン・WBS・リスク・変更管理 |
| [既存ソフトウェアとの比較検討](docs/20260705-algorave-landscape-comparison.md) | TidalCycles・Strudel・Sonic Pi等との比較、記法互換性の再検証、本アプリ独自の価値の整理 |
| [追補: STEPモード + ループ進行プレイヘッド + ベース/パッド/ARP/サンプラー](docs/20260705-algorave-v1-addendum-sequencer.md) | 視覚的ステップシーケンサー(FR-13)・BPM連動プレイヘッド(FR-14)・ベース/シンセパッド(FR-15)・アルペジエイター(FR-16)・サンプラー(FR-17)の追加仕様 |

## 起動方法
```bash
python3 -m http.server 8000
```
詳細は `docs/20260703-algorave-local-server-setup.md` を参照。
