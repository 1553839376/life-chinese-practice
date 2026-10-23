# -*- coding: utf-8 -*-
"""合成最终图示包：art_svg(第一批 30) + art_flat(剩余 81) + art_img(20 张位图)。
位图优先级最高。
"""
import json, io

SVG = json.load(io.open('art_svg.json', encoding='utf-8'))
FLAT = json.load(io.open('art_flat.json', encoding='utf-8'))
IMG = json.load(io.open('art_img.json', encoding='utf-8'))
PIC = json.load(io.open('_pic_chars.json', encoding='utf-8'))

ART = {}
ART.update(FLAT)
ART.update(SVG)
for ch, url in IMG.items():
    ART[ch] = ('<image x="0" y="0" width="120" height="120" '
               'preserveAspectRatio="xMidYMid meet" href="%s"/>' % url)

# 这几个字不画图，走"词语标红"降级（画脸一定诡异）
FALLBACK = ['头', '脸', '卜', '毛']
for ch in FALLBACK:
    ART.pop(ch, None)

io.open('art_pack1.json', 'w', encoding='utf-8').write(
    json.dumps(ART, ensure_ascii=False, indent=1))

n_img = sum(1 for v in ART.values() if v.startswith('<image'))
miss = [c for c in PIC if c not in ART]
extra = [c for c in ART if c not in PIC]
print('图库', len(ART), '个（位图', n_img, '）')
print('缺', len(miss), ''.join(miss))
print('多', len(extra), ''.join(extra))
print('大小', len(io.open('art_pack1.json', 'rb').read()) // 1024, 'KB')
