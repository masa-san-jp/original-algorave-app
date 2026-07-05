# original-algorave-app

スマホ・ラップトップで演奏できるalgoraveアプリケーション。ターミナル形式で複数トラックを操作し、ミキシング・AI生成を行う。

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
