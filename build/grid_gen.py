# -*- coding: utf-8 -*-
"""把生成的位图拼成一张检查图。用法：python grid_gen.py out.png a.png b.png ..."""
import sys, os, fitz

out_path = sys.argv[1]
files = sys.argv[2:]
CELL, COLS = 300, 4
rows = (len(files) + COLS - 1) // COLS
W, H = CELL * COLS, CELL * rows
doc = fitz.open()
page = doc.new_page(width=W, height=H)
page.draw_rect(fitz.Rect(0, 0, W, H), color=None, fill=(1, 1, 1))
for i, f in enumerate(files):
    r, c = divmod(i, COLS)
    rect = fitz.Rect(c * CELL + 3, r * CELL + 3, c * CELL + CELL - 3, r * CELL + CELL - 3)
    page.insert_image(rect, filename=f)
doc.save('_g.pdf')
doc[0].get_pixmap(dpi=120).save(out_path)
print('拼图', len(files), '->', out_path)
