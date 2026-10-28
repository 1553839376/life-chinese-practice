# -*- coding: utf-8 -*-
"""G4 线上产物校验：抽 <style>/<script> 块逐字节比对。

两边都要过滤空块——平台会给每个页面注入一个空的 inject.js <script>，
只过滤本地侧会让索引错位，内容一致却报 DIFF。
"""
import hashlib
import io
import re
import sys

LOC = 'build/生活语文练习台.html'
PUB = 'build/_pubcheck22/生活语文练习台.html'


def blocks(s):
    out = []
    for m in re.finditer(r'<(style|script)([^>]*)>(.*?)</\1>', s, re.S):
        body = m.group(3)
        if not body.strip():
            continue
        out.append((m.group(1), body))
    return out


loc = io.open(LOC, encoding='utf-8').read()
pub = io.open(PUB, encoding='utf-8').read()
a, b = blocks(loc), blocks(pub)

print('本地 %d B / %d 块；线上 %d B / %d 块' % (
    len(loc.encode('utf-8')), len(a), len(pub.encode('utf-8')), len(b)))
print('线上比本地多 %d 字符（平台注入）' % (len(pub) - len(loc)))

bad = 0
for i in range(max(len(a), len(b))):
    la = a[i] if i < len(a) else None
    lb = b[i] if i < len(b) else None
    if la is None or lb is None:
        print('  块 %d 只在一侧：%s' % (i, (la or lb)[0]))
        bad += 1
        continue
    if la[0] != lb[0]:
        print('  块 %d 标签不同：%s vs %s' % (i, la[0], lb[0]))
        bad += 1
        continue
    ha = hashlib.md5(la[1].encode('utf-8')).hexdigest()
    hb = hashlib.md5(lb[1].encode('utf-8')).hexdigest()
    ok = (ha == hb)
    print('  %-6s 块 %d  %8d B  %s' % ('OK' if ok else 'DIFF', i, len(la[1].encode('utf-8')), ha))
    if not ok:
        bad += 1
        # 找第一处不同
        for k in range(min(len(la[1]), len(lb[1]))):
            if la[1][k] != lb[1][k]:
                print('        首个差异 @%d: 本地 %r / 线上 %r' % (
                    k, la[1][k - 40:k + 40], lb[1][k - 40:k + 40]))
                break

print('\n结论：%s（%d 块）' % ('一致' if bad == 0 else '有 %d 块不一致' % bad, len(a)))
sys.exit(0 if bad == 0 else 1)
