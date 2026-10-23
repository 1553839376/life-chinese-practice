# -*- coding: utf-8 -*-
"""按顺序渲染 art_pack1 的一部分，用于目检。
用法: python _render_part.py <src.json> <out.png> <start> <end> [cols]
"""
import json, io, os, sys, fitz

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
src = sys.argv[1]
out = sys.argv[2]
a, b = int(sys.argv[3]), int(sys.argv[4])
COLS = int(sys.argv[5]) if len(sys.argv) > 5 else 6

ART = json.load(io.open(src, encoding='utf-8'))
keys = list(ART.keys())[a:b]
os.makedirs('_a', exist_ok=True)

CELL = 190
pngs = []
for k in keys:
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" '
           'width="%d" height="%d"><rect width="120" height="120" fill="#ffffff"/>%s</svg>'
           % (CELL, CELL, ART[k]))
    sp = os.path.join('_a', 'p_%s.svg' % k)
    io.open(sp, 'w', encoding='utf-8').write(svg)
    doc = fitz.open(sp)
    pix = doc[0].get_pixmap(dpi=144)
    pp = os.path.join('_a', 'p_%s.png' % k)
    pix.save(pp)
    doc.close()
    pngs.append((k, pp))

rows = (len(pngs) + COLS - 1) // COLS
W, H = CELL * COLS, CELL * rows
doc = fitz.open()
page = doc.new_page(width=W, height=H)
page.draw_rect(fitz.Rect(0, 0, W, H), color=None, fill=(1, 1, 1))
for i, (k, pp) in enumerate(pngs):
    r, c = divmod(i, COLS)
    rect = fitz.Rect(c * CELL + 3, r * CELL + 3, c * CELL + CELL - 3, r * CELL + CELL - 3)
    page.insert_image(rect, filename=pp)
pix = page.get_pixmap(dpi=100)
pix.save(out)
print('->', out, '|', ' '.join(k for k, _ in pngs))
