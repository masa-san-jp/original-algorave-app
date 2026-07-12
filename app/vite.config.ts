/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `--mode single`(= `npm run build:single`)のときは JS/CSS をすべて 1 枚の
// index.html にインライン化する(ビルド不要・CDN不要で配布できる単一 HTML → dist-single/)。
// mode 判定なのでシェル差異(Windows cmd.exe 等)に依存しない。
// 未指定時は通常の分割ビルド(dist/。Cloudflare Pages 等の配信向け)。
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    // 相対パス配信(サブパス配信対応 / 単純な静的サーバーで dist/ がそのまま動く)
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
  };
});
