---
name: cloudflare-deploy
description: >-
  Deploy a static site / built front-end (Vite, plain HTML, SPA, etc.) to
  Cloudflare Pages on the free plan. Use when the user wants to publish, host,
  or "put online" a static build, get a shareable *.pages.dev URL, set up
  continuous deploys from GitHub, or troubleshoot a Cloudflare Pages deploy.
  Covers the one-shot wrangler CLI path, the GitHub Actions path, and the
  dashboard Git-integration path, plus how to get an API token / account ID.
---

# Cloudflare Pages 簡易デプロイ(無料)

静的サイト・ビルド済みフロントエンド(Vite / 素のHTML / SPA など)を **Cloudflare Pages の無料プラン**で公開するための手順集。`dist/` のような静的成果物さえあれば、独自ドメイン無しでも `https://<project>.pages.dev` で即公開できる。

## 無料枠の要点(2026時点の目安)

- 静的アセットの配信は **帯域・リクエスト無制限**。
- ビルドは **月500回**まで(GitHub連携/ダッシュボードビルド利用時)。CLIから既製の `dist/` を上げる場合はこのビルド枠を消費しない。
- 独自ドメイン・SSL・プレビューデプロイも無料。
- クレジットカード登録不要でアカウント作成可能。

## 方式の選び方

| 方式 | 向いている場面 | CI/シークレット | 手間 |
|---|---|---|---|
| **A. wrangler CLI 直接** | 今すぐ手元から1回公開したい / 手動運用 | 不要(ブラウザログイン) | 最小 |
| **B. ダッシュボード Git 連携** | GitHubにpushしたら自動公開。Actions定義不要 | 不要 | 小(初回のみUI設定) |
| **C. GitHub Actions + wrangler-action** | リポジトリ内で完結する自動デプロイをコード管理したい | GitHub Secrets 2つ | 中 |

迷ったら:**今すぐ出す → A**、**継続的に自動 → B**(最も手軽)か **C**(構成をコード管理したいなら)。

---

## 前提

- ビルド成果物ディレクトリがある(例: Vite なら `npm run build` で `dist/`)。相対パス配信にしておくと `pages.dev` のルートでもサブパスでも動く。Vite なら `vite.config.ts` に `base: './'`。
- Cloudflare の無料アカウント(https://dash.cloudflare.com/sign-up)。

---

## A. wrangler CLI で今すぐ公開(最速)

```bash
# 1) ビルド
npm run build            # → dist/ ができる

# 2) ログイン(ブラウザが開き OAuth 認証。ローカルのブラウザがある環境で実行)
npx wrangler login

# 3) デプロイ(初回に project が無ければ作成するか聞かれる/自動作成される)
npx wrangler pages deploy dist --project-name=<プロジェクト名>
```

- 出力の `https://<project>.pages.dev` が公開URL。以後 `wrangler pages deploy dist ...` を再実行するたびに更新される。
- **ヘッドレス環境(CI・リモートコンテナ・ブラウザ無し)では `wrangler login` の OAuth ができない。** その場合は API トークンを使う(下記「API トークン方式」)。

### API トークン方式(ブラウザログイン無しでCLIデプロイ)

```bash
export CLOUDFLARE_API_TOKEN=<発行したトークン>
export CLOUDFLARE_ACCOUNT_ID=<アカウントID>
npx wrangler pages deploy dist --project-name=<プロジェクト名> --branch=main
```

トークン・アカウントIDの取り方は末尾「認証情報の取得」を参照。

---

## B. ダッシュボード Git 連携(Actions 不要・最も手軽な自動化)

1. Cloudflare ダッシュボード → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
2. GitHub 連携を許可し、対象リポジトリを選択。
3. ビルド設定:
   - **Framework preset**: なし(または Vite)
   - **Build command**: リポジトリ構成に合わせる。例(アプリが `app/` サブディレクトリの場合):
     `cd app && npm ci && npm run build`
   - **Build output directory**: `app/dist`(ルート直下なら `dist`)
4. Save and Deploy。以後、対象ブランチへ push するたびに自動ビルド&公開。プレビューデプロイ(PRごとの一時URL)も自動で付く。

> サブディレクトリ運用の注意: build output directory はリポジトリルートからの相対。`app/dist` のように親を含めて指定する。あるいは **Root directory** をサブディレクトリ(例 `app`)に設定し、そこに `wrangler.toml`(`pages_build_output_dir = "./dist"`)を置けば、出力先とプロジェクト名が設定ファイルで宣言され、ダッシュボードUIの値とブレない(このリポジトリは `app/wrangler.toml` を採用)。

---

## C. GitHub Actions + wrangler-action(構成をコード管理)

`.github/workflows/cloudflare-pages.yml`(このリポジトリに実例あり):

```yaml
name: Deploy to Cloudflare Pages
on:
  push:
    branches: ['main']
    paths: ['app/**', '.github/workflows/cloudflare-pages.yml']
  workflow_dispatch:
permissions:
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: app       # サブディレクトリなら指定。ルートなら削除
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: app/package-lock.json
      - run: npm ci
      - run: npm run build           # lint/test を挟むならこの前に足す
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: app
          command: pages deploy dist --project-name=<プロジェクト名> --branch=main
```

セットアップ:
1. 下記「認証情報の取得」で **API トークン**と**アカウントID**を用意。
2. 一度だけ Pages プロジェクトを作成:
   `npx wrangler pages project create <プロジェクト名> --production-branch=main`
   (またはダッシュボードの Direct Upload で同名プロジェクトを作成)
3. GitHub リポジトリ → **Settings → Secrets and variables → Actions → New repository secret**:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. `main` に push、または Actions タブから対象workflowを **Run workflow / Re-run**。

> 旧 `cloudflare/pages-action` は非推奨。現行は `cloudflare/wrangler-action@v3` の `pages deploy`。

---

## 認証情報の取得

### API トークン

1. Cloudflare ダッシュボード右上のアイコン → **My Profile** → **API Tokens** → **Create Token**。
2. テンプレート **「Cloudflare Pages : Edit」** を選ぶ(または Custom で Account 権限に `Cloudflare Pages: Edit` を付与)。
3. 作成 → 表示されたトークン文字列を控える(**再表示不可**。無くしたら作り直し)。
4. 漏洩時・不要時は同画面から **Roll**(再生成)/ **Delete** で失効できる。トークンは秘密情報なので、チャットやコミットに貼らない。

### アカウント ID

- ダッシュボード → **Workers & Pages** を開くと右側サイドバーに **Account ID** が表示される。コピーする。
- または任意のゾーン概要ページ右下の「API」欄にも表示される。

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| `You are not authenticated. Please run wrangler login` | トークン/ログイン無し | `CLOUDFLARE_API_TOKEN` を設定するか `wrangler login`(ブラウザ環境) |
| Actions の deploy ステップで `Authentication error [code: 10000]` | トークン権限不足 or アカウントID不一致 | トークンに `Cloudflare Pages: Edit`、`CLOUDFLARE_ACCOUNT_ID` が正しいか確認 |
| `Project not found` | プロジェクト未作成 | `wrangler pages project create <名前>` で先に作成 |
| 公開されたがアセットが404(白画面/CSS欠け) | 絶対パス参照でサブパス不一致 | ビルドを相対パス化(Vite: `base: './'`)して再デプロイ |
| ヘッドレス環境で `wrangler login` が進まない | OAuthにブラウザが必要 | API トークン方式に切り替える |
| ビルド回数の上限が近い | 月500ビルド枠 | CLIで既製 `dist/` を上げる(ビルド枠を使わない)/不要な自動ビルドを `paths` で絞る |

---

## クイックリファレンス

```bash
# 最速の1回公開(ローカル・ブラウザあり)
npm run build && npx wrangler login && npx wrangler pages deploy dist --project-name=my-site

# トークン方式(ヘッドレス/CI)
CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=yyy \
  npx wrangler pages deploy dist --project-name=my-site --branch=main

# プロジェクト作成(初回のみ)
npx wrangler pages project create my-site --production-branch=main

# デプロイ一覧
npx wrangler pages deployment list --project-name=my-site
```
