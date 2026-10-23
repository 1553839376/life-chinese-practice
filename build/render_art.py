# -*- coding: utf-8 -*-
"""把 art_pack1.json 里的 SVG 渲染成拼版 PNG，便于目检。
用法: python render_art.py [key1 key2 ...]   不给 key 则渲染全部
"""
import json, io, os, sys, fitz

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
ART = json.load(io.open('art_pack1.json', encoding='utf-8'))
keys = sys.argv[1:] or list(ART.keys())
os.makedirs('_a', exist_ok=True)

CELL = 200
COLS = 5
pngs = []
for k in keys:
    body = ART[k]
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" '
           'width="%d" height="%d"><rect width="120" height="120" fill="#ffffff"/>%s</svg>'
           % (CELL, CELL, body))
    sp = os.path.join('_a', k + '.svg')
    io.open(sp, 'w', encoding='utf-8').write(svg)
    doc = fitz.open(sp)
    pix = doc[0].get_pixmap(dpi=144)
    pp = os.path.join('_a', k + '.png')
    pix.save(pp)
    doc.close()
    pngs.append((k, pp))

rows = (len(pngs) + COLS - 1) // COLS
W, H = CELL * COLS, CELL * rows
out = fitz.open()
page = out.new_page(width=W, height=H)
page.draw_rect(fitz.Rect(0, 0, W, H), color=None, fill=(1, 1, 1))
for i, (k, pp) in enumerate(pngs):
    r, c = divmod(i, COLS)
    rect = fitz.Rect(c * CELL + 4, r * CELL + 4, c * CELL + CELL - 4, r * CELL + CELL - 4)
    page.insert_image(rect, filename=pp)
out.save('_grid.pdf')
pix = out[0].get_pixmap(dpi=110)
pix.save('_grid.png')
print('渲染', len(pngs), '个 ->', '_grid.png')
print('顺序:', ' | '.join(k for k, _ in pngs))
