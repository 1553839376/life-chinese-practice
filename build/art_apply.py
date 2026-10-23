# -*- coding: utf-8 -*-
"""把 art_animals.py 里的重画版合并进 art_pack1.json"""
import json, io
from art_animals import A

ART = json.load(io.open('art_pack1.json', encoding='utf-8'))
ART.update(A)
io.open('art_pack1.json', 'w', encoding='utf-8').write(
    json.dumps(ART, ensure_ascii=False, indent=1))
print('已合并', len(A), '个:', ' '.join(A.keys()), '| 总计', len(ART))
