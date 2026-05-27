from pathlib import Path
import math

from PIL import Image, ImageDraw, ImageFont


OUT_DIR = Path("outputs/ai_drill_intro_slides_v2")
W, H = 1600, 900

COLORS = {
    "navy": "#0D1B3D",
    "ink": "#172033",
    "muted": "#65728A",
    "blue": "#1266FF",
    "cyan": "#18C7D9",
    "teal": "#00A887",
    "gold": "#FFC83D",
    "orange": "#FF8A35",
    "pink": "#FF4F86",
    "purple": "#7056FF",
    "green": "#22B573",
    "pale": "#F4F8FF",
    "white": "#FFFFFF",
    "line": "#DDE6F5",
    "warning": "#FFF4E5",
    "danger": "#FFEAF1",
}


def font_path(*names):
    root = Path("C:/Windows/Fonts")
    for name in names:
        p = root / name
        if p.exists():
            return str(p)
    return None


FONT_BOLD = font_path("YuGothB.ttc", "meiryob.ttc", "msgothic.ttc")
FONT_MED = font_path("YuGothM.ttc", "meiryo.ttc", "msgothic.ttc")


def f(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_MED, size)


def rgb(hex_value):
    h = hex_value.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lerp(a, b, t):
    return int(a + (b - a) * t)


def base(accent=COLORS["cyan"]):
    img = Image.new("RGB", (W, H), COLORS["pale"]).convert("RGBA")
    px = img.load()
    p1, p2 = rgb("#EFF6FF"), rgb("#FFFFFF")
    for y in range(H):
        for x in range(W):
            t = (x / W * 0.5) + (y / H * 0.5)
            px[x, y] = tuple(lerp(p1[i], p2[i], t) for i in range(3)) + (255,)
    d = ImageDraw.Draw(img)
    d.ellipse((1080, -230, 1810, 485), fill=rgb(accent) + (42,))
    d.ellipse((-220, 590, 520, 1150), fill=rgb(COLORS["gold"]) + (35,))
    d.rounded_rectangle((72, 58, W - 72, H - 58), radius=36, outline=(255, 255, 255, 180), width=3)
    return img


def text(d, xy, s, size, color=COLORS["ink"], bold=False, anchor=None, align="left", spacing=8):
    d.multiline_text(xy, s, font=f(size, bold), fill=color, anchor=anchor, align=align, spacing=spacing)


def box_size(s, size, bold=False):
    b = ImageDraw.Draw(Image.new("RGB", (1, 1))).multiline_textbbox((0, 0), s, font=f(size, bold), spacing=8)
    return b[2] - b[0], b[3] - b[1]


def wrap(s, size, max_w, bold=False):
    lines = []
    for raw in s.split("\n"):
        cur = ""
        for ch in raw:
            trial = cur + ch
            if box_size(trial, size, bold)[0] <= max_w or not cur:
                cur = trial
            else:
                lines.append(cur)
                cur = ch
        lines.append(cur)
    return "\n".join(lines)


def fit(d, xy, s, max_w, size, color=COLORS["ink"], bold=False, spacing=8):
    text(d, xy, wrap(s, size, max_w, bold), size, color, bold, spacing=spacing)


def rr(d, xy, fill=COLORS["white"], outline=COLORS["line"], radius=24, width=2):
    d.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def pill(d, xy, label, fill=COLORS["navy"], color=COLORS["white"], size=28):
    rr(d, xy, fill=fill, outline=fill, radius=999, width=1)
    x1, y1, x2, y2 = xy
    text(d, ((x1 + x2) // 2, (y1 + y2) // 2 - 2), label, size, color, True, anchor="mm")


def header(d, no, title, sub=None, accent=COLORS["navy"]):
    pill(d, (94, 72, 284, 124), no, accent, size=26)
    text(d, (98, 160), title, 60, COLORS["navy"], True, spacing=10)
    if sub:
        text(d, (104, 245), sub, 30, COLORS["muted"], False)


def mini_card(d, xy, title, body, accent=COLORS["blue"], title_size=34, body_size=28):
    x1, y1, x2, y2 = xy
    rr(d, xy, COLORS["white"], COLORS["line"], 26, 2)
    d.rounded_rectangle((x1, y1, x1 + 12, y2), radius=12, fill=accent)
    text(d, (x1 + 34, y1 + 28), title, title_size, COLORS["navy"], True)
    fit(d, (x1 + 34, y1 + 86), body, x2 - x1 - 70, body_size, COLORS["muted"], False, spacing=9)


def table(d, x, y, widths, rows, row_h=70, size=28):
    total = sum(widths)
    for r, row in enumerate(rows):
        yy = y + r * row_h
        fill = COLORS["navy"] if r == 0 else (COLORS["white"] if r % 2 else "#F7FAFF")
        rr(d, (x, yy, x + total, yy + row_h), fill, COLORS["line"], 12, 2)
        xx = x
        for c, cell in enumerate(row):
            col = COLORS["white"] if r == 0 else COLORS["ink"]
            bold = r == 0 or c == 0
            text(d, (xx + widths[c] / 2, yy + row_h / 2 - 2), str(cell), size, col, bold, anchor="mm", align="center")
            if c:
                d.line((xx, yy + 12, xx, yy + row_h - 12), fill=COLORS["line"], width=2)
            xx += widths[c]


def save(img, i):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(OUT_DIR / f"{i:02d}.png", quality=95)


def slide_01():
    img = base(COLORS["cyan"])
    d = ImageDraw.Draw(img)
    pill(d, (96, 82, 360, 136), "AI DRILL", COLORS["navy"])
    text(d, (105, 190), "まず、みなさんに\n聞きたいです。", 78, COLORS["navy"], True, spacing=12)
    text(d, (112, 455), "通勤時間に、\n毎日どれくらい使っていますか？", 44, COLORS["muted"], True, spacing=10)
    rr(d, (985, 180, 1425, 375), COLORS["white"], COLORS["line"], 30, 3)
    text(d, (1205, 250), "片道", 42, COLORS["muted"], True, anchor="mm")
    text(d, (1205, 315), "何分？", 62, COLORS["blue"], True, anchor="mm")
    rr(d, (985, 430, 1425, 625), COLORS["white"], COLORS["line"], 30, 3)
    text(d, (1205, 500), "往復", 42, COLORS["muted"], True, anchor="mm")
    text(d, (1205, 565), "何分？", 62, COLORS["orange"], True, anchor="mm")
    rr(d, (170, 710, 1430, 800), COLORS["navy"], COLORS["navy"], 32, 1)
    text(d, (800, 755), "その時間、AIドリルに少しだけ当てられます。", 42, COLORS["white"], True, anchor="mm")
    save(img, 1)


def slide_02():
    img = base(COLORS["blue"])
    d = ImageDraw.Draw(img)
    header(d, "02", "通勤・退勤だけでも、かなり進みます", "AIドリルは1レッスン8分", COLORS["blue"])
    mini_card(d, (125, 345, 500, 590), "片道16分", "2レッスン\n30XP", COLORS["blue"], 40, 38)
    mini_card(d, (612, 345, 987, 590), "往復32分", "4レッスン\n60XP", COLORS["teal"], 40, 38)
    mini_card(d, (1099, 345, 1474, 590), "4日続ける", "16レッスン\n240XP", COLORS["orange"], 40, 38)
    rr(d, (215, 700, 1385, 795), "#EFFFFA", "#92E9DA", 32, 3)
    text(d, (800, 747), "“移動中に少し進める”だけで、もう卒業に近づく。", 40, COLORS["navy"], True, anchor="mm")
    save(img, 2)


def slide_03():
    img = base(COLORS["pink"])
    d = ImageDraw.Draw(img)
    header(d, "03", "スマホ時間、1日どれくらいありますか？", "SNS・動画・なんとなくスクロールの時間", COLORS["pink"])
    cards = [
        ("15分", "約2レッスン"),
        ("30分", "約3レッスン"),
        ("45分", "約5レッスン"),
    ]
    for i, (a, b) in enumerate(cards):
        x = 180 + i * 420
        rr(d, (x, 360, x + 350, 570), COLORS["white"], COLORS["line"], 30, 3)
        text(d, (x + 175, 430), a, 68, [COLORS["blue"], COLORS["pink"], COLORS["orange"]][i], True, anchor="mm")
        text(d, (x + 175, 505), b, 36, COLORS["navy"], True, anchor="mm")
    rr(d, (230, 690, 1370, 795), COLORS["navy"], COLORS["navy"], 32, 1)
    text(d, (800, 742), "ゼロにしなくていい。15〜30分だけ置き換える。", 40, COLORS["white"], True, anchor="mm")
    save(img, 3)


def slide_04():
    img = base(COLORS["gold"])
    d = ImageDraw.Draw(img)
    header(d, "04", "日常の“空き時間”は、意外とあります", "10分空いたら1レッスン。20分なら2レッスン", COLORS["orange"])
    items = [("朝の準備後", "8分"), ("アポ前", "8分"), ("昼休み", "16分"), ("待ち時間", "8分"), ("風呂前", "8分"), ("寝る前", "16分")]
    for i, (a, b) in enumerate(items):
        x = 105 + (i % 3) * 495
        y = 330 + (i // 3) * 175
        rr(d, (x, y, x + 430, y + 125), COLORS["white"], COLORS["line"], 24, 2)
        text(d, (x + 34, y + 32), a, 34, COLORS["navy"], True)
        text(d, (x + 34, y + 78), b + " = 進捗", 30, COLORS["orange"], True)
    rr(d, (230, 725, 1370, 805), "#FFF5E8", "#FFD59B", 28, 3)
    text(d, (800, 765), "まとまった時間より、“小さい時間の回収”が勝ち筋。", 38, COLORS["navy"], True, anchor="mm")
    save(img, 4)


def slide_05():
    img = base(COLORS["purple"])
    d = ImageDraw.Draw(img)
    header(d, "05", "ここにAIドリルを当てていきます", "新しく頑張るより、すでにある時間に差し込む", COLORS["purple"])
    table(d, 180, 340, [360, 360, 430], [
        ["日常時間", "置き換え", "進み方"],
        ["朝の通勤", "16分", "2レッスン"],
        ["昼・待ち時間", "16分", "2レッスン"],
        ["退勤中", "16分", "2レッスン"],
        ["スマホ時間", "24分", "3レッスン"],
        ["寝る前", "16分", "2レッスン"],
    ], 72, 29)
    rr(d, (1050, 710, 1410, 800), COLORS["navy"], COLORS["navy"], 28, 1)
    text(d, (1230, 755), "合計11本", 48, COLORS["gold"], True, anchor="mm")
    save(img, 5)


def slide_06():
    img = base(COLORS["orange"])
    d = ImageDraw.Draw(img)
    header(d, "06", "AIドリルは“消化”だけが目的ではない", "危機感を、今のうちにちゃんと持つ", COLORS["orange"])
    mini_card(d, (125, 350, 705, 585), "使える人と使えない人で差が出る", "返信の速さ、調査の深さ、提案の質。日常業務のスピードが変わる。", COLORS["blue"], 34, 28)
    mini_card(d, (895, 350, 1475, 585), "今のうちに触るから安全に使える", "セキュリティ、社内ルール、品質チェックを先に押さえる。", COLORS["pink"], 34, 28)
    rr(d, (180, 720, 1420, 805), COLORS["navy"], COLORS["navy"], 28, 1)
    text(d, (800, 762), "“便利そう”で止まらず、“仕事で使える”まで持っていく。", 39, COLORS["white"], True, anchor="mm")
    save(img, 6)


def slide_07():
    img = base(COLORS["teal"])
    d = ImageDraw.Draw(img)
    header(d, "07", "AIを使うと、営業の動き方が変わる", "1人で抱える仕事を、同時並行で進められる", COLORS["teal"])
    items = [
        ("返信", "たたき台を一瞬で作る"),
        ("調査", "複数観点で並行リサーチ"),
        ("提案", "相手別に切り口を変える"),
        ("振り返り", "商談ログから改善点を出す"),
    ]
    for i, (t, b) in enumerate(items):
        x = 120 + (i % 2) * 710
        y = 335 + (i // 2) * 190
        mini_card(d, (x, y, x + 640, y + 145), t, b, [COLORS["blue"], COLORS["teal"], COLORS["orange"], COLORS["purple"]][i], 38, 30)
    save(img, 7)


def slide_08():
    img = base(COLORS["pink"])
    d = ImageDraw.Draw(img)
    header(d, "08", "知らないまま使うのが一番危ない", "セキュリティと社内ルールを、先にそろえる", COLORS["pink"])
    table(d, 170, 340, [500, 640], [
        ["学ぶこと", "守れること"],
        ["情報セキュリティ", "入れていい情報・ダメな情報を判断"],
        ["品質チェック", "AIの出力をそのまま信じない"],
        ["再プロンプト", "欲しい答えに近づける"],
        ["社内ルール", "安心して業務に使う"],
    ], 78, 28)
    save(img, 8)


def slide_09():
    img = base(COLORS["gold"])
    d = ImageDraw.Draw(img)
    header(d, "09", "本来なら、学ぶのに月数万円かかる領域です", "それをチーム用に、今すぐ触れる形にしている", COLORS["orange"])
    rr(d, (175, 350, 705, 610), COLORS["white"], COLORS["line"], 32, 3)
    text(d, (440, 438), "外で学ぶと", 42, COLORS["muted"], True, anchor="mm")
    text(d, (440, 525), "月 数万円", 70, COLORS["orange"], True, anchor="mm")
    rr(d, (895, 350, 1425, 610), COLORS["white"], COLORS["line"], 32, 3)
    text(d, (1160, 438), "今ある環境なら", 42, COLORS["muted"], True, anchor="mm")
    text(d, (1160, 525), "すぐ使える", 70, COLORS["blue"], True, anchor="mm")
    rr(d, (220, 720, 1380, 805), COLORS["navy"], COLORS["navy"], 28, 1)
    text(d, (800, 762), "使える環境があるなら、今使い切る。", 42, COLORS["white"], True, anchor="mm")
    save(img, 9)


def slide_10():
    img = base(COLORS["cyan"])
    d = ImageDraw.Draw(img)
    header(d, "10", "1日1時間〜1時間半を、自分たちも再現する", "生徒さんに伝えていることを、まず僕たちがやり切る", COLORS["cyan"])
    rr(d, (160, 355, 675, 615), COLORS["white"], COLORS["line"], 32, 3)
    text(d, (418, 435), "毎日", 42, COLORS["muted"], True, anchor="mm")
    text(d, (418, 525), "60〜90分", 74, COLORS["blue"], True, anchor="mm")
    rr(d, (925, 355, 1440, 615), COLORS["white"], COLORS["line"], 32, 3)
    text(d, (1182, 435), "やること", 42, COLORS["muted"], True, anchor="mm")
    text(d, (1182, 525), "入門編卒業", 60, COLORS["orange"], True, anchor="mm")
    fit(d, (235, 720), "“時間がない”を超える設計を、自分たちの行動で見せる。", 1130, 42, COLORS["navy"], True)
    save(img, 10)


def slide_11():
    img = base(COLORS["blue"])
    d = ImageDraw.Draw(img)
    header(d, "11", "日曜までに、入門編を卒業する", "チーム全体で、まず一周する空気を作る", COLORS["blue"])
    table(d, 225, 350, [380, 380, 390], [
        ["進め方", "目安", "考え方"],
        ["通勤・退勤", "2〜4本", "移動を進捗に"],
        ["スマホ時間", "2〜3本", "少し置き換え"],
        ["夜の短時間", "3本", "24分だけ集中"],
        ["ゼロの日", "作らない", "1本でOK"],
    ], 78, 29)
    save(img, 11)


def slide_12():
    img = base(COLORS["purple"])
    d = ImageDraw.Draw(img)
    header(d, "12", "毎朝7:30、AIドリル勉強会をやります", "日曜まで、朝のスタートをみんなでそろえる", COLORS["purple"])
    rr(d, (170, 355, 720, 620), COLORS["white"], COLORS["line"], 34, 3)
    text(d, (445, 435), "開始", 44, COLORS["muted"], True, anchor="mm")
    text(d, (445, 530), "朝 7:30", 82, COLORS["blue"], True, anchor="mm")
    rr(d, (880, 355, 1430, 620), COLORS["white"], COLORS["line"], 34, 3)
    text(d, (1155, 435), "内容", 44, COLORS["muted"], True, anchor="mm")
    text(d, (1155, 530), "AIドリル\nオロチ勉強会", 52, COLORS["orange"], True, anchor="mm", spacing=8)
    rr(d, (220, 725, 1380, 805), COLORS["navy"], COLORS["navy"], 28, 1)
    text(d, (800, 765), "一人でやるより、朝に集まるほうが続きやすい。", 39, COLORS["white"], True, anchor="mm")
    save(img, 12)


def slide_13():
    img = base(COLORS["orange"])
    d = ImageDraw.Draw(img)
    header(d, "13", "ちなみに田仲は、毎日5:30起き確定です", "朝7:30にやるということは、準備も含めてこうなります", COLORS["orange"])
    rr(d, (240, 330, 1360, 620), COLORS["white"], COLORS["line"], 36, 3)
    text(d, (800, 430), "5:30 起床", 92, COLORS["orange"], True, anchor="mm")
    text(d, (800, 535), "眠いとか言ってられないやつです。", 48, COLORS["navy"], True, anchor="mm")
    rr(d, (250, 720, 1350, 805), "#FFF4E5", "#FFD39A", 28, 3)
    text(d, (800, 762), "でも、それくらい本気でやる価値があります。", 40, COLORS["navy"], True, anchor="mm")
    save(img, 13)


def slide_14():
    img = base(COLORS["green"])
    d = ImageDraw.Draw(img)
    header(d, "14", "今日やることは、シンプルです", "まず動き出す。完璧に理解しようとしすぎない", COLORS["green"])
    items = [
        ("1", "通勤・退勤で1〜2本"),
        ("2", "スマホ時間を15分だけ置き換え"),
        ("3", "夜に3本だけ進める"),
        ("4", "朝7:30の勉強会に乗る"),
    ]
    for i, (n, b) in enumerate(items):
        x = 135 + (i % 2) * 675
        y = 330 + (i // 2) * 185
        rr(d, (x, y, x + 610, y + 135), COLORS["white"], COLORS["line"], 26, 2)
        pill(d, (x + 30, y + 34, x + 92, y + 96), n, [COLORS["blue"], COLORS["pink"], COLORS["orange"], COLORS["purple"]][i], size=28)
        fit(d, (x + 120, y + 42), b, 450, 34, COLORS["navy"], True)
    save(img, 14)


def slide_15():
    img = base(COLORS["cyan"])
    d = ImageDraw.Draw(img)
    pill(d, (96, 82, 360, 136), "FINAL", COLORS["navy"])
    text(d, (105, 188), "AIドリルは、\n時間の置き換えで進められる。", 64, COLORS["navy"], True, spacing=12)
    text(d, (112, 415), "でも目的は、ただの消化ではありません。\nAIを安全に、仕事で使える状態にすること。", 40, COLORS["muted"], True, spacing=10)
    rr(d, (170, 625, 1430, 725), COLORS["white"], COLORS["line"], 32, 3)
    text(d, (800, 675), "日曜までに、みんなで入門編を卒業しよう。", 46, COLORS["blue"], True, anchor="mm")
    rr(d, (260, 770, 1340, 830), COLORS["navy"], COLORS["navy"], 28, 1)
    text(d, (800, 800), "まずは今日、1本。ここから差がつきます。", 34, COLORS["white"], True, anchor="mm")
    save(img, 15)


def contact_sheet():
    imgs = []
    for p in sorted(OUT_DIR.glob("[0-9][0-9].png")):
        im = Image.open(p).convert("RGB")
        im.thumbnail((320, 180))
        c = Image.new("RGB", (340, 215), "white")
        c.paste(im, (10, 10))
        d = ImageDraw.Draw(c)
        d.text((12, 190), p.name, fill=rgb(COLORS["ink"]), font=f(20, True))
        imgs.append(c)
    cols = 3
    rows = math.ceil(len(imgs) / cols)
    sheet = Image.new("RGB", (cols * 340, rows * 215), "#F4F8FF")
    for i, im in enumerate(imgs):
        sheet.paste(im, ((i % cols) * 340, (i // cols) * 215))
    sheet.save(OUT_DIR / "contact_sheet.png", quality=95)


def main():
    for fn in [
        slide_01, slide_02, slide_03, slide_04, slide_05,
        slide_06, slide_07, slide_08, slide_09, slide_10,
        slide_11, slide_12, slide_13, slide_14, slide_15,
    ]:
        fn()
    contact_sheet()
    print(f"saved {len(list(OUT_DIR.glob('[0-9][0-9].png')))} slides to {OUT_DIR.resolve()}")


if __name__ == "__main__":
    main()
