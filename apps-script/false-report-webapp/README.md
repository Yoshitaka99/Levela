# false-report-webapp

軽量版スプレッドシートを `false-report-checker` 画面から操作するための Apps Script Web App です。

## 設定

1. 軽量版スプレッドシートで Apps Script を開く
2. `Code.gs` にこのフォルダの内容を貼り付ける
3. スクリプトプロパティを設定する
   - `FALSE_REPORT_SPREADSHEET_ID`: `1npumMCuzudexL9ZE4jr8tTMRh9j23eKXOatAqQ71uiY`
   - `FALSE_REPORT_WEBHOOK_SECRET`: 任意の長い文字列
4. Web アプリとしてデプロイする
   - 実行ユーザー: 自分
   - アクセスできるユーザー: 自分、またはリンクを知っているユーザー
5. Next.js 側の環境変数を設定する
   - `FALSE_REPORT_WEBHOOK_URL`: デプロイした Web App URL
   - `FALSE_REPORT_WEBHOOK_SECRET`: 手順3と同じ値

このコードは軽量版シートだけを編集します。本当の大元の顧客管理シートは編集しません。
