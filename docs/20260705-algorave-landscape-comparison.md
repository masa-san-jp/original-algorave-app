# Algorave Terminals — 既存ライブコーディング音楽ソフトウェアとの比較検討

作成日: 2026-07-05
版数: 1.0

本アプリ(Algorave Terminals)の設計判断を、既存のalgorave/ライブコーディング音楽ソフトウェア・フレームワークと突き合わせて検証する。目的は「車輪の再発明をしていないか」「乗り換え互換性の主張が妥当か」「本アプリ固有の価値はどこにあるか」を明確にすること。

## 1. 比較対象一覧

| 名称 | 系統 | 言語/エンジン | 配布形態 | ブラウザ完結 | モバイル対応 | 主な用途 |
|---|---|---|---|---|---|---|
| **TidalCycles** | Uzu系(パターン言語の源流) | Haskell、音は SuperCollider(SuperDirt)経由 | デスクトップインストール必須(GHC+SuperCollider) | ✕ | ✕ | algorave・上級者向けライブコーディング |
| **Strudel** | Uzu系(TidalのJS移植) | JavaScript(Web Audio) | npm/CDN、ブラウザREPL | ○ | △(操作可能だがPC前提UI) | ブラウザ完結のTidal体験・教育 |
| **Sonic Pi** | 独自(教育発) | Ruby DSL、音は SuperCollider | デスクトップインストール必須 | ✕ | ✕ | 音楽教育(元Raspberry Pi向け)〜プロのalgorave |
| **FoxDot** | 独自 | Python、音は SuperCollider | デスクトップインストール必須 | ✕ | ✕ | Python学習者向けライブコーディング |
| **Gibber** | 独自 | JavaScript(Web Audio) | ブラウザ完結 | ○ | △ | オーディオビジュアル統合のクリエイティブコーディング |
| **Sardine** | 独自 | Python 3.10+、OSC/MIDI/SuperDirt | デスクトップインストール必須 | ✕ | ✕ | Pythonを楽器化する上級者向けフレームワーク |
| **UrMus**(研究) | 独自 | 専用言語 | モバイル専用(iOS/Android) | ✕ | ◎ | モバイル専用ライブコーディング楽器の学術研究(2013年頃) |
| **Sema**(研究) | 独自 | ミニ言語群(ブラウザ) | ブラウザ | ○ | △ | ライブコーディング×機械学習のプロトタイピング基盤 |
| **Modal app** | ハードウェア連携 | ジェスチャーUI(非コード) | モバイルアプリ | ✕ | ◎ | シンセ操作アプリ(コードを書く形式ではない) |
| **Algorave Terminals(本アプリ)** | Strudel/Tidal互換サブセット | TypeScript、Tone.js(Web Audio) | ブラウザ完結・単一静的ファイル | ○ | ◎(A/Bタブ専用UI) | スマホ実演を第一級の使用形態とするライブコーディング |

## 2. アーキテクチャ上の位置づけ

既存勢力図は大きく2系統に分かれる。

- **デスクトップ完結・重量級シンセエンジン系**(TidalCycles / Sonic Pi / FoxDot / Sardine): いずれも SuperCollider(またはそれに準ずる音響エンジン)を裏側に必要とし、インストール・設定コストが高い。表現力・音色の自由度は最大だが、「スマホでその場に取り出して演奏する」用途には向かない。
- **ブラウザ完結・軽量系**(Strudel / Gibber / Sema): インストール不要という点で本アプリと同じ方向性。ただしいずれも**PCでの操作を主眼にしたUI**(コードエディタ+REPL)であり、モバイル最適化されたレイアウト(大型タブ、片手操作を想定したボタン配置)は持たない。

本アプリは「ブラウザ完結・軽量系」に属し、かつ**モバイルを一級市民として設計した点**で上記のどれとも異なる。UrMus(2013年、学術研究)は同じ問題意識でモバイル専用の独自言語を作ったが、汎用言語であるがゆえに学習コストが高く、実演文化としては定着していない。本アプリは「PCでもスマホでも同一記法・同一コード資産で演奏できる」という一段強い互換性を狙っている点で差別化されている。

## 3. 記法(ミニノーテーション)の互換性再検証

記法仕様書(`20260703-algorave-v1-notation-spec.md`)は Strudel のミニノーテーションを参照実装として設計したが、実際の Strudel 仕様と突き合わせた結果は以下の通り。

### 3.1 一致が確認できた要素

`~`(休符)、`[a b]`(細分化)、`<a b>`(交替)、`*n`(高速化)、`/n`(減速)、`(k,n,r)`(ユークリッドリズム、offset含む)、`,`(スタック)は Strudel のミニノーテーションと概念・記号ともに一致している。**乗り換え時にそのまま通用する**という本アプリの主張は妥当と確認できた。

### 3.2 Strudel にあり本アプリでスコープ外とした要素(再確認)

| Strudel記法 | 内容 | 本アプリの扱い |
|---|---|---|
| `{a b c, d e}` ポリメーター | 同じステップ速度で異なる周期のパターンを重ねる(3ステップと2ステップが6ステップごとに一致する、等) | 記法仕様書で E-03(未対応の記法)として明示済み。妥当な判断(実装コストの割に初学者の混乱要因になりやすい) |
| `bd:3` サンプル番号選択(`:n`、0始まり、範囲外はmodulo) | 同一音色内のバリエーション選択 | 本アプリはサンプル読み込みをスコープ外としており(シンセ生成のみ)、`:n` も自然にスコープ外。将来サンプル対応する際は同じ`:n`記法を採用するのが乗り換え互換上望ましい(v2バックログに追記推奨) |
| `.fast()` `.slow()` `.lpf()` 等の関数チェーンAPI | ミニノーテーション文字列の外側で行うパターン変形 | 本アプリはミニノーテーション文字列のみ対応(単一入力欄の設計と矛盾するため意図的にスコープ外) |

この再検証により、記法仕様書 §9(移行対応表)の内容は実際の Strudel 仕様と齟齬がないことを確認した。追記すべき点として、`:n` は「サンプル対応時に備えて記法だけ予約しておく」ことを v2 検討事項に追加する価値がある。

### 3.3 本アプリ独自の拡張

`!n`(複製)と `@n`(重み)は Tidal/Strudel 由来の記法として存在するが、本アプリはこれを**必須のゴールデンテストベクタ**として仕様に組み込んでいる点で、記法カバレッジの検証密度は既存OSSのドキュメントより高い(§8 参照)。

## 4. モバイル対応の比較

| | PC操作前提 | タッチ最適化 | 「片方を鳴らしながらもう片方を書き換える」導線 |
|---|---|---|---|
| TidalCycles/Sonic Pi/FoxDot/Sardine | ✅(前提) | ✕ | ✕(インストール必須のため実質PCのみ) |
| Strudel/Gibber | ✅(前提、モバイルブラウザでも動くが最適化なし) | △(標準テキストエリアのみ) | ✕ |
| UrMus(2013研究) | ✕ | ◎(専用UI) | 研究次第(汎用言語ゆえパターン限定なし) |
| **本アプリ** | — | ◎(大型タブ、760px境界のレスポンシブ切替) | ◎(FR-09で明示要件化。既存OSSに同等の一級機能は確認できず) |

既存の「ブラウザ完結・軽量系」がスマホでの操作性を作り込んでいない一方、本アプリはスマホでのA/B奏法を機能要件(FR-09)として明文化・受け入れテスト化(T-40〜43)している。ここが本アプリの最も具体的な差別化ポイントであり、既存ソフトウェアの後追いではなく空白領域を埋める設計であることが確認できた。

## 5. AI機能の比較

Strudelコミュニティ内でも「LLMにミニノーテーションのパターンを生成させる」実践事例(個人ブログ記事、Claude Code向けの非公式スキル等)は存在するが、これらは**エディタ外のツール/スクリプトとして後付けで使う運用**が中心であり、アプリ本体に「ステージング(提案→人間がRUNで確認して初めて音に反映)」という安全機構が組み込まれている例は確認できなかった。

本アプリの AI 設計判断(機能仕様書 §9、FR-10)——生成結果をエディタに挿入するのみで自動再生しない——は、ライブパフォーマンス中の事故防止という観点で既存事例より一歩踏み込んだ設計と言える。他トラックのパターンをAIの文脈に含める設計(アンサンブル提案)も、調査した範囲の既存ツールには同等機能が見当たらず独自性がある。

## 6. 結論と示唆

1. **記法の乗り換え互換性の主張は妥当**。Strudel/Tidalのミニノーテーション中核要素と一致しており、スコープ外項目も明示的にエラーで案内する設計のため「黙って動作が変わる」事故が起きない。
2. **モバイルA/B奏法とAIステージング機構が本アプリの独自価値**であり、既存の主要フレームワーク(デスクトップ完結・重量級エンジン系)にも、ブラウザ完結の先行例(Strudel/Gibber)にも同等機能は見当たらない。「後追い実装」ではなく空白を埋める設計判断だったと確認できた。
3. **将来の拡張時の指針**: サンプル音源対応(v2バックログ)を行う際は Strudel の `:n` 記法をそのまま採用し、互換性の一貫性を保つこと。ポリメーター `{}` は初学者への影響を再検討した上で v2 以降で判断する。
4. **リスク**: Strudel本体は活発に開発が続いており(2026年時点でも国際アルファベット対応など機能追加が継続)、本アプリの記法サブセットは今後もStrudelの変更を定期的に追跡し、スコープ外リスト(記法仕様書 §9)を年1回程度棚卸しすることが望ましい。

## 出典

- [Live code with Tidal Cycles](https://tidalcycles.org/)
- [TidalCycles - Wikipedia](https://en.wikipedia.org/wiki/TidalCycles)
- [Strudel REPL](https://strudel.cc/)
- [Mini Notation 🚀 Strudel](https://strudel.cc/learn/mini-notation/)
- [Technical Manual · tidalcycles/strudel Wiki](https://github.com/tidalcycles/strudel/wiki/Technical-Manual)
- [Sonic Pi - The Live Coding Music Synth for Everyone](https://sonic-pi.net/)
- [Sonic Pi - Wikipedia](https://en.wikipedia.org/wiki/Sonic_Pi)
- [FoxDot | Home](https://foxdot.org/)
- [Sardine — Python Live Coding Music Library](https://open-awesome.com/projects/sardine)
- [awesome-live-coding-music (pjagielski)](https://github.com/pjagielski/awesome-live-coding-music)
- [Algorave - Wikipedia](https://en.wikipedia.org/wiki/Algorave)
- [UrMus: Live coding on a mobile phone – TOPLAP](https://blog.toplap.org/2013/04/15/urmus/)
- [Sema – A Playground for Live Coding Music and Machine Learning](https://github.com/mimic-sussex/sema)
- [MODAL APP - Modal Electronics](https://modalelectronics.com/modal-app/)
- [Creating Strudel Live Coding Patterns with AI](https://nicholasgriffin.dev/blog/creating-strudel-live-coding-patterns-with-ai/)
