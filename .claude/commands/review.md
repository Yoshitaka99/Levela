---
description: 現在の変更差分をレビューし、バグ・規約違反・改善余地を指摘する。
---

# /review — 変更レビュー

現在の作業差分を品質ゲートとしてレビューします。

対象（未指定ならステージ済み＋未ステージの全差分）:
$ARGUMENTS

## 手順
1. `git diff` と `git diff --staged` で変更全体を把握する。
2. `CLAUDE.md` の成功条件と `.claude/rules/frontend.md`・`.claude/rules/backend.md` に照らす。
3. `reviewer` サブエージェントの観点で確認する:
   - 要求充足 / スコープ逸脱
   - 型安全・エラーハンドリング・null 安全
   - 既存挙動の破壊（リグレッション）
   - 秘密情報の混入・`.env` の扱い
   - 命名・構造の一貫性・不要コード
4. 必要なら `npm run lint` / `npm run build` を実行して裏付ける。

## 出力
```
## 概要
## 重大な指摘（必ず直す・path:line つき）
## 改善提案（任意）
## 判定（approve / request changes）
```
