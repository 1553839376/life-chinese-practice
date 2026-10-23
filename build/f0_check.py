# -*- coding: utf-8 -*-
"""看「耳」「儿」的声调曲线对不对（客观分析，不靠耳朵猜）。

普通话调值：
  三声（耳 ěr、五 wǔ）＝ 214，**先降到最低再升上去**
  二声（儿 ér、无 wú）＝ 35，**一路往上**
如果 TTS 念的「耳」只有下降没有回升，就是「半三声」（21），听着会像二声的平调——这正是用户说的「怪」。

用自相关法估基频（F0），把曲线打成文字图对比。

用法：python build/f0_check.py
"""
import os

import miniaudio
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
TRY = os.path.join(HERE, '_tts', 'try_er')

SAMPLES = [
    ('耳 现状(晓晓)', os.path.join(HERE, '_tts', 'raw', 'u8033.mp3')),
    ('耳 切自「耳朵」', os.path.join(TRY, 'cut42_8033.mp3')),
    ('耳 云希', os.path.join(TRY, 'yunxi_u8033.mp3')),
    ('耳 云扬', os.path.join(TRY, 'yunyang_u8033.mp3')),
    ('耳 小妮(陕西)', os.path.join(TRY, 'xiaoni_u8033.mp3')),
    ('儿 现状(晓晓)', os.path.join(HERE, '_tts', 'raw', 'u513f.mp3')),
    ('儿 切自「儿子」', os.path.join(TRY, 'cut42_513f.mp3')),
    ('五 三声参照', os.path.join(HERE, '_tts', 'raw', 'u4e94.mp3')),
    ('无 二声参照', os.path.join(HERE, '_tts', 'raw', 'u65e0.mp3')),
]


def load(p):
    d = miniaudio.decode_file(p)
    a = np.frombuffer(d.samples, dtype=np.int16).astype(np.float32)
    if d.nchannels > 1:
        a = a.reshape(-1, d.nchannels).mean(axis=1)
    return a, d.sample_rate


def f0(a, sr, fmin=75, fmax=450, win=0.04, hop=0.01):
    n, h = int(win * sr), int(hop * sr)
    out = []
    for i in range(0, max(1, len(a) - n), h):
        seg = a[i:i + n]
        if len(seg) < n:
            break
        if np.sqrt(np.mean(seg ** 2)) < 200:      # 静音
            out.append(0.0)
            continue
        seg = seg - seg.mean()
        ac = np.correlate(seg, seg, mode='full')[n - 1:]
        lo, hi = int(sr / fmax), int(sr / fmin)
        if hi >= len(ac):
            out.append(0.0)
            continue
        k = lo + int(np.argmax(ac[lo:hi]))
        out.append(sr / k if k else 0.0)
    return out


def curve(seq, width=52):
    """只保留有声段，归一化到 0-9 画一条曲线"""
    v = [x for x in seq if x > 0]
    if len(v) < 3:
        return '（无有声段）', 0, 0
    lo, hi = min(v), max(v)
    rng = max(1.0, hi - lo)
    idx = [i for i, x in enumerate(seq) if x > 0]
    step = max(1, len(idx) // width)
    pts = [seq[idx[i]] for i in range(0, len(idx), step)][:width]
    rows = [' '] * 10
    line = [' '] * len(pts)
    for i, x in enumerate(pts):
        r = 9 - int((x - lo) / rng * 9)
        r = max(0, min(9, r))
        line[i] = '●' if i == 0 else '·'
        rows[r] = rows[r][:i] + line[i] + rows[r][i + 1:]
    return '\n'.join('   ' + ('%2d ' % (9 - i)) + ''.join(
        (rows[i][j] if j < len(rows[i]) else ' ') for j in range(len(pts))) for i in range(10)), lo, hi


def main():
    print('=' * 72)
    print('基频曲线：纵轴是音高（9 最高 / 0 最低），横轴是时间')
    print('三声应该是「先降到 0 附近再回升」，二声应该是「一路往 9 走」')
    print('=' * 72)
    for name, p in SAMPLES:
        if not os.path.exists(p):
            print('\n%s —— 文件缺失' % name)
            continue
        a, sr = load(p)
        art, lo, hi = curve(f0(a, sr))
        print('\n%s   （F0 %.0f–%.0f Hz）' % (name, lo, hi))
        print(art)
        # 关键指标：有声段后半段比最低点高多少
        seq = [x for x in f0(a, sr) if x > 0]
        if len(seq) >= 6:
            lowest = min(seq)
            tail = np.mean(seq[-3:])
            rise = (tail - lowest) / max(1.0, lowest) * 100
            judge = '有回升（像三声）' if rise > 12 else '没有明显回升（半三声/平调）'
            print('   → 末段比最低点高 %.0f%%  %s' % (rise, judge))


if __name__ == '__main__':
    main()
