#!/usr/bin/env bash
# Cloudflare Pages への簡易デプロイ・ラッパー(無料プラン想定)。
#
# 使い方:
#   PROJECT=my-site ./deploy.sh                 # dist/ を公開
#   PROJECT=my-site DIST=app/dist ./deploy.sh   # 出力先を指定
#   PROJECT=my-site BUILD="npm run build" ./deploy.sh   # 先にビルドも実行
#
# 認証(いずれか):
#   - CLOUDFLARE_API_TOKEN(+ 任意で CLOUDFLARE_ACCOUNT_ID)を環境変数で渡す
#     → ヘッドレス/CI 環境でもデプロイ可能
#   - 何も渡さない場合は wrangler の既存ログイン状態を使う(要 `wrangler login`)
set -euo pipefail

PROJECT="${PROJECT:-}"
DIST="${DIST:-dist}"
BRANCH="${BRANCH:-main}"
BUILD="${BUILD:-}"

if [ -z "$PROJECT" ]; then
  echo "ERROR: PROJECT is required. e.g. PROJECT=my-site ./deploy.sh" >&2
  exit 1
fi

# 任意: ビルドコマンドが指定されていれば先に実行
if [ -n "$BUILD" ]; then
  echo "==> building: $BUILD"
  eval "$BUILD"
fi

if [ ! -d "$DIST" ]; then
  echo "ERROR: build output directory '$DIST' not found. Build first or set DIST." >&2
  exit 1
fi

# 認証状態の案内(トークンが無く未ログインなら早めに気づけるように)
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "==> CLOUDFLARE_API_TOKEN not set; relying on existing 'wrangler login' session."
  echo "    (headless/CI environments should set CLOUDFLARE_API_TOKEN instead)"
fi

echo "==> deploying '$DIST' to Cloudflare Pages project '$PROJECT' (branch=$BRANCH)"
npx --yes wrangler pages deploy "$DIST" \
  --project-name="$PROJECT" \
  --branch="$BRANCH"
