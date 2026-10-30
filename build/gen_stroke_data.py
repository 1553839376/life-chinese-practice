# -*- coding: utf-8 -*-
"""把 hanzi-writer-data 的笔顺 JSON 压成 p_stroke.js（单文件内联用）。

数据来源：https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/<字>.json
  该数据由 Make Me a Hanzi 派生（Arphic Public License），坐标 0-1024、y 轴向下。

压缩办法（无损，不抽稀）：
  · 每个数字 = 2 个 base36 字符，值为 (v + 128)，覆盖 -128 .. 1167
    （实测全库 -92..1005，够用）。原始 JSON 里每个数字连空格约 4 字节，这里固定 2。
  · 命令字母单字符：M/L/Q/C/Z，后面跟对应个数的坐标对。
  · 每个字一条字符串：`轮廓路径|笔迹0|笔迹1|...`，笔迹只存点（每点 4 字符），
    笔画数由轮廓里的 M 个数数出来，不单独存计数。

为什么保留轮廓（strokes）不只是笔迹（medians）：
  灰底字、以及「写完之后整笔变红」都要真实笔画形状；只有笔迹会画成光秃秃的线条，
  描红时孩子分不清笔画粗细，等于给了一个错误的范例。
"""
import io, json, os, re, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/hzdata'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'p_stroke.js')
OFF = 128
DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'
ARITY = {'M': 2, 'L': 2, 'Q': 4, 'C': 6, 'Z': 0}


def enc(v):
    n = int(round(v)) + OFF
    if n < 0 or n > 35 * 36 + 35:
        raise ValueError('坐标越界 %r' % v)
    return DIGITS[n // 36] + DIGITS[n % 36]


def dec2(s):
    return DIGITS.index(s[0]) * 36 + DIGITS.index(s[1]) - OFF


def tokenize(path):
    return re.findall(r'[A-Za-z]|-?\d+\.?\d*', path)


def encode_char(d):
    strokes = d['strokes']
    medians = d['medians']
    if len(strokes) != len(medians):
        raise ValueError('笔画与笔迹数量不一致')
    out = []
    nnum = 0
    ncmd = 0
    for s in strokes:
        toks = tokenize(s)
        i = 0
        while i < len(toks):
            t = toks[i]
            if t.isalpha():
                c = t.upper()
                out.append(c)
                ncmd += 1
                i += 1
                continue
            out.append(enc(float(t)))
            nnum += 1
            i += 1
    body = ''.join(out)
    meds = []
    for m in medians:
        buf = []
        for p in m:
            buf.append(enc(p[0]))
            buf.append(enc(p[1]))
            nnum += 2
        meds.append(''.join(buf))
    return body + '|' + '|'.join(meds), len(strokes), nnum, ncmd


def verify(d, packed):
    """往返校验：把压缩串解回来，和原始 JSON 的每个数字逐个比对。"""
    parts = packed.split('|')
    body = parts[0]
    # 解轮廓
    i = 0
    nums = []
    cmds = []
    while i < len(body):
        ch = body[i]
        if ch.isalpha():
            cmds.append(ch)
            i += 1
            if ARITY[ch]:
                nums.extend(dec2(body[i + 2 * k:i + 2 * k + 2])
                            for k in range(ARITY[ch]))
                i += 2 * ARITY[ch]
        else:
            raise ValueError('非法字符 ' + ch)
    orig_nums = []
    orig_cmds = []
    for s in d['strokes']:
        for t in tokenize(s):
            if t.isalpha():
                orig_cmds.append(t.upper())
            else:
                orig_nums.append(int(round(float(t))))
    if nums != orig_nums or cmds != orig_cmds:
        return False
    meds = []
    for p in parts[1:]:
        pts = []
        for k in range(0, len(p), 4):
            pts.append([dec2(p[k:k + 2]), dec2(p[k + 2:k + 4])])
        meds.append(pts)
    orig_meds = [[[int(round(x)), int(round(y))] for x, y in m] for m in d['medians']]
    return meds == orig_meds


def main():
    chars = sorted(f[:-5] for f in os.listdir(SRC) if f.endswith('.json'))
    entries = []
    tot_strokes = 0
    bad = []
    for c in chars:
        d = json.load(io.open(os.path.join(SRC, c + '.json'), encoding='utf-8'))
        packed, ns, _, _ = encode_char(d)
        if not verify(d, packed):
            bad.append(c)
            continue
        tot_strokes += ns
        entries.append('"%s":"%s"' % (c, packed))

    js = ['/* 笔顺数据（自动生成，勿手改）—— build/gen_stroke_data.py\n'
          '   来源 hanzi-writer-data@2.0.1（派生自 Make Me a Hanzi，Arphic Public License）。\n'
          '   每个字一条：`轮廓路径|笔迹0|笔迹1|...`，数字为 2 字符 base36 的 (坐标+128)。*/\n',
          'var STROKE_PACK = {\n' + ',\n'.join(entries) + '\n};\n',
          'var STROKE_N = %d, STROKE_STROKES = %d;\n' % (len(entries), tot_strokes)]
    io.open(OUT, 'w', encoding='utf-8', newline='').write(''.join(js))
    size = os.path.getsize(OUT)
    raw = sum(os.path.getsize(os.path.join(SRC, c + '.json')) for c in chars)
    print('%s  %d 字 / %d 笔 / %.1f KB（原始 JSON %.2f MB，压到 %.1f%%）'
          % (os.path.basename(OUT), len(entries), tot_strokes, size / 1024.0,
             raw / 1048576.0, size * 100.0 / raw))
    if bad:
        print('往返校验失败：', ' '.join(bad))
        return 1
    print('往返校验：全部 %d 字无损通过' % len(entries))
    return 0


if __name__ == '__main__':
    sys.exit(main())
