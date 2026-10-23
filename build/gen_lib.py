# -*- coding: utf-8 -*-
"""把用户导入的 700 条生字表写进 lib.js 的 CHARS（替换最初 97 字示例字库）"""
import io, json, os, re

os.chdir(os.path.dirname(os.path.abspath(__file__)))

SRC = '_verify_lib.json'
recs = json.load(io.open(SRC, encoding='utf-8'))

# 分组按年级顺序（数据表里已是块状连续，保持原顺序）
groups = []
for r in recs:
    g = r['分组']
    if g not in groups:
        groups.append(g)

def jsq(s):
    s = s.replace('\\', '\\\\').replace("'", "\\'")
    return s

lines = []
for r in recs:
    w = (r.get('字词') or '').strip()
    if not w:
        continue
    p = (r.get('拼音') or '').strip()
    g = r.get('分组') or '未分组'
    wd = (r.get('组词') or '').strip()
    on = 'true' if r.get('启用', True) else 'false'
    lines.append("{c:'%s',p:'%s',g:'%s',w:'%s',on:%s},"
                 % (jsq(w), jsq(p), jsq(g), jsq(wd), on))

head = """/* ================= 内置字库（由「生活语文生字.xlsx」导入，700 条 / 22 个册次分组） ================= */
var CL = '<' + '/';
/* ================= 字库与图示素材（全部内联，零外部依赖） ================= */
var CHARSET_VER = 'xlsx-2026-10-21';
var STAGES = [%s];
var STAGE_FULL = STAGES.slice();

/* c = 字；p = 拼音；g = 分组（册次）；w = 组词；on = 启用 */
var CHARS = [
""" % ', '.join("'%s'" % jsq(g) for g in groups)

tail_marker = '\n];\n'
raw = io.open('lib.js', encoding='utf-8').read()
idx = raw.index(tail_marker)
rest = raw[idx + len(tail_marker):]

out = head + '\n'.join(lines) + '\n];\n' + rest
io.open('lib.js', 'w', encoding='utf-8').write(out)

print('分组 %d 个：%s' % (len(groups), ' / '.join(groups)))
print('字库 %d 条写入 lib.js，文件 %d KB' % (len(lines), len(out.encode('utf-8')) // 1024))
