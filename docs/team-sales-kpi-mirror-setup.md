# チームセールスKPI用 顧客管理ミラー

## 目的

大元の顧客管理シートにフィルターがかかっても、チームセールスKPIの数値が影響を受けないようにするためのミラーです。

大元の顧客管理シートには一切書き込みません。Apps Script は大元シートを読み取り、KPIに必要な列だけを別スプレッドシートへ5分おきに書き出します。

## URL

- ミラー先: https://docs.google.com/spreadsheets/d/1a3WimNtSLyepfTZ3YxZmy3XAaV6eIG_8C-BdoAd4aIA/edit?usp=drivesdk
- ミラーCSV: https://docs.google.com/spreadsheets/d/1a3WimNtSLyepfTZ3YxZmy3XAaV6eIG_8C-BdoAd4aIA/gviz/tq?tqx=out:csv&sheet=KPI_MIRROR
- 本番KPI: https://levela.vercel.app/team

## 抽出元

- スプレッドシートID: `1kkL_gysoXKq0Kh8ttFeMmG6pljzv1iwum2k2DxvJ96s`
- シート名: `顧客管理`
- 取得方法: `getDataRange().getDisplayValues()`

`getDisplayValues()` は表示されている行だけではなく範囲内の値を取得するため、通常のフィルター表示には依存しません。

## ミラー先

- スプレッドシートID: `1a3WimNtSLyepfTZ3YxZmy3XAaV6eIG_8C-BdoAd4aIA`
- シート名: `KPI_MIRROR`
- 更新間隔: 5分

## 抽出列

| ミラー列 | 元シート列 | 内容 |
| --- | --- | --- |
| A | B | 担当者名 |
| B | C | セミナー |
| C | D | 流入経路 |
| D | E | 面談日 |
| E | F | 流入 |
| F | G | 着席 |
| G | H | ステータス |
| H | I | 保留回答予定日 |
| I | N | 決着日(着金日) |
| J | O | 成約プラン |
| K | Q | 失注理由 |
| L | R | 保留理由 |
| M | T | 保留理由2 |

担当者名が空白の行は除外します。

## 初回セットアップ

1. ミラー先スプレッドシートを開く。
2. 右上の `共有` から、一般的なアクセスを `リンクを知っている全員`、権限を `閲覧者` にする。
3. `拡張機能` から `Apps Script` を開く。
4. `apps-script/TeamSalesKpiMirror.gs` の内容を貼り付ける。
5. `setupTeamSalesKpiMirror` を実行する。
6. Googleの権限確認を承認する。
7. `KPI_MIRROR` にデータが入っていることを確認する。
8. Apps Script のトリガー画面で `refreshTeamSalesKpiMirror` が5分おきに設定されていることを確認する。

## 本番KPIへの接続

Vercel の環境変数 `TEAM_SALES_DASHBOARD_DATA_URL` に以下を設定します。

```env
TEAM_SALES_DASHBOARD_DATA_URL=https://docs.google.com/spreadsheets/d/1a3WimNtSLyepfTZ3YxZmy3XAaV6eIG_8C-BdoAd4aIA/gviz/tq?tqx=out:csv&sheet=KPI_MIRROR
```

設定後、本番を再デプロイすると `https://levela.vercel.app/team` はミラーCSVから読み取ります。

## 動作確認

Apps Script エディタで `getTeamSalesKpiMirrorStatus` を実行すると、最終更新日時、行数、CSV URL、5分更新トリガー数を確認できます。

外部からCSVを確認して `401` になる場合は、ミラー先スプレッドシートの共有設定がまだ非公開です。本番KPIから読むには、ミラーCSVがリンク閲覧できる状態である必要があります。
