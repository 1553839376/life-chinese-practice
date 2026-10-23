# -*- coding: utf-8 -*-
"""把 art_pack1.json 转成页面可直接用的 p_art.js（var ART_PACK）。"""
import io, json, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

A = json.load(io.open('art_pack1.json', encoding='utf-8'))
keys = list(A.keys())

buf = ['/* 图示库：字 -> 内联 SVG。'
       '40 张插画位图（动物/人物动作/身体）+ 67 张扁平手绘，全部内联、离线可用。 */',
       'var ART_PACK = {']
for i, k in enumerate(keys):
    body = json.dumps(A[k], ensure_ascii=False)
    buf.append('%s:%s%s' % (json.dumps(k, ensure_ascii=False), body,
                            ',' if i < len(keys) - 1 else ''))
buf.append('};')

raw = '\n'.join(buf)
io.open('p_art.js', 'w', encoding='utf-8').write(raw)
print('p_art.js', len(keys), '个，', len(raw.encode('utf-8')) // 1024, 'KB')
