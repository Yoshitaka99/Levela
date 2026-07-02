# 虚偽報告チェック Web App 中継 (Apps Script)

`/false-report-checker` の書き込み操作を軽量版シートへ中継する Web App。

- スクリプトID: `14gxhwjnSQS879VS9ORW8nqo2i6p2JU-G6Af2KtY9nM6K15okzqA0aFAh`
- エディタ: https://script.google.com/d/14gxhwjnSQS879VS9ORW8nqo2i6p2JU-G6Af2KtY9nM6K15okzqA0aFAh/edit
- 対象シート: 軽量版シート `1npumMCuzudexL9ZE4jr8tTMRh9j23eKXOatAqQ71uiY` のみ
- **大元の顧客管理シート (`1kkL_...`) には絶対に書き込まない。**
- ルートの `.clasp.json` は別件 (Discord通知) 用。push はこのフォルダ内で行う:
  `cd apps-script/false-report-webapp && npx clasp push`

## セットアップ手順 (未完了分)

1. エディタの「プロジェクトの設定 > スクリプト プロパティ」に追加:
   - キー: `FALSE_REPORT_WEBHOOK_SECRET`
   - 値: Next.js 側の `FALSE_REPORT_WEBHOOK_SECRET` と同じ文字列 (コミット禁止)
2. 「デプロイ > デプロイを管理」で Web アプリ設定を確認:
   - 実行ユーザー: **自分**
   - アクセスできるユーザー: **全員 (Anyone)**
   - コード更新時は「新しいバージョン」で再デプロイ
3. 初回承認: エディタで `doGet` を一度実行してアクセス許可を承認する。

## 動作確認

```sh
curl -sS -X POST "https://script.google.com/macros/s/＜デプロイID＞/exec" \
  -H "Content-Type: application/json" \
  -d '{"action":"getData","secret":"＜FALSE_REPORT_WEBHOOK_SECRET＞"}' -L
```

`{"ok":true,"counts":{...}}` が返れば成功。403 の HTML が返る場合は
アクセス設定が「全員」になっていないか、初回承認が未完了。

## Next.js 側の環境変数

`.env.local` または Vercel の環境変数に設定する (どちらもコミット禁止):

```
FALSE_REPORT_WEBHOOK_URL=https://script.google.com/macros/s/＜デプロイID＞/exec
FALSE_REPORT_WEBHOOK_SECRET=＜スクリプトプロパティと同じ秘密文字列＞
```

未設定の間、`/false-report-checker` は読み取り専用モードで動作し、
POST は 501 を返す。

## API

すべて `POST` の JSON ボディ。`secret` 必須。

| action | パラメータ | 動作 |
| --- | --- | --- |
| `getData` | - | 各シートの件数を返す (疎通確認) |
| `setConfirmed` | `rowKey`, `rowIndex`, `value` | 顧客管理_自動反映 A列「確認済み」を更新。ONで「確認チェック」タブへ確認時点ステータスを記録、OFFで削除 |
| `setDiffConfirmed` | `rowKey`, `rowIndex`, `value` | 顧客管理_自動反映 B列「差分確認済み」を更新 |
| `saveFalseReportMemo` | `rowKey` / `managementId` / `rowIndex`+`customerName`, `memo` | 虚偽報告集計 E列「メモ」を更新 (行キーが空の既存行は管理ID等で特定) |
| `updateReply` | `rowIndex`, `customerName`, `appliedAt`, `slot`, `contacted?`, `status?`, `contractStatus?`, `memo?` | 連絡済みは返信あり顧客リストG列、ステータス/成約状況/メモは「返信チェック」タブへ保存 |

`rowKey` は各シートの「行キー」列 (顧客管理_自動反映: AI列 / 虚偽報告集計: AG列)。
返信あり顧客リストには行キーがないため、`rowIndex` を顧客名で検証し、
ズレていた場合は お申し込み日+顧客名 で探し直す。

## 差分/虚偽報告の検知方式

シート側の「変更検知」列 (AH) は記録が不安定なため使わず、Next.js側で
**大元の顧客管理シートを読み取り専用で照合**して検知する:

1. 確認済みチェック時のステータスをスナップショットとして保持
   (優先順: チェック管理タブ > 確認済みタブ > 確認チェックタブ)
2. 大元シートの現在ステータス (`着席 / 2回目ステータス`) を管理IDで取得
3. スナップショットが現在ステータス一覧に無ければ「差分」として表示

行キーは重複予約などで重複するため (同一管理IDの複数行)、書き込みは
`rowIndex` を行キーで検証してから行う。

## 返信チェックタブについて

返信あり顧客リストのA~E列はFILTER数式による自動生成で、H/I/J列に直接書いた値は
シート側の定期リビルドで消える (検証済み)。そのためステータス/成約状況/メモは
Web App が自動作成する「返信チェック」タブに
`キー = お申し込み日(小数5桁丸め)|顧客名|予約時間` でupsertし、
Next.js側が表示時にマージする。G列(連絡済みチェックボックス)は実セルのため直接更新する。
