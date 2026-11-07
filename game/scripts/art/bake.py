"""Derived art baked from the generated sprites in assets/art (run: python3 scripts/art/bake.py).
- gem_<colour>.png: the white move gem (btn_move_gem) with its face tinted per move (gold bevel kept)
- icon_coin.png / icon_token.png: the two halves of icon_coin_token
- defender_saffron.png: the teal defender re-dyed in my team's saffron (my defenders when I defend)
- raider_teal.png: the CPU raider = defender_teal mirrored (opponent kit), facing my half
"""
import colorsys, os
from PIL import Image

ART = os.path.join(os.path.dirname(__file__), "..", "..", "assets", "art")
p = lambda n: os.path.join(ART, n)

gem = Image.open(p("btn_move_gem.png")).convert("RGBA")
COL = {"saffron": (255, 150, 30), "crimson": (232, 54, 61), "cyan": (18, 181, 229), "violet": (140, 80, 230), "green": (46, 170, 90), "gold": (255, 196, 0), "navy": (45, 59, 203)}
px = gem.load()
w, h = gem.size
for name, (cr, cg, cb) in COL.items():
    out = gem.copy(); o = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0: continue
            hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if ss < 0.18 and vv > 0.55:  # the white/grey face
                k = vv
                hi = max(0.0, (vv - 0.88) / 0.12)  # keep the specular highlight
                nr = cr * k * 0.95 + 255 * hi * 0.6
                ng = cg * k * 0.95 + 255 * hi * 0.6
                nb = cb * k * 0.95 + 255 * hi * 0.6
                o[x, y] = (min(255, int(nr)), min(255, int(ng)), min(255, int(nb)), a)
    out = out.resize((256, int(256 * h / w)), Image.LANCZOS)
    out.save(p(f"gem_{name}.png"))

ic = Image.open(p("icon_coin_token.png")).convert("RGBA")
W, H = ic.size
# The generated sheet cuts the coin's left rim at x=0 (the coin is centred at x~87, rim reaches x~225): rebuild the
# missing 51 px by mirroring the right rim about the centre, so the icon is a whole coin (QA: "coin clipped on its
# left edge" in every currency pill).
coin_src = ic.crop((0, 0, 234, H))
CUT = 51
coin = Image.new("RGBA", (234 + CUT, H), (0, 0, 0, 0))
coin.alpha_composite(coin_src, (CUT, 0))
cp, sp = coin.load(), coin_src.load()
for y in range(H):
    for x in range(CUT):
        coin_x = 225 - x  # mirror of source column x - CUT about the centre column 87
        cp[x, y] = sp[coin_x, y]
for name, src in {"icon_coin": coin, "icon_token": ic.crop((234, 0, W, H))}.items():
    c = src
    bb = c.getbbox()
    c = c.crop(bb)
    s = max(c.size)
    s = int(s * 1.04)
    sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sq.alpha_composite(c, ((s - c.width) // 2, (s - c.height) // 2))
    sq.resize((192, 192), Image.LANCZOS).save(p(f"{name}.png"))

d = Image.open(p("defender_teal.png")).convert("RGBA")
o = d.copy(); dp = d.load(); op = o.load()
for y in range(d.height):
    for x in range(d.width):
        r, g, b, a = dp[x, y]
        if a == 0: continue
        hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if 0.40 < hh < 0.58 and ss > 0.25:  # teal kit
            nh = 0.075
            nr, ng, nb = colorsys.hsv_to_rgb(nh, max(0.82, min(1, ss * 1.1)), min(1, vv * 1.45 + 0.08))
            op[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
o.save(p("defender_saffron.png"))
d.transpose(Image.FLIP_LEFT_RIGHT).save(p("raider_teal.png"))
print("baked")
