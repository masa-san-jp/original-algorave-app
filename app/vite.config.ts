/// <reference types="vitest" />
import { defineConfig } from 'vite';

// 相対パス配信(サブパス配信対応 / 単純な静的サーバーで dist/ がそのまま動く)
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    sourcemap: true,
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
