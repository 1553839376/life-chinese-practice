# -*- coding: utf-8 -*-
"""把 gen_doubao_voice.py 产出的无损 WAV 打包成 p_voice.json。

与老链路（pack_audio.py）的区别，也是这次改善音质的核心：
  老：edge-tts 出 48 kbps MP3 → 再压到 24 kbps / 22.05 kHz 单声道
      = 两次有损 + 极低码率，单字只剩 1323 字节，必然发闷。
  新：豆包直出 24 kHz 无损 WAV → 只做一次编码，48 kbps AAC。
      = 一次有损，码率翻倍且编码器更现代，齿音与三声细节保住。

三步处理：
  1. 裁静音：头部只留 50 ms、尾部只留 150 ms。
     豆包这几个音色尾部垫 0.3~0.5 s 空白，不裁的话连读会一顿一顿。
  2. 响度归一：按语音段 RMS 归到同一目标（默认 -20 dBFS，限幅 -1 dBFS）。
     1691 条分别合成，音量会有 ±几 dB 浮动，教室里忽大忽小很难受。
  3. 编码：AAC-LC / 24 kHz / 单声道 / 48 kbps，MP4 容器。
     选它而不是 Opus：decodeAudioData 在 Safari/iOS 上对 ogg-opus 支持不可靠，
     课堂里旧 iPad 一旦解不出来就是「完全没有声音」，比多 2 MB 严重得多。

用法：
  打包：  python pack_doubao_voice.py
  换码率：DOUBAO_BR=40000 python pack_doubao_voice.py
  只打包不写盘：DOUBAO_DRYRUN=1 python pack_doubao_voice.py
"""
import base64
import io
import json
import os
import sys
import time

import av
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '_tts', 'doubao')
OUT = os.path.join(HERE, 'p_voice.json')
REPORT = os.path.join(HERE, '_tts', 'doubao_report.json')

RATE = 24000          # 豆包原生采样率，不重采样
BITRATE = int(os.environ.get('DOUBAO_BR', '48000'))
LEAD = 0.05           # 头部保留
TAIL = 0.15           # 尾部保留
TARGET_DBFS = -20.0   # 语音段目标 RMS
PEAK_CEIL = -1.0      # 限幅上限
MAX_GAIN_DB = 6.0

sys.path.insert(0, HERE)
from gen_doubao_voice import build_tasks, SENTS  # noqa: E402


def load(p):
    c = av.open(p)
    rs = av.AudioResampler(format='flt', layout='mono', rate=RATE)
    ch = []
    for fr in c.decode(audio=0):
        for f2 in rs.resample(fr):
            ch.append(f2.to_ndarray().reshape(-1))
    c.close()
    if not ch:
        return np.zeros(0, dtype=np.float32)
    return np.concatenate(ch).astype(np.float32)


def bounds(a, win=240, rel_thr=0.02):
    """按 10 ms 帧的 RMS 判语音段，返回 (start, end) 样点。"""
    n = len(a) // win
    if n < 2:
        return 0, len(a)
    rms = np.array([np.sqrt(np.mean(a[i * win:(i + 1) * win] ** 2)) for i in range(n)])
    thr = max(rms.max() * rel_thr, 1e-4)
    idx = np.where(rms > thr)[0]
    if len(idx) == 0:
        return 0, len(a)
    return idx[0] * win, min((idx[-1] + 1) * win, len(a))


def trim(a):
    s, e = bounds(a)
    s = max(0, s - int(LEAD * RATE))
    e = min(len(a), e + int(TAIL * RATE))
    return a[s:e]


def speech_rms_db(a):
    s, e = bounds(a)
    seg = a[s:e]
    if len(seg) == 0:
        return -99.0
    return 20.0 * np.log10(max(float(np.sqrt(np.mean(seg ** 2))), 1e-9))


def normalize(a, gain_db):
    y = a * (10.0 ** (gain_db / 20.0))
    ceil = 10.0 ** (PEAK_CEIL / 20.0)
    pk = float(np.max(np.abs(y))) if len(y) else 0.0
    if pk > ceil:
        y = y * (ceil / pk)
    return y


def save_m4a(a, out, bitrate=BITRATE, rate=RATE):
    oc = av.open(out, 'w', format='mp4')
    st = oc.add_stream('aac', rate=rate, layout='mono')
    st.bit_rate = bitrate
    fs = st.frame_size or 1024
    for i in range(0, len(a), fs):
        ck = a[i:i + fs]
        if len(ck) < fs:
            ck = np.pad(ck, (0, fs - len(ck)))
        fr = av.AudioFrame.from_ndarray(
            ck.reshape(1, -1).astype(np.float32), format='flt', layout='mono')
        fr.sample_rate = rate
        fr.pts = i
        for pkt in st.encode(fr):
            oc.mux(pkt)
    for pkt in st.encode(None):
        oc.mux(pkt)
    oc.close()


def main():
    tasks = build_tasks()
    keys = [k for k, _ in tasks]
    missing = [k for k in keys if not os.path.exists(os.path.join(SRC, k + '.wav'))]
    if missing:
        print('缺 %d 条源文件，先跑 gen_doubao_voice.py：%s'
              % (len(missing), ' '.join(missing[:8])), file=sys.stderr)
        return 3

    dry = os.environ.get('DOUBAO_DRYRUN') == '1'
    tmpdir = os.path.join(HERE, '_tts', 'small_m4a')
    os.makedirs(tmpdir, exist_ok=True)

    # 第一遍：裁静音 + 量响度，取中位数作为归一目标
    loaded, dbs, before_s, after_s = {}, {}, 0.0, 0.0
    for n, k in enumerate(keys, 1):
        a = load(os.path.join(SRC, k + '.wav'))
        t = trim(a)
        loaded[k] = t
        dbs[k] = speech_rms_db(t)
        before_s += len(a) / RATE
        after_s += len(t) / RATE
        if n % 400 == 0:
            print('  载入 %d/%d' % (n, len(keys)), flush=True)

    vals = np.array([v for v in dbs.values() if v > -60])
    med = float(np.median(vals))
    gain = {k: float(np.clip(TARGET_DBFS - v, -MAX_GAIN_DB, MAX_GAIN_DB))
            for k, v in dbs.items()}

    print('响度：中位 %.1f dBFS，跨度 %.1f dB（%.1f ~ %.1f），目标 %.1f，增益 %.1f ~ %.1f dB'
          % (med, vals.max() - vals.min(), vals.min(), vals.max(), TARGET_DBFS,
             min(gain.values()), max(gain.values())))
    print('时长：原始 %.0f s → 裁后 %.0f s（去掉 %.0f s 静音）'
          % (before_s, after_s, before_s - after_s))

    voice = {}
    total = 0
    t0 = time.time()
    for n, k in enumerate(keys, 1):
        a = normalize(loaded[k], gain[k])
        fp = os.path.join(tmpdir, k + '.m4a')
        save_m4a(a, fp)
        raw = open(fp, 'rb').read()
        voice[k] = base64.b64encode(raw).decode('ascii')
        total += len(voice[k])
        if n % 400 == 0:
            print('  编码 %d/%d  %.0fs' % (n, len(keys), time.time() - t0), flush=True)

    sizes = sorted((len(v), k) for k, v in voice.items())
    n_han = sum(1 for k in voice if k.startswith('u'))
    n_word = sum(1 for k in voice if k.startswith('w'))
    n_sent = len(voice) - n_han - n_word
    print('语音 %d 条（%d 单字 + %d 整词 + %d 指令句）'
          % (len(voice), n_han, n_word, n_sent))
    print('base64 合计 %.2f MB（最小 %s=%d B，最大 %s=%d B）'
          % (total / 1048576.0, sizes[0][1], sizes[0][0], sizes[-1][1], sizes[-1][0]))
    print('单条平均 %.0f B（老版 2452 B）' % (total / len(voice)))

    if dry:
        print('DRYRUN，未写 p_voice.json')
        return 0

    io.open(OUT, 'w', encoding='utf-8', newline='').write(
        json.dumps(dict(sorted(voice.items())), ensure_ascii=True, separators=(',', ':')))
    print('已写 %s  %.2f MB' % (OUT, os.path.getsize(OUT) / 1048576.0))

    io.open(REPORT, 'w', encoding='utf-8').write(json.dumps({
        'voice': 'zh_female_zhixingnv_uranus_bigtts', 'speed': 0.85,
        'bitrate': BITRATE, 'rate': RATE,
        'count': len(voice), 'durations': {k: round(len(loaded[k]) / RATE, 3) for k in keys},
        'db_before': {k: round(dbs[k], 1) for k in keys},
    }, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    sys.exit(main())
