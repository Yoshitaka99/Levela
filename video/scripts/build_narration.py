#!/usr/bin/env python3
"""src/narration.json のセリフを音声にして public/narration/<scene>/<id>.mp3 に書き出す。

生成後、実際の音声長を narration.json の durSec に書き戻すので、
字幕の表示時間と音声の長さは常に一致する。行が重なっていたら警告を出す。

    pip install edge-tts
    python3 scripts/build_narration.py

声は Microsoft Edge の読み上げ音声（ja-JP-KeitaNeural）をピッチを下げて使っている。
本番で使うなら人の声で録り直して public/narration/ の同じファイル名に置き換えるのが早い。
"""

from __future__ import annotations

import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
NARRATION_JSON = ROOT / "src" / "narration.json"
OUT_DIR = ROOT / "public" / "narration"
FPS = 30


def ffmpeg_bin() -> str:
    """ffmpeg-static があればそれを、なければ PATH の ffmpeg を使う。"""
    bundled = ROOT / "node_modules" / "ffmpeg-static" / "ffmpeg"
    return str(bundled) if bundled.exists() else "ffmpeg"


def probe_seconds(path: Path) -> float:
    out = subprocess.run(
        [ffmpeg_bin(), "-v", "quiet", "-i", str(path), "-f", "null", "-"],
        capture_output=True,
        text=True,
    )
    # -f null では長さが取れないので、生PCMのバイト数から出す
    raw = subprocess.run(
        [ffmpeg_bin(), "-v", "quiet", "-i", str(path), "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
        capture_output=True,
    ).stdout
    del out
    return len(raw) / 2 / 16000


async def synth(line: dict, voice: str, defaults: dict, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    communicate = edge_tts.Communicate(
        line["text"],
        voice,
        rate=line.get("rate", defaults["rate"]),
        pitch=line.get("pitch", defaults["pitch"]),
        volume=line.get("volume", defaults["volume"]),
        proxy=os.environ.get("HTTPS_PROXY"),
    )
    await communicate.save(str(dest))


async def main() -> int:
    data = json.loads(NARRATION_JSON.read_text(encoding="utf-8"))
    voice = data["voice"]
    defaults = data["defaults"]

    problems: list[str] = []

    for scene, lines in data["scenes"].items():
        for line in lines:
            dest = OUT_DIR / scene / f"{line['id']}.mp3"
            await synth(line, voice, defaults, dest)
            seconds = probe_seconds(dest)
            line["durSec"] = round(seconds + 0.25, 2)
            print(f"  {scene}/{line['id']:<3} {seconds:5.2f}s  {line['text'][:30]}")

        # 行同士が重なっていないか（前の行が終わる前に次が始まっていないか）
        for prev, nxt in zip(lines, lines[1:]):
            end = prev["fromSec"] + prev["durSec"]
            if end > nxt["fromSec"] + 0.05:
                problems.append(
                    f"{scene}: {prev['id']} が {end:.2f}s まで伸びて "
                    f"{nxt['id']} ({nxt['fromSec']}s) にかぶる"
                )

    NARRATION_JSON.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    if problems:
        print("\n重なりあり:")
        for p in problems:
            print("  -", p)
        return 1

    print("\nOK: 重なりなし")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
