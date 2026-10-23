# -*- coding: utf-8 -*-
import io, os, sys
import fitz
sys.path.insert(0, '.')
import art_people as P


def grid(d, out, cols=4, cell=300):
    os.makedirs('_a', exist_ok=True)
    items = list(d.items())
    rows = (len(items) + cols - 1) // cols
    doc = fitz.open()
    page = doc.new_page(width=cell * cols, height=cell * rows)
    page.draw_rect(fitz.Rect(0, 0, cell * cols, cell * rows), color=None, fill=(1, 1, 1))
    for i, (k, body) in enumerate(items):
        svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" '
               'width="%d" height="%d"><rect width="120" height="120" fill="#ffffff"/>%s</svg>'
               % (cell, cell, body))
        sp = '_a/g_%s.svg' % k
        io.open(sp, 'w', encoding='utf-8').write(svg)
        d2 = fitz.open(sp)
        pix = d2[0].get_pixmap(dpi=144)
        pp = '_a/g_%s.png' % k
        pix.save(pp)
        d2.close()
        r, c = divmod(i, cols)
        page.insert_image(fitz.Rect(c * cell + 4, r * cell + 4, c * cell + cell - 4, r * cell + cell - 4),
                          filename=pp)
    page.get_pixmap(dpi=72).save(out)
    print(out, ' '.join(k for k, _ in items))


if __name__ == '__main__':
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if which == 'act':
        grid({k: v for k, v in P.CARDS.items() if k not in ('手', '足', '口', '耳', '牙')}, '_pa.png', 4)
    elif which == 'bod':
        grid({k: v for k, v in P.CARDS.items() if k in ('手', '足', '口', '耳', '牙')}, '_pb.png', 3)
    else:
        grid(P.CARDS, '_pall.png', 4)
