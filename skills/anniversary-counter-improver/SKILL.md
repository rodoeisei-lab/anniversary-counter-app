---
name: anniversary-counter-improver
description: Use this skill when improving the anniversary counter app quickly. It gives a fast workflow for adding UI features, updating themes, and extending share/card behavior in this static HTML/CSS/JS codebase.
---

# Anniversary Counter Improver

このスキルは `anniversary-counter-app` を**スピード重視**で改善するときに使う。
対象は静的構成（`index.html` / `style.css` / `script.js` / `manifest.json`）。

## 使うタイミング
- 「新機能をすぐ追加したい」
- 「見た目を強化したい（テーマ、カード、レイアウト）」
- 「共有・画像生成・全画面表示まわりを拡張したい」
- 「入力フォーム項目を増やしたい」

## クイック手順
1. 要望を **UI変更 / データ変更 / 描画変更 / 共有変更** に分解する。  
2. 変更ファイルを最小セットで決める。  
   - UI構造: `index.html`
   - 見た目: `style.css`
   - 振る舞い/保存: `script.js`
   - PWAメタ情報: `manifest.json`
3. `script.js` では既存データ構造（`id/title/date/message/theme/createdAt/updatedAt`）との互換を維持する。  
4. カード表示・共有・画像生成の導線は壊さない（最低限、カードが描画される状態を維持）。
5. 仕上げに変更点を「何を変えたか / 影響範囲 / 使い方」で短く要約する。

## 実装ガイド

### 1) フォーム項目を追加する
- `index.html` に入力欄を追加
- `script.js` の保存・編集・描画ロジックへ同項目を反映
- 既存データに項目がない場合はデフォルト値で吸収（後方互換）

### 2) 新テーマを追加する
- `script.js` の `THEMES` 定義にテーマを追加
- `style.css` に対応する配色/装飾を追加
- テーマ選択UI（`index.html`）を更新

### 3) 共有体験を強化する
- 共有導線は `Web Share API` 優先
- 非対応環境では画像保存へフォールバック
- 文言は短く、スマホ画面で切れにくい長さにする

### 4) 画像生成を拡張する
- Canvas出力サイズは既存比率を基準に維持
- 可読性（文字色コントラスト）を優先
- 背景や装飾追加時もタイトル/日付/日数の視認性を最優先

## 変更の優先順位（迷ったら）
1. ユーザーが体感できる改善（入力→表示→共有の体験）
2. 既存データ互換性
3. コードの見通し
4. 細かい最適化

## 禁止・注意
- 外部依存を前提にしない（既存方針を維持）
- 無関係な大規模リファクタは避ける
- 既存の保存データを破壊する変更は避ける
