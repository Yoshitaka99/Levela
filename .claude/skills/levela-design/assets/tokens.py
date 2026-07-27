"""Levela デザイントークン（pptx / 画像生成用）。

値の意味と使い分けは .claude/skills/levela-design/references/brand.md を読むこと。
出典は public/levela-start-logo.png と app/globals.css の .levela-splash* の実測値なので、
勝手に変えない。

使い方:

    import sys
    sys.path.append(".claude/skills/levela-design/assets")
    from tokens import INK, PAPER_50, ACCENT, rgb, TITLE_PT

    from pptx.util import Pt, Inches
    run.font.color.rgb = rgb(INK)
    run.font.name = FONT_JA_BOLD
    run.font.size = Pt(TITLE_PT)
"""

from __future__ import annotations

# --------------------------------------------------------------------------
# 色（16進文字列。pptx で使うときは rgb() を通す）
# --------------------------------------------------------------------------

# 紙
PAPER_0 = "FFFFFF"
PAPER_50 = "FFFDFA"
PAPER_100 = "F6F2EA"
PAPER_200 = "ECE6DC"

# 墨
INK = "231815"          # 本文・見出し。白地 17.31:1
INK_800 = "3A2C27"
INK_600 = "5C4B44"      # 副次的な文字。白地 8.25:1
INK_500 = "6B5A52"      # 弱い文字の下限。白地 6.54:1
INK_400 = "8B7A72"      # 装飾・アイコンのみ。本文には使わない
INK_200 = "C9BFB8"      # 装飾罫
INK_100 = "E7E1D8"

# アクセント
ACCENT = "E50012"       # ロゴ赤。1スライドに1箇所だけ
ACCENT_TEXT = "B3000E"  # 小さい赤文字はこちら。白地 7.18:1
BRASS = "BAA279"        # 暗背景専用。明背景の文字に使うと 2.46:1 で読めない

# 意味
SUCCESS = "0F7B5A"
WARNING = "8F5A00"
DANGER = "E50012"

# 暗モード面
SURFACE_BASE = "171010"
SURFACE = "231815"
SURFACE_RAISED = "3A2C27"
ON_SURFACE = "F6F2EA"
ON_SURFACE_MUTED = "B9AAA3"
SUCCESS_DARK = "4CC79B"
WARNING_DARK = "E8B45C"
DANGER_DARK = "FF6B5E"

# --------------------------------------------------------------------------
# チャート配色（色相で区別する設計。輝度だけでは区別できないので直接ラベルを置く）
# --------------------------------------------------------------------------

CHART_LIGHT = ["231815", "2F5D8C", "0F7B5A", "7A4A6E", "8F5A00", "5C7A3F"]
CHART_LIGHT_HIGHLIGHT = ACCENT

CHART_DARK = ["F6F2EA", "7FA8D4", "4CC79B", "C79BB8", "E8B45C", "A8C07E"]
CHART_DARK_HIGHLIGHT = DANGER_DARK

# --------------------------------------------------------------------------
# 書体
# --------------------------------------------------------------------------

FONT_JA_BOLD = "Yu Gothic"       # 見出し（ファイル実体は YuGothB.ttc）
FONT_JA = "Yu Gothic"            # 本文（YuGothM.ttc）
FONT_JA_FALLBACK = "Meiryo UI"   # Yu Gothic が無い環境
FONT_MONO = "Consolas"           # 数値・コード

FONT_FILE_BOLD = "YuGothB.ttc"
FONT_FILE_MEDIUM = "YuGothM.ttc"
FONT_FILE_REGULAR = "YuGothR.ttc"

# --------------------------------------------------------------------------
# 版面（16:9 / 13.333 x 7.5 inch）
# --------------------------------------------------------------------------

SLIDE_W_IN = 13.333
SLIDE_H_IN = 7.5

MARGIN_X_IN = 0.9
MARGIN_TOP_IN = 0.75
MARGIN_BOTTOM_IN = 0.6

CONTENT_W_IN = SLIDE_W_IN - MARGIN_X_IN * 2   # 11.533
CONTENT_H_IN = SLIDE_H_IN - MARGIN_TOP_IN - MARGIN_BOTTOM_IN  # 6.15

# 文字サイズ（pt）。投影用は本文 14pt 未満にしない
COVER_TITLE_PT = 42
TITLE_PT = 28
SUBTITLE_PT = 18
BODY_PT = 15
NOTE_PT = 11
PAGENUM_PT = 11

# 余白（inch）。4の倍数ルールをinchに落としたもの
GAP_XS_IN = 0.08
GAP_S_IN = 0.16
GAP_M_IN = 0.32
GAP_L_IN = 0.5
GAP_XL_IN = 0.75

LINE_SPACING_JA = 1.6   # 和文の行間。これ未満にすると詰まって読めない


# --------------------------------------------------------------------------
# ヘルパー
# --------------------------------------------------------------------------

def rgb(hex_str: str):
    """'231815' や '#231815' を python-pptx の RGBColor にする。"""
    from pptx.dml.color import RGBColor

    return RGBColor.from_string(hex_str.lstrip("#").upper())


def rgb_tuple(hex_str: str) -> tuple[int, int, int]:
    """Pillow など (r, g, b) を受け取るライブラリ用。"""
    h = hex_str.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def _luminance(hex_str: str) -> float:
    def channel(c: int) -> float:
        v = c / 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4

    r, g, b = rgb_tuple(hex_str)
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def contrast(fg: str, bg: str) -> float:
    """WCAG のコントラスト比。brand.md の表に無い組み合わせを使う前に必ず通す。

    本文なら 4.5 以上、大きい文字・UIの境界なら 3.0 以上が必要。
    目視で判断しないこと。
    """
    a, b = _luminance(fg), _luminance(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def assert_readable(fg: str, bg: str, *, large: bool = False) -> None:
    """読めない組み合わせを実行時に落とす。生成スクリプトの先頭で使うと事故が減る。"""
    need = 3.0 if large else 4.5
    ratio = contrast(fg, bg)
    if ratio < need:
        raise ValueError(
            f"コントラスト不足: #{fg} on #{bg} = {ratio:.2f}:1 (必要 {need}:1)。"
            " brand.md のコントラスト表から選び直すこと。"
        )
