from pathlib import Path
import math

from PIL import Image, ImageDraw, ImageFont, ImageFilter


OUT_DIR = Path("outputs/ai_drill_intro_slides")
W, H = 1600, 900


COLORS = {
    "navy": "#101B3F",
    "blue": "#1463FF",
    "cyan": "#19C7D4",
    "teal": "#00A887",
    "lime": "#B7F25B",
    "gold": "#FFC83D",
    "orange": "#FF8B3D",
    "pink": "#FF4F86",
    "purple": "#6C4DFF",
    "ink": "#182033",
    "muted": "#63708A",
    "line": "#D9E1F2",
    "white": "#FFFFFF",
    "pale": "#F4F8FF",
    "dark_pale": "#EAF1FF",
}


def font_path(*names):
    roots = [Path("C:/Windows/Fonts")]
    for root in roots:
        for name in names:
            p = root / name
            if p.exists():
                return str(p)
    return None


FONT_BOLD = font_path("YuGothB.ttc", "meiryob.ttc", "msgothic.ttc")
FONT_MED = font_path("YuGothM.ttc", "meiryo.ttc", "msgothic.ttc")
FONT_REG = font_path("YuGothR.ttc", "meiryo.ttc", "msgothic.ttc")


def f(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_MED, size)


def hex_to_rgb(value):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def lerp(a, b, t):
    return int(a + (b - a) * t)


def gradient_bg(c1="#F4F8FF", c2="#FFFFFF", accent="#19C7D4"):
    img = Image.new("RGB", (W, H), c1)
    p1 = hex_to_rgb(c1)
    p2 = hex_to_rgb(c2)
    px = img.load()
    for y in range(H):
        for x in range(W):
            t = (x / W * 0.55) + (y / H * 0.45)
            px[x, y] = tuple(lerp(p1[i], p2[i], t) for i in range(3))

    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse((1100, -180, 1820, 520), fill=hex_to_rgb(accent) + (42,))
    od.ellipse((-220, 560, 520, 1160), fill=hex_to_rgb(COLORS["gold"]) + (38,))
    od.rounded_rectangle((80, 80, W - 80, H - 80), radius=34, outline=(255, 255, 255, 180), width=3)
    return Image.alpha_composite(img.convert("RGBA"), overlay)


def draw_text(draw, xy, text, size, color=None, bold=False, anchor=None, align="left", spacing=10):
    draw.multiline_text(
        xy,
        text,
        font=f(size, bold),
        fill=color or COLORS["ink"],
        anchor=anchor,
        align=align,
        spacing=spacing,
    )


def measure(text, size, bold=False):
    box = ImageDraw.Draw(Image.new("RGB", (1, 1))).multiline_textbbox((0, 0), text, font=f(size, bold), spacing=8)
    return box[2] - box[0], box[3] - box[1]


def fit_text(draw, xy, text, max_width, size, color=None, bold=False, spacing=8):
    lines = []
    for raw in text.split("\n"):
        current = ""
        for ch in raw:
            test = current + ch
            if measure(test, size, bold)[0] <= max_width or not current:
                current = test
            else:
                lines.append(current)
                current = ch
        lines.append(current)
    draw_text(draw, xy, "\n".join(lines), size, color, bold, spacing=spacing)


def round_rect(draw, xy, radius=24, fill="#FFFFFF", outline=None, width=2):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def pill(draw, xy, text, fill, color="#FFFFFF", size=32):
    round_rect(draw, xy, radius=999, fill=fill)
    x1, y1, x2, y2 = xy
    draw_text(draw, ((x1 + x2) // 2, (y1 + y2) // 2 - 2), text, size, color, True, anchor="mm")


def header(draw, label, title, subtitle=None):
    pill(draw, (90, 64, 310, 116), label, COLORS["navy"], COLORS["white"], 26)
    draw_text(draw, (92, 145), title, 60, COLORS["navy"], True)
    if subtitle:
        draw_text(draw, (96, 232), subtitle, 30, COLORS["muted"], False)


def big_number(draw, xy, main, unit, caption, color):
    x, y = xy
    round_rect(draw, (x, y, x + 420, y + 250), 30, COLORS["white"], COLORS["line"], 3)
    draw_text(draw, (x + 32, y + 38), main, 82, color, True)
    draw_text(draw, (x + 34 + measure(main, 82, True)[0], y + 75), unit, 34, color, True)
    fit_text(draw, (x + 34, y + 155), caption, 350, 28, COLORS["muted"], False)


def table(draw, x, y, widths, rows, row_h=72, head_fill="#101B3F", body_fill="#FFFFFF", alt="#F4F8FF", text_size=28):
    total_w = sum(widths)
    for r, row in enumerate(rows):
        yy = y + r * row_h
        fill = head_fill if r == 0 else (body_fill if r % 2 else alt)
        round_rect(draw, (x, yy, x + total_w, yy + row_h), 14 if r in (0, len(rows) - 1) else 4, fill, COLORS["line"], 2)
        xx = x
        for c, cell in enumerate(row):
            color = COLORS["white"] if r == 0 else COLORS["ink"]
            bold = r == 0 or c == 0 or "合計" in str(cell)
            anchor = "mm"
            draw_text(draw, (xx + widths[c] / 2, yy + row_h / 2 - 2), str(cell), text_size, color, bold, anchor=anchor, align="center")
            if c:
                draw.line((xx, yy + 12, xx, yy + row_h - 12), fill=COLORS["line"], width=2)
            xx += widths[c]


def card(draw, xy, title, body, accent=COLORS["blue"], title_size=34, body_size=27):
    x1, y1, x2, y2 = xy
    round_rect(draw, xy, 26, COLORS["white"], COLORS["line"], 2)
    draw.rounded_rectangle((x1, y1, x1 + 12, y2), radius=12, fill=accent)
    draw_text(draw, (x1 + 34, y1 + 28), title, title_size, COLORS["navy"], True)
    fit_text(draw, (x1 + 34, y1 + 88), body, x2 - x1 - 70, body_size, COLORS["muted"], False, spacing=10)


def save(img, idx):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(OUT_DIR / f"{idx:02d}.png", quality=95)


def slide_base(idx, label, title, subtitle=None, accent="#19C7D4"):
    img = gradient_bg(accent=accent)
    d = ImageDraw.Draw(img)
    header(d, f"{idx:02d}", title, subtitle)
    return img, d


def slide_01():
    img = gradient_bg("#EDF7FF", "#FFFFFF", COLORS["cyan"])
    d = ImageDraw.Draw(img)
    pill(d, (96, 82, 360, 136), "AI DRILL", COLORS["navy"], size=28)
    draw_text(d, (100, 188), "今週日曜までに\nAIドリル入門編を\n卒業する", 76, COLORS["navy"], True, spacing=12)
    draw_text(d, (106, 520), "必要なのは、気合いではなく\n“時間の置き換え”です", 38, COLORS["muted"], True, spacing=10)
    big_number(d, (990, 120), "6時間40分", "", "全50レッスンを完了する総時間", COLORS["blue"])
    big_number(d, (990, 405), "100", "分/日", "残り4日で卒業する1日の目安", COLORS["orange"])
    pill(d, (100, 720, 365, 782), "全50レッスン", COLORS["blue"], size=30)
    pill(d, (390, 720, 625, 782), "750XP", COLORS["teal"], size=30)
    pill(d, (650, 720, 900, 782), "1本8分", COLORS["pink"], size=30)
    save(img, 1)


def slide_02():
    img, d = slide_base(2, "WHY", "なぜ今、AIドリルをやるのか", "AIはこれからの仕事の標準装備になる", COLORS["blue"])
    items = [
        ("営業", "提案文・商談準備・振り返り"),
        ("文章", "メール・投稿文・報告文"),
        ("調査", "情報整理・比較・要約"),
        ("資料", "構成案・たたき台・改善案"),
    ]
    for i, (t, b) in enumerate(items):
        x = 110 + (i % 2) * 690
        y = 340 + (i // 2) * 190
        card(d, (x, y, x + 620, y + 145), t, b, [COLORS["blue"], COLORS["teal"], COLORS["orange"], COLORS["pink"]][i])
    round_rect(d, (180, 735, 1420, 815), 28, COLORS["navy"])
    draw_text(d, (800, 775), "今ここで触れておくと、後の仕事がかなり楽になる", 38, COLORS["white"], True, anchor="mm")
    save(img, 2)


def slide_03():
    img, d = slide_base(3, "MAP", "入門編は10カテゴリ", "1カテゴリ5レッスン。全体像はシンプルです", COLORS["teal"])
    cats = [
        "AIとwithAIマインドセット", "主要AIツール俯瞰", "ChatGPTとGemini基本操作", "AIの仕組みと挙動の理解", "プロンプトの基本5原則",
        "日常業務への即効活用", "文章生成の実践基礎", "画像・音声・ファイル入力", "品質チェックと再プロンプト", "情報セキュリティと社内ルール",
    ]
    for i, cat in enumerate(cats):
        x = 95 + (i % 2) * 710
        y = 315 + (i // 2) * 92
        round_rect(d, (x, y, x + 660, y + 68), 16, COLORS["white"], COLORS["line"], 2)
        pill(d, (x + 18, y + 12, x + 78, y + 56), str(i + 1), COLORS["blue"] if i < 5 else COLORS["teal"], size=24)
        fit_text(d, (x + 98, y + 18), cat, 520, 26, COLORS["ink"], True)
    save(img, 3)


def slide_04():
    img, d = slide_base(4, "TIME", "実は、必要時間はたった6時間40分", "“全部”と聞くと重い。でも数字にすると軽く見える", COLORS["orange"])
    steps = [("10カテゴリ × 5レッスン", "50レッスン"), ("50レッスン × 8分", "400分"), ("400分", "6時間40分")]
    for i, (a, b) in enumerate(steps):
        x = 120 + i * 475
        y = 360
        round_rect(d, (x, y, x + 390, y + 230), 30, COLORS["white"], COLORS["line"], 3)
        draw_text(d, (x + 195, y + 62), a, 31, COLORS["muted"], True, anchor="mm")
        draw_text(d, (x + 195, y + 145), b, 48 if i < 2 else 58, [COLORS["blue"], COLORS["teal"], COLORS["orange"]][i], True, anchor="mm")
        if i < 2:
            draw_text(d, (x + 430, y + 105), ">", 64, COLORS["line"], True, anchor="mm")
    round_rect(d, (205, 680, 1395, 780), 30, "#FFF6E8", "#FFD89D", 3)
    draw_text(d, (800, 730), "1週間の中で少しずつ置き換えれば、十分終わる量です", 38, COLORS["navy"], True, anchor="mm")
    save(img, 4)


def slide_05():
    img, d = slide_base(5, "4 DAYS", "4日間で終わらせる目安", "1日100分前後。分割すればかなり現実的", COLORS["purple"])
    rows = [
        ["日数", "レッスン", "XP", "所要時間"],
        ["1日目", "13", "195XP", "1時間44分"],
        ["2日目", "13", "195XP", "1時間44分"],
        ["3日目", "12", "180XP", "1時間36分"],
        ["4日目", "12", "180XP", "1時間36分"],
        ["合計", "50", "750XP", "6時間40分"],
    ]
    table(d, 190, 310, [270, 270, 270, 360], rows, row_h=78, text_size=30)
    save(img, 5)


def slide_06():
    img, d = slide_base(6, "REPLACE", "100分は“新しく作る”のではない", "普段の時間をAIドリルに置き換える", COLORS["pink"])
    draw_text(d, (150, 350), "時間がない", 58, COLORS["muted"], True)
    draw_text(d, (655, 365), "→", 70, COLORS["orange"], True, anchor="mm")
    draw_text(d, (820, 350), "無意識の時間を\n差し替える", 58, COLORS["navy"], True, spacing=14)
    labels = [("通勤", "1〜2本"), ("退勤後", "3本"), ("待ち時間", "1本"), ("SNS", "15〜30分だけ")]
    for i, (a, b) in enumerate(labels):
        x = 135 + i * 355
        round_rect(d, (x, 650, x + 300, 760), 24, COLORS["white"], COLORS["line"], 2)
        draw_text(d, (x + 150, 690), a, 34, COLORS["navy"], True, anchor="mm")
        draw_text(d, (x + 150, 735), b, 28, COLORS["blue"], True, anchor="mm")
    save(img, 6)


def slide_07():
    img, d = slide_base(7, "COMMUTE", "通勤時間で進める", "片道16分あれば2レッスン", COLORS["cyan"])
    big_number(d, (160, 330), "2", "本", "片道16分で進む量", COLORS["blue"])
    big_number(d, (590, 330), "4", "本", "往復32分で進む量", COLORS["teal"])
    big_number(d, (1020, 330), "60", "XP", "往復で獲得できるXP", COLORS["orange"])
    round_rect(d, (240, 685, 1360, 775), 30, COLORS["navy"])
    draw_text(d, (800, 730), "移動時間が、そのまま進捗になる", 42, COLORS["white"], True, anchor="mm")
    save(img, 7)


def slide_08():
    img, d = slide_base(8, "SWAP", "退勤後とSNS時間を置き換える", "だらっと見る前に、先に3本", COLORS["orange"])
    card(d, (120, 330, 730, 590), "帰宅後すぐ", "3レッスン = 24分\n45XP獲得\nここで今日の進捗が作れる", COLORS["orange"], 42, 34)
    card(d, (870, 330, 1480, 590), "SNS 30分", "3レッスン進む\n4日で12レッスン分\n“少しだけ置き換え”でOK", COLORS["pink"], 42, 34)
    round_rect(d, (225, 710, 1375, 800), 30, "#EFFFFA", "#88E8D6", 3)
    draw_text(d, (800, 755), "新しく作るより、置き換えるほうが続きやすい", 39, COLORS["navy"], True, anchor="mm")
    save(img, 8)


def schedule_slide(idx, title, rows, accent):
    img, d = slide_base(idx, "MODEL", title, "13レッスン / 104分 / 195XP", accent)
    table_rows = [["タイミング", "レッスン", "時間"]] + rows + [["合計", "13", "104分"]]
    table(d, 235, 310, [550, 300, 300], table_rows, row_h=72, text_size=29)
    round_rect(d, (1010, 685, 1370, 785), 28, COLORS["navy"])
    draw_text(d, (1190, 735), "195XP", 54, COLORS["gold"], True, anchor="mm")
    return img


def slide_09():
    img = schedule_slide(9, "パターンA：通勤・退勤で終わらせる型", [
        ["朝の通勤", "2", "16分"], ["昼・待ち時間", "2", "16分"], ["退勤中", "2", "16分"], ["帰宅後", "4", "32分"], ["寝る前", "3", "24分"],
    ], COLORS["blue"])
    save(img, 9)


def slide_10():
    img = schedule_slide(10, "パターンB：仕事後にまとめて進める型", [
        ["帰宅後すぐ", "5", "40分"], ["食後", "4", "32分"], ["寝る前", "4", "32分"],
    ], COLORS["teal"])
    save(img, 10)


def slide_11():
    img = schedule_slide(11, "パターンC：隙間時間だけで刻む型", [
        ["朝", "1", "8分"], ["移動中", "2", "16分"], ["昼", "2", "16分"], ["待ち時間", "2", "16分"], ["退勤中", "2", "16分"], ["夜", "4", "32分"],
    ], COLORS["pink"])
    save(img, 11)


def slide_12():
    img, d = slide_base(12, "START", "やるべき進め方", "始めるまでが一番重い。始めたら8分で1個終わる", COLORS["lime"])
    items = [
        ("今日中に最低3本", "まず動き出す"),
        ("完璧に理解しすぎない", "あとで戻ればOK"),
        ("まず最後まで一周", "全体像をつかむ"),
        ("1カテゴリより1レッスン", "重く考えない"),
    ]
    for i, (t, b) in enumerate(items):
        x = 110 + (i % 2) * 690
        y = 330 + (i // 2) * 185
        card(d, (x, y, x + 620, y + 140), t, b, [COLORS["blue"], COLORS["teal"], COLORS["orange"], COLORS["pink"]][i], 36, 30)
    round_rect(d, (260, 725, 1340, 805), 28, COLORS["navy"])
    draw_text(d, (800, 765), "1本見始めたら、意外と続く", 42, COLORS["white"], True, anchor="mm")
    save(img, 12)


def slide_13():
    img, d = slide_base(13, "CAUTION", "この考え方になると終わりにくい", "責める話ではなく、失敗パターンの先回り", COLORS["pink"])
    bad = [
        "まとまった時間ができたらやろう",
        "日曜日にまとめてやろう",
        "完璧に理解してから次へ",
        "今日は忙しいからゼロでいい",
        "明日の自分に任せよう",
    ]
    good = ["10分空いたら1本", "今日3本だけ", "まず一周", "1本だけやる", "今日8分だけ動く"]
    for i, (b, g) in enumerate(zip(bad, good)):
        y = 320 + i * 88
        round_rect(d, (105, y, 1485, y + 64), 18, COLORS["white"], COLORS["line"], 2)
        draw_text(d, (150, y + 32), b, 28, COLORS["muted"], True, anchor="lm")
        draw_text(d, (815, y + 32), "→", 34, COLORS["orange"], True, anchor="mm")
        draw_text(d, (900, y + 32), g, 30, COLORS["navy"], True, anchor="lm")
    save(img, 13)


def slide_14():
    img, d = slide_base(14, "HACK", "最短のコツは、24分を4回", "1日100分ではなく、軽い単位で考える", COLORS["orange"])
    big_number(d, (115, 330), "3", "本", "1セットの目標", COLORS["blue"])
    big_number(d, (505, 330), "24", "分", "心理的に軽い時間", COLORS["teal"])
    big_number(d, (895, 330), "4", "回", "1日で回せばOK", COLORS["orange"])
    round_rect(d, (390, 670, 1210, 790), 32, COLORS["navy"])
    draw_text(d, (800, 730), "12レッスン = 96分 = ほぼ1日目標達成", 43, COLORS["white"], True, anchor="mm")
    save(img, 14)


def slide_15():
    img = gradient_bg("#ECF9FF", "#FFFFFF", COLORS["blue"])
    d = ImageDraw.Draw(img)
    pill(d, (96, 82, 360, 136), "FINAL", COLORS["navy"], size=28)
    draw_text(d, (105, 190), "AIを学ぶことは、\nこれからの仕事の武器を増やすこと。", 64, COLORS["navy"], True, spacing=14)
    round_rect(d, (120, 430, 1480, 560), 34, COLORS["white"], COLORS["line"], 3)
    draw_text(d, (800, 495), "今週日曜までに、チームで入門編卒業へ", 48, COLORS["blue"], True, anchor="mm")
    draw_text(d, (800, 640), "8分動けば、もう前進している。", 58, COLORS["orange"], True, anchor="mm")
    round_rect(d, (210, 735, 1390, 820), 30, COLORS["navy"])
    draw_text(d, (800, 778), "1レッスン8分。まずは今日、1本進めましょう。", 38, COLORS["white"], True, anchor="mm")
    save(img, 15)


def make_contact_sheet():
    thumbs = []
    for p in sorted(OUT_DIR.glob("*.png")):
        im = Image.open(p).convert("RGB")
        im.thumbnail((320, 180))
        canvas = Image.new("RGB", (340, 215), "white")
        canvas.paste(im, (10, 10))
        d = ImageDraw.Draw(canvas)
        d.text((12, 190), p.name, fill=(24, 32, 51), font=f(20, True))
        thumbs.append(canvas)
    cols = 3
    rows = math.ceil(len(thumbs) / cols)
    sheet = Image.new("RGB", (cols * 340, rows * 215), "#F4F8FF")
    for i, im in enumerate(thumbs):
        sheet.paste(im, ((i % cols) * 340, (i // cols) * 215))
    sheet.save(OUT_DIR / "contact_sheet.png", quality=95)


def main():
    for fn in [
        slide_01, slide_02, slide_03, slide_04, slide_05,
        slide_06, slide_07, slide_08, slide_09, slide_10,
        slide_11, slide_12, slide_13, slide_14, slide_15,
    ]:
        fn()
    make_contact_sheet()
    print(f"saved {len(list(OUT_DIR.glob('[0-9][0-9].png')))} slides to {OUT_DIR.resolve()}")


if __name__ == "__main__":
    main()
