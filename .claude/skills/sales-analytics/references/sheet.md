# 顧客管理シート（着座率/成約率の正本）

着座率・成約率・着座数・成約数・失注数といった**母数を伴う数値は、必ずこのシート基準で出す**。
理由: DB `recordings_cache` は「商談録画があるアポ」しか持たず着座を取りこぼす
（2026年6月の広告流入で DB着座=133 に対しシート着座=205）。
既存の分析ツール（zoom-web `backend/api/assignee_dashboard.py`）も、このシートを正本に集計している。

- スプレッドシート: `1kkL_gysoXKq0Kh8ttFeMmG6pljzv1iwum2k2DxvJ96s`
- ワークシート: **「顧客管理」**（gid=2051214579, 約16,500行）
- **ヘッダーは行2、データは行3〜**（行1は注意書き）
- 取得は `gog`。`meeting@levela.co.jp` は read 可（`taichi` トークンは invalid_grant になりがち）

## 列マッピング（ヘッダー行=行2）

| 列 | 見出し | 用途 |
|---|---|---|
| A | お客様名 | PII。**集計に不要なら取得しない** |
| B | 担当者名 | 担当者別集計のキー |
| C | セミナー | — |
| **D** | **流入経路** | 流入の大分類 |
| **E** | **面談日** | 例 `2026年6月26日(金) 13:00～14:30`。月絞りは部分一致 `2026年6月` |
| **F** | **流入** | DBの `source` に対応。**広告 = `ad` を含む**（`Meta_ad`/`x_ad-aw`/`meta_ad_Suea_aw`/`meta_ad_in-house_aw`/`meta_ad`/`ad_01` 等。`media_panda` 等は誤マッチしない） |
| **G** | **着席** | 着座ステータス（下表） |
| **H** | **2回目/実施後ステータス** | 結果ステータス（下表） |
| Q | 失注理由 | **使用禁止**（後述） |
| S | 失注理由詳細 | **使用禁止**（後述） |
| X | 管理ID | DB橋渡し用 |
| Y | Lステ顧客ID | DB橋渡し用 |

## 指標の定義（ツール準拠・厳守）

`backend/api/assignee_dashboard.py` の判定集合と完全一致させる。`scripts/sheet_metrics.py` に実装済み。

- **着座率 = 着座(G=`着座`) ÷ 消化済み**
  - 消化済み = G列が次の **EXCLUDE_FROM_COMPLETED 以外**: `""` / `重複予約` / `直後キャンセル` / `リスケ/再日程調整中` / `担当者変更` / `日程調整→返信なし`
- **成約率(着金) = 着金成約 ÷ 着座**
  - 着金成約 CLOSED_PAID = `成約` / `予定→成約` / `保留→成約` / `ライフティ否決→成約`
- **成約率(着地見込) = (着金成約 + 成約予定) ÷ 着座**
  - 成約予定 CLOSED_PENDING = `成約予定（契あり）` / `成約予定（ライフティ）`
- **失注**: 集計用の最小集合 LOST = `失注` / `MLM失注`。
  失注の全体像を見るときは `保留→失注` `成約予定→失注` `ライフティ否決→失注` も合算（スクリプトの `lost_total`）。

## ⚠️ 失注「理由」はシートの Q/S 列を使わない

Q列「失注理由」・S列「失注理由詳細」は手入力で信頼できないため**集計にも示唆出しにも使わない**。
失注要因は **実際の文字起こし（DB `recordings_cache.transcript_text`）と、そこからAIが生成した分析
（DB `analysis_results` の `root_cause` / `summary` / `improvement_points` / `detailed_feedback` /
`hearing_feedback` / `closing_feedback` など）だけ**を根拠にする。

### シート → DB の橋渡し
1. `sheet_metrics.py --month YYYY-MM --source ad --ids` で対象行の **管理ID(X) / Lステ顧客ID(Y)** を取得。
2. DB側で当該商談の `analysis_results.root_cause` 等、必要なら `transcript_text` を引いて要因を読む。
   - DBとシートの突合キーは customer/assignee/日付や管理ID。録画が無い商談はDBに無い点に留意
     （＝要因分析は「録画があった失注」のサンプルに限られる。母数の数値はあくまでシート）。
