# -*- coding: utf-8 -*-
"""从 v1 页面里抽出 ART 字典（扁平 SVG），处理 '+ CL +' 拼接，校验 XML。"""
import io
import re
import json
import xml.etree.ElementTree as ET

src = io.open('../识字启蒙台.html', encoding='utf-8').read()
i = src.index('var ART = {')
j = src.index('\n};', i)
block = src[i:j]
# 还原 "'a' + CL + 'b'" 这种拼接：CL = '</'
block = block.replace("' + CL + '", "</")
pairs = re.findall(r"(\w+)\s*:\s*'((?:[^'\\]|\\.)*)'", block)

out, bad = {}, []
for k, v in pairs:
    v = v.replace("\\'", "'")
    try:
        ET.fromstring('<svg xmlns="http://www.w3.org/2000/svg">%s</svg>' % v)
        out[k] = v
    except Exception as e:
        bad.append((k, str(e)[:60]))

io.open('v1_art.json', 'w', encoding='utf-8').write(
    json.dumps(out, ensure_ascii=False, indent=1))
print('可用', len(out), ' '.join(out.keys()))
print('损坏', len(bad), bad)
