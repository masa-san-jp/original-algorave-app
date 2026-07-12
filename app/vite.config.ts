/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// この設定ファイルは Node 上で評価されるため process が使える(ブラウザ側 src/ には影響しない)。
// @types/node を入れると src/ に Node 型が混入するため、ここで局所宣言して回避する。
declare const process: { env: Record<string, string | undefined> };

// SINGLE=1 のときは JS/CSS をすべて 1 枚の index.html にインライン化する
// (ビルド不要・CDN不要で配布できる単一 HTML。`npm run build:single` → dist-single/index.html)。
// 未指定時は通常の分割ビルド(dist/。Cloudflare Pages 等の配信向け)。
const single = process.env.SINGLE === '1';

// 相対パス配信(サブパス配信対応 / 単純な静的サーバーで dist/ がそのまま動く)
export default defineConfig({
  base: './',
  plugins: single ? [viteSingleFile()] : [],
  build: {
    target: 'es2020',
    // 単一ファイル時はソースマップを外部に出さない(1枚に収めるため)
    sourcemap: !single,
    outDir: single ? 'dist-single' : 'dist',
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/parser.ts', 'src/pattern.ts', 'src/euclid.ts'],
      reporter: ['text', 'html'],
    },
  },
});
