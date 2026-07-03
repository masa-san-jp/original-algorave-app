# original-algorave-app

スマホ・ラップトップで演奏できるalgoraveアプリケーション。ターミナル形式で複数トラックを操作し、ミキシング・AI生成を行う。

## 構成
- `index.html` — アプリ本体(単一ファイル、ビルド不要、Tone.jsをCDN読み込み)
- `docs/` — 仕様書・セットアップ手順

## 起動方法
```bash
python3 -m http.server 8000
```
詳細は `docs/20260703-algorave-local-server-setup.md` を参照。
