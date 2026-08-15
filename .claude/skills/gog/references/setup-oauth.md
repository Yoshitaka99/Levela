# gog OAuth セットアップ手順

`gog` は「あなた自身の Google Cloud プロジェクト」を使って、あなたとして Google API を叩く。
初回のみ以下の設定が必要。**ブラウザ同意が必要な部分は人間が実施する**（エージェントは代行しない）。

## 0. インストール

```bash
bash .claude/skills/gog/scripts/install-gog.sh
gog --version
```

- macOS: `brew install openclaw/tap/gogcli`
- Go 環境: `GOTOOLCHAIN=auto go install github.com/openclaw/gogcli/cmd/gog@latest`
  （gogcli の `go.mod` は新しめの Go を要求するため `GOTOOLCHAIN=auto` が必要）

## 1. Google Cloud プロジェクトと OAuth クライアント

1. <https://console.cloud.google.com/projectcreate> でプロジェクトを作成
2. [API ライブラリ](https://console.cloud.google.com/apis/library) で使う API を有効化
   （Gmail / Calendar / Drive / Docs / Sheets / Slides / Forms / People / Tasks など、必要なものだけ）
3. [OAuth 同意画面](https://console.cloud.google.com/auth/branding) を「外部」+ 自分のメールで設定
4. [認証情報](https://console.cloud.google.com/auth/clients) で **デスクトップアプリ** の OAuth クライアントを作成し、JSON をダウンロード

`gcloud` が使えるなら、計画を確認しながら半自動化できる:

```bash
# 何をするかだけ確認（プロジェクト作成も API 有効化もしない）
gog auth setup you@example.com --gcloud-project my-gog-project --dry-run --json --no-input

# 実行（--create-project でプロジェクト作成も含む）
gog auth setup you@example.com --gcloud-project my-gog-project --enable-apis --open-console
```

### 週次の再認証を避ける

OAuth 同意画面が「外部 + テスト」のままだと、リフレッシュトークンが **7日で失効** する。
同じプロジェクトの [Audience](https://console.cloud.google.com/auth/audience) で
**アプリを公開 (Publish app)** → **確認** に変更する。これは審査申請ではなく、状態を「本番」にするだけ。
テスト状態で既に認証済みなら、同じサービス指定で `gog auth add ... --force-consent` を一度やり直す。

## 2. クライアント JSON を登録

```bash
gog auth credentials ~/Downloads/client_secret_*.json
```

`$XDG_CONFIG_HOME/gogcli/`（OS 相当のパス）にモード `0600` でコピーされる。

## 3. アカウントを認可

```bash
gog auth add you@example.com --services gmail,calendar,drive,docs,sheets,contacts
```

ブラウザが開いて同意すると、リフレッシュトークンが OS のキーリング
（macOS: Keychain / Linux: Secret Service / Windows: Credential Manager）に保存される。

- ヘッドレス環境: `--manual`（URL 貼り付け方式）、または `--remote --step 1` / `--step 2`
- キーリングが無いサーバー: `GOG_KEYRING_BACKEND=file` + `GOG_KEYRING_PASSWORD`
  （systemd 等ではログインシェルではなく**サービスの環境**に設定されているか確認する）

## 4. 確認

```bash
gog auth list --check
gog auth doctor --check
gog me
```

## 5. 既定アカウント

```bash
export GOG_ACCOUNT=you@example.com
# または
gog auth alias set default you@example.com
gog auth alias set work   you@company.com   # gog --account work ... で切替
```

## 再認証時の注意

トークンが失効／失効取り消しされた場合、**スコープを勝手に狭めない**。
先に `gog auth list --check --json --no-input` で既存の `services` を確認し、
明示的な要望がない限り `--services all-user --force-consent` で元の広さを維持する。
安全性はスコープではなく、実行時ガード（`--readonly` / `--enable-commands` / `--gmail-no-send` / `--dry-run`）で担保する。

## 使えるアカウント種別

- 個人 `@gmail.com`: Gmail / Calendar / Drive / Docs / Sheets / Slides / Forms / Apps Script / Contacts / Tasks / Classroom は利用可
- Workspace 管理ドメイン限定: Admin Directory / Cloud Identity Groups / Chat / Keep（ドメイン全体の委任が必要）

## 参考リンク

- 公式ドキュメント: <https://github.com/openclaw/gogcli> / `docs/quickstart.md`, `docs/auth-clients.md`
- セーフティプロファイル（コマンド許可をバイナリに焼き込む）: `docs/safety-profiles.md`
- MCP サーバとして使う: `gog mcp`（既定は読み取り専用）
