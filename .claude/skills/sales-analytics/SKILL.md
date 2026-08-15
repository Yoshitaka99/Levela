---
name: sales-analytics
description: Levela営業ツール（app.levela.co.jp/sales）の営業数値を分析するスキル。着座率/成約率は顧客管理シート（既存ツールと同一定義）で、失注要因は商談録画の文字起こしとAI分析で集計し日本語で答える。「今週の失注要因は？」「○○さんのアポ分析」「着座率」「成約率」「担当別の商談数」「営業数値を調べて」「商談データ分析」「広告流入の分析」「sales-analytics」で発動。NOT for: 枠の空き予約操作（→slot-management-api）、アプリ本体の開発。
---

# sales-analytics

Levela営業の数値分析スキル。**2つのデータ源を用途で必ず使い分ける**。

| 用途 | データ源 | 手段 |
|---|---|---|
| **着座率・成約率・着座/成約/失注の「数」**（母数を伴う数値） | **顧客管理シート**（正本） | `scripts/sheet_metrics.py`（既存ツールと同一定義） |
| **失注「要因」の中身**（なぜ落ちたか） | **商談録画の文字起こし＋AI分析**（DB） | `scripts/query.sh`（読み取り専用SQL） |

- 着座率/成約率を**DBの `recordings_cache` だけで出してはいけない**。録画が無いアポを取りこぼし数値が実態とズレる（2026年6月の広告流入で DB着座=133 vs シート着座=205）。詳細・定義は `references/sheet.md`。
- DB: `recordings_cache` 約4,700件（商談録画）/ `analysis_results` 約5,600件（AI分析）。公開API `POST /sales/api/data/query`（AWSログイン不要・APIキーのみ・SELECT/WITHのみ）。
- メンバーマスタはGoogle Sheets由来。DBの `users` / `recordings_cache.assignee` に同期されているが表記揺れあり。

## 着座率/成約率はシートで出す（既存ツールと同一定義）

```bash
export GOG_ACCOUNT=meeting@levela.co.jp   # taichi トークンは invalid_grant になりがち
S=~/.claude/skills/sales-analytics/scripts/sheet_metrics.py

$S --month 2026-06 --source ad              # 広告流入(F列に'ad'含む)の着座率/成約率/失注数
$S --month 2026-06 --not-source ad          # 非広告(空/'-'除く)
$S --month 2026-06 --source ad --by-source     # 流入元別の内訳
$S --month 2026-06 --source ad --by-assignee   # 担当者別の内訳
$S --month 2026-06 --source ad --ids        # 対象の管理ID/Lステ顧客ID → 要因分析へ橋渡し
```

定義（`backend/api/assignee_dashboard.py` 準拠、スクリプトに実装済み）:
- **着座率 = 着座 ÷ 消化済み**（消化済みから 空/重複予約/直後キャンセル/リスケ/担当者変更/日程調整→返信なし を除外）
- **成約率(着金) = 着金成約(成約/予定→成約/保留→成約/ライフティ否決→成約) ÷ 着座**
- **成約率(見込) = (着金成約 + 成約予定) ÷ 着座**
- 列: B担当者 / D流入経路 / E面談日 / F流入(=広告判定) / G着席 / H結果。広告 = F列に `ad` を含む。

## 失注「要因」は文字起こしとAI分析だけを根拠にする

- **シートのQ列「失注理由」/ S列「失注理由詳細」は手入力で当てにならない → 使わない**（集計にも示唆出しにも）。
- 要因は **`recordings_cache.transcript_text`（文字起こし全文）** と、そこからAIが生成した
  **`analysis_results` の `root_cause` / `summary` / `improvement_points` / `detailed_feedback` /
  `hearing_feedback` / `closing_feedback`** などのテキストだけを読んでパターン化する。
- 録画が無い失注はDBに無い＝要因分析は「録画があった失注」のサンプルに限られる。
  **母数の数値は必ずシート**、要因の中身はDBのテキスト、と切り分けて回答する。

## ワークフロー

1. **問いを具体化**（期間・対象者・指標が曖昧なら1つだけ確認。例:「今週」=直近7日でよいか）
2. **スキーマ確認** … 列名は `references/schema.md` を正とする。不安なら `scripts/query.sh` で `information_schema` を引くか、`GET /api/data/schema` を叩く
3. **SQLに翻訳** … 下記「データの読み方」の落とし穴を踏まえる
4. **実行** … `scripts/query.sh "<SQL>"`（長いSQLは標準入力: `echo "..." | scripts/query.sh`）
5. **日本語で回答** … 数値＋示唆。必要なら表で。件数が大きい時は `truncated:true` を確認

```bash
# 例
~/.claude/skills/sales-analytics/scripts/query.sh \
  "SELECT assignee, count(*) FROM recordings_cache WHERE result_status LIKE '%失注%' AND start_time >= now() - interval '7 days' GROUP BY assignee ORDER BY 2 DESC"
```

## データの読み方（⚠️ 実データに基づく重要な注意）

### 成約/失注の判定は2系統あり、用途で使い分ける
- **`recordings_cache.result_status`（構造化・推奨）** … 人手/シート由来で比較的整っている。
  実値例: `失注`(899) / `成約`(445) / `保留→失注`(418) / `成約予定→失注`(173) / `成約予定（契あり）` / `クーリングオフ` / `MLM失注` / `ライフティ否決→失注` など。
  → **失注の総数は `result_status LIKE '%失注%'`**（`失注`単独だけでなく `〜→失注` も拾う）。成約は `LIKE '%成約%' AND result_status NOT LIKE '%失注%'` のように注意。
- **`analysis_results.closing_result`（AI生成・乱れている）** … 56種の表記揺れ（`保留`/`失注`/`成約予定`/`成約`/`該当なし`/`分析不能`…）。集計の主キーには不向き。**根本原因の文章 `root_cause` や `summary` を読む用途**に使う。

### アポの着座/キャンセル
- **`recordings_cache.cancel_status`** … `着座`(2678) / `事前キャンセル` / `飛び`(無断) / `重複予約` / `日程調整→返信なし` / `担当者変更` など。
  → **着座率** = `着座` ÷ (有効アポ)。`飛び`+`事前キャンセル` が離脱。`null`/空文字は未設定。

### 評価
- **`analysis_results.overall_rating`** = `A`/`B`/`C`/`D`（A=良）。`N/A`等の非評価値あり。

### 失注の「要因」を出すには（文字起こし／AI分析のみ）
- 構造で母集団を絞る（`recordings_cache.result_status LIKE '%失注%'`）→ `analysis_results` をJOINし、
  `root_cause`（根本原因の文章）/ `improvement_points` / `detailed_feedback` / `hearing_feedback` /
  `closing_feedback` のテキスト、必要なら `transcript_text`（文字起こし全文）を集める
  → Claudeが文章を読んでパターン化する。
- ⚠️ **シートのQ列「失注理由」は使わない**（手入力で不正確）。要因は文字起こしとそのAI分析だけを根拠にする。
- ⚠️ `analysis_results` は録画あたり複数行ありうる。最新に絞るなら `DISTINCT ON (recording_id) ... ORDER BY recording_id, created_at DESC`。
- `issues_heard`(text[]) は補助。使うなら `unnest(...)` で頻度集計するが、細粒度で散りやすいので主軸にしない。

### 担当者
- `recordings_cache.assignee`（表示名文字列）で集計するのが手早い。`users` とJOINするなら表記揺れに注意。
- 営業担当のみに絞るなら `users.is_active_sales = true` / 管理職除外は `role` を見る（`member`が一般営業、`eigyo_mg`/`eigyo_tokatsu`/`unei`等が管理系）。

### 日付・タイムゾーン
- 時刻は `timestamptz`。「今週」「今月」は `start_time >= date_trunc('week'|'month', now())`、「直近N日」は `now() - interval 'N days'`。

## よく使うレシピ

数値（着座率/成約率/件数）はシート＝`sheet_metrics.py` で出す（前述）。以下のSQLは**失注要因の中身を読む用途**。

```sql
-- 失注の root_cause 等を集める（録画あたり最新の分析に絞る／Claudeが読んでパターン化）
SELECT r.assignee, a.root_cause, a.summary, a.improvement_points
FROM recordings_cache r
JOIN LATERAL (
  SELECT * FROM analysis_results a2
  WHERE a2.recording_id = r.id ORDER BY a2.created_at DESC LIMIT 1
) a ON true
WHERE r.result_status LIKE '%失注%' AND r.start_time >= now() - interval '30 days'
ORDER BY r.start_time DESC;

-- 失注商談の質指標（評価・ヒアリング深度・トーク比率）を要因分析の補助に
SELECT count(*) AS lost,
       round(avg(a.talk_ratio_sales)) AS avg_sales_talk,
       round(avg(a.hearing_depth_score),1) AS avg_hearing,
       count(*) FILTER (WHERE a.overall_rating IN ('C','D')) AS low_rating
FROM recordings_cache r
JOIN LATERAL (SELECT * FROM analysis_results a2 WHERE a2.recording_id=r.id
              ORDER BY a2.created_at DESC LIMIT 1) a ON true
WHERE r.result_status LIKE '%失注%' AND r.start_time >= now() - interval '30 days';

-- 特定の失注商談の文字起こしを読む（管理ID/customer等で絞り込んでから）
SELECT r.transcript_text
FROM recordings_cache r
WHERE r.result_status LIKE '%失注%' AND r.assignee = '氏名'
ORDER BY r.start_time DESC LIMIT 5;
```

## API直叩き（スクリプトを使わない場合）

```bash
KEY=18dff294e24a660166dd6e9d15b42b92aa08e23e491d1acd50261f59f4ebc821
# スキーマ（ブラウザでも開ける）
curl "https://app.levela.co.jp/sales/api/data/schema?api_key=$KEY"
# クエリ
curl -X POST "https://app.levela.co.jp/sales/api/data/query" \
  -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"sql":"SELECT ...","limit":1000}'
```

レスポンス: `{columns, row_count, truncated, rows}`。`truncated:true` は `limit`(既定1000/上限10000)で打ち切り。

## 制約・安全
- **読み取り専用**: `SELECT`/`WITH` 単一文のみ。書き込み・DDL・複数文(`;`)・15秒超は拒否される。
- **PII注意**: `transcript_text`(文字起こし全文)・`customer_name`・`users.email`/`password_hash`・各種`*_token`が物理的には取得可。**分析に不要な機微列はSELECTしない**こと。回答に顧客個人名や生トークンを不用意に貼らない。
- APIキーは本番共有キー。漏洩時はEC2 `zoom-web-dedicated`(i-04fc) の `.env` の `INTERNAL_API_KEY` を差し替えて `systemctl restart sales-backend`。

## 参照
- `references/schema.md` … 全26テーブルの列定義（本番実スキーマのスナップショット）
- API仕様の正本: zoom-web リポジトリ `docs/data-api.md`
