# 出典・ライセンス

このディレクトリの以下のファイルは、[openclaw/gogcli](https://github.com/openclaw/gogcli)
の `.agents/skills/` (v0.37.0, commit `45b5d76`) から取り込んだもの。

- `core.md` ← `.agents/skills/gog/SKILL.md`
- `gmail.md`, `calendar.md`, `drive.md`, `sheets.md`, `docs.md`, `slides.md`,
  `forms.md`, `tasks.md`, `contacts.md`, `people.md`
  ← `.agents/skills/gog-<service>/SKILL.md`
- `workflows.md` ← `.agents/skills/gog-{inbox-triage,meeting-prep,save-attachments,drive-audit,weekly-digest,contacts-cleanup}/SKILL.md` を結合

変更点はスキル間の相対リンクをこのディレクトリ構成に合わせて書き換えたのみ。
`setup-oauth.md` と `../SKILL.md` はこのリポジトリ向けの書き下ろし。

gogcli は MIT License。ライセンス全文:
<https://github.com/openclaw/gogcli/blob/main/LICENSE>

## 更新方法

サービス別リファレンスは CLI のスキーマから自動生成されているため、
gog をアップグレードしたら再取得する:

```bash
git clone --depth 1 https://github.com/openclaw/gogcli.git /tmp/gogcli
cp /tmp/gogcli/.agents/skills/gog/SKILL.md .claude/skills/gog/references/core.md
for s in gmail calendar drive sheets docs slides tasks contacts forms people; do
  cp "/tmp/gogcli/.agents/skills/gog-$s/SKILL.md" ".claude/skills/gog/references/$s.md"
done
# スキル間リンクをこのディレクトリ構成に合わせる
sed -i -E 's#\.\./gog/SKILL\.md#core.md#g; s#\.\./gog-([a-z-]+)/SKILL\.md#\1.md#g' \
  .claude/skills/gog/references/*.md
```

上流のスキルをそのまま全部入れたい場合は、Agent Skills 対応クライアントで:

```bash
npx skills add https://github.com/openclaw/gogcli
```
