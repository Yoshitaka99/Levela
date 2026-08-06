---
name: kimi-webbridge
description: Drive the user's real Chrome/Edge browser through Kimi WebBridge to reach pages that require an existing login — app.levela.co.jp (商談録画, assignees, ai-drill ranking), 管理画面, or any authenticated dashboard that WebFetch cannot open. Use when a task needs a logged-in page, when the user says "kimi" / "webbridge" / "ブラウザで開いて" / "ログインが必要なページ", or when a fetch failed with 401/403/redirect-to-login. Also covers installing and troubleshooting the WebBridge daemon.
---

# Kimi WebBridge

Kimi WebBridge is a Chrome/Edge extension plus a local daemon that lets an agent operate a
real browser through the Chrome DevTools Protocol. Because it drives the browser the user is
already logged into, it reaches pages that `WebFetch` and `curl` cannot.

## Check this first: does the environment allow it at all?

WebBridge only works when the agent, the daemon, and the browser are on **the same machine**.

| Where Claude Code is running | Works? |
| --- | --- |
| Local CLI on the user's Mac/Windows/Linux desktop | Yes |
| IDE extension on the user's desktop | Yes |
| **Claude Code on the web / remote cloud container** | **No** |
| CI, GitHub Actions, headless server | No |

In a remote session there is no user browser and no reachable daemon — the user's daemon
listens on *their* loopback, not the container's. Do not attempt it, and do not try to expose
their local daemon to the internet.

Detect a remote session before proposing WebBridge:

```bash
ls ~/.kimi-webbridge/bin/kimi-webbridge 2>/dev/null || echo "not installed here"
```

If this is a remote session, say so plainly and switch to one of the
[fallbacks](#when-webbridge-is-not-available) instead of stalling.

## Setup

Run on the user's own machine. Ask before installing — this downloads and runs a binary.

1. **Install the extension** from the Chrome Web Store or Edge Add-ons ("Kimi WebBridge"),
   or unpacked via `chrome://extensions/` → Developer mode → Load unpacked.

2. **Install the daemon and agent skills:**

   ```bash
   curl -fsSL https://cdn.kimi.com/webbridge/install.sh | bash
   ```

   The installer detects OS/arch (macOS + Linux, arm64 + amd64), downloads the binary to
   `~/.kimi-webbridge/bin/kimi-webbridge`, starts the daemon, and installs its own skill
   files into every agent runtime it detects — including Claude Code. Useful flags:

   | Flag / env | Effect |
   | --- | --- |
   | `--no-start` | Install without starting the daemon |
   | `--no-skill` | Install without writing skill files into agent runtimes |
   | `KIMI_WEBBRIDGE_VERSION=v0.3.0` | Pin a version instead of latest |

3. **Verify:**

   ```bash
   kimi-webbridge status
   ```

   If the command is not found, the bin directory is not on `PATH`:

   ```bash
   export PATH="$PATH:$HOME/.kimi-webbridge/bin"
   ```

   Add that line to `~/.zshrc` (or `~/.bashrc`) to make it stick.

Subcommands confirmed in the official installer: `start`, `status`, `install-skill [-y]`.
Daemon logs land in `~/.kimi-webbridge/logs/daemon.log`.

## Driving the browser

The installer writes its own skill exposing the operational command surface, invoked as
`/kimi-webbridge`. **Use that skill's documented commands for the actual browser actions** —
navigate, click, fill forms, screenshot, extract page content. Do not guess command syntax
from this file; read the installed skill and follow it.

The documented capabilities are: open URLs, click elements, fill forms, capture screenshots,
extract page content and structured data (tables, text), and reuse logged-in sessions.

This file's job is the surrounding workflow: deciding whether WebBridge is the right route,
getting it running, and the Levela-specific recipes below.

## Working rules

- **Confirm before anything that writes.** Reading pages and taking screenshots is safe.
  Clicking submit, sending, deleting, approving, or paying acts as the logged-in user with
  their full permissions and is often irreversible. Ask first, every time.
- **Prefer an API when one exists.** Browser automation is slow and brittle. If the page is
  backed by an endpoint that a cookie or token can reach, use that instead — see below.
- **Never copy credentials out of the browser.** Session cookies and tokens visible in the
  page or devtools stay on the user's machine. Do not paste them into files, commits, chat,
  or any external service.
- **One tab, one task.** The user is working in that browser. Do not close their tabs, and
  return them to where they were when practical.
- **Extraction beats screenshots** when the goal is data — text and tables are parseable,
  screenshots are not. Screenshot for visual confirmation and for reporting back.

## Levela recipes

`https://app.levela.co.jp/**` requires a login, so `WebFetch` gets a redirect or a 403.

**商談録画 / assignees.** `https://app.levela.co.jp/sales/assignees` lists assignees, and
recordings live at `https://app.levela.co.jp/sales/recordings/<uuid>`. To collect them:
open the assignees page, extract the list, then visit each recording page and extract its
metadata and transcript text. Pull the **transcript text**, not the video file — text is what
downstream analysis (地獄素材抽出, ドリル生成) actually consumes, and video is enormous.
Save transcripts outside the repo unless the user has decided otherwise: they contain
customer names and full 商談 conversations.

**AIドリルランキング.** `https://app.levela.co.jp/ai-drill/ranking` has an established
non-browser path already wired into this repo — `LEVELA_AI_DRILL_COOKIE` (a logged-in session
cookie) or `LEVELA_AI_DRILL_RANKING_JSON_URL` (a JSON endpoint), both read from repository
secrets. See `docs/automation-trigger-setup.md`. Use that route for automation; WebBridge is
for interactive, one-off, or exploratory access where no endpoint is wired up yet.

That contrast generalizes: if a page is going to be scraped repeatedly by automation, find or
add an endpoint and a secret. Reach for WebBridge when a human-driven browser is genuinely
the shortest path.

## When WebBridge is not available

In a remote session, or before the daemon is set up, these still work:

- **Wired-up endpoint + secret** — the `LEVELA_AI_DRILL_COOKIE` pattern above; best for
  anything recurring.
- **The user exports the data** — most authenticated dashboards have a CSV/JSON export or a
  spreadsheet mirror. Several Levela 商談 transcripts already live in Google Drive and are
  readable through the Drive tools without touching a browser.
- **The user pastes the page** — fine for a single page, and the fastest option when the task
  needs one screen's worth of content.
- **Playwright in the container** — Chromium is preinstalled here
  (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`). This gets a browser, but *not* the user's
  login session, so it only helps for public pages or when credentials are supplied
  deliberately.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `kimi-webbridge: command not found` | Bin dir not on `PATH` — export `$HOME/.kimi-webbridge/bin` |
| `status` reports disconnected | Daemon not running (`kimi-webbridge start`), or the extension is disabled/absent in the browser |
| Daemon starts then dies | Read `~/.kimi-webbridge/logs/daemon.log` |
| Pages load logged out | The extension drives the profile the user is actually signed into — check they are in that Chrome/Edge profile, not a second profile or a guest window |
| `/kimi-webbridge` skill missing | `kimi-webbridge install-skill -y` |
| Works locally, fails in this session | Expected — remote session, see the table at the top |
