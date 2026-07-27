#!/usr/bin/env python3
"""映像・音楽の素材を Mixkit から public/ に落とす。

素材はリポジトリに入れていない（public/footage と public/music は .gitignore 済み）。
クローンした直後は、まずこれを実行する。

    python3 scripts/fetch_assets.py

ライセンス: Mixkit Free License。商用利用可・クレジット表記不要だが、
素材そのものの再配布は不可。詳細は https://mixkit.co/license/
"""

from __future__ import annotations

import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# シーンごとの映像。台本のブロック①〜⑥に対応。
FOOTAGE = {
    # ① 沈黙と問い — 静かな緊張
    "4596": "手にバンテージを巻く",
    "914": "誰もいないオフィス",
    # ② なぜLevelaに来たのか — 原点
    "23193": "ジムに入っていく",
    "40758": "スタンドの階段を駆け上がる",
    "608": "夜の街を走るシルエット",
    # ③ 数字は嘘をつかない
    "4907": "キーボードを打つ手元",
    "33429": "オフィスで手を動かすチーム",
    "241": "契約書にサインする",
    # ④ 一瞬の楽 vs 一生の後悔
    "40962": "リングに座り込むボクサー",
    "2846": "雨の窓",
    "40964": "次のラウンドを待つボクサー",
    # ⑤ 今出せずに、いつ出す
    "52317": "バトルロープを振り切る",
    "40968": "打ち込むボクサー",
    "32804": "スポーツセンターを走る背中",
    "40248": "腕立て伏せ",
    # ⑥ オロチームのコール
    "21225": "机を囲むチーム",
    "34980": "街のスカイラインの日の出",
}

# BGM。前半の静かなベッドと、後半のオーケストラ。
MUSIC = {
    "184": ("bed.mp3", "Vastness / Ambient — 前半の静かなベッド"),
    "678": ("epic.mp3", "Epical Drums 03 / Orchestral — 後半の盛り上がり"),
}

UA = "Mozilla/5.0"
MAX_1080_BYTES = 40 * 1024 * 1024


def opener() -> urllib.request.OpenerDirector:
    proxy = os.environ.get("HTTPS_PROXY")
    handler = urllib.request.ProxyHandler({"https": proxy, "http": proxy} if proxy else {})
    op = urllib.request.build_opener(handler)
    op.addheaders = [("User-Agent", UA)]
    return op


def content_length(op, url: str) -> int:
    req = urllib.request.Request(url, method="HEAD")
    try:
        with op.open(req, timeout=60) as res:
            return int(res.headers.get("Content-Length") or 0)
    except Exception:
        return 0


def download(op, url: str, dest: Path) -> bool:
    if dest.exists() and dest.stat().st_size > 0:
        print(f"  skip {dest.name} (取得済み)")
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        with op.open(url, timeout=600) as res, open(dest, "wb") as f:
            while chunk := res.read(1 << 20):
                f.write(chunk)
    except Exception as e:
        print(f"  FAIL {dest.name}: {e}")
        dest.unlink(missing_ok=True)
        return False
    print(f"  {dest.name}  {dest.stat().st_size / 1e6:.1f} MB")
    return True


def main() -> int:
    op = opener()
    ok = True

    print("映像 (Mixkit Free License)")
    for vid, label in FOOTAGE.items():
        dest = ROOT / "public" / "footage" / f"{vid}.mp4"
        if dest.exists() and dest.stat().st_size > 0:
            print(f"  skip {dest.name} ({label})")
            continue
        url_1080 = f"https://assets.mixkit.co/videos/{vid}/{vid}-1080.mp4"
        size = content_length(op, url_1080)
        # 1080が重すぎるクリップは720で足りる（暗く落として文字を乗せるため）
        url = url_1080 if 0 < size <= MAX_1080_BYTES else f"https://assets.mixkit.co/videos/{vid}/{vid}-720.mp4"
        print(f"  {label}")
        ok &= download(op, url, dest)

    print("\n音楽 (Mixkit Free License)")
    for mid, (name, label) in MUSIC.items():
        print(f"  {label}")
        ok &= download(op, f"https://assets.mixkit.co/music/{mid}/{mid}.mp3", ROOT / "public" / "music" / name)

    print("\n完了" if ok else "\n一部失敗。もう一度実行すると未取得ぶんだけ落とし直す。")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
