import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor 設定。ビルド済みの Web 版(dist/)を iOS/Android アプリに内包する。
// ネイティブプロジェクト(ios/ android/)は各自の Mac / Android SDK 環境で
// `npx cap add ios` / `npx cap add android` で生成する(リポジトリには含めない)。
// 手順は docs/20260712-native-app-roadmap.md の「フェーズ2」を参照。
const config: CapacitorConfig = {
  appId: 'com.algorave.terminals',
  appName: 'Algorave Terminals',
  webDir: 'dist',
};

export default config;
