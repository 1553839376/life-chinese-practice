# -*- coding: utf-8 -*-
"""给语音包补一条指令句（只加一条，不动其余 1690 条）。

用法：python add_voice.py q_word "找出下面的词语。"
流程：edge-tts 合成 → 24k/22050/mono 去静音（与 pack_audio.py 完全一致）
      → 写进 _tts/small/ 与 p_voice.json
"""
import asyncio
import base64
import io
import json
import os
import subprocess
import sys

import edge_tts
import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, '_tts', 'raw_v6')
SMALL = os.path.join(HERE, '_tts', 'small')
FF = imageio_ffmpeg.get_ffmpeg_exe()
VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-10%'
TRIM = ('silenceremove=start_periods=1:start_threshold=-45dB,'
        'areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse')


async def gen(key, text):
    os.makedirs(RAW, exist_ok=True)
    dst = os.path.join(RAW, key + '.mp3')
    c = edge_tts.Communicate(text, VOICE, rate=RATE)
    await c.save(dst)
    size = os.path.getsize(dst)
    print('合成 %s → %d B' % (dst, size))
    return size > 300


def encode(src, dst):
    args = [FF, '-y', '-loglevel', 'error', '-i', src,
            '-af', TRIM, '-codec:a', 'libmp3lame', '-b:a', '24k',
            '-ar', '22050', '-ac', '1', dst]
    r = subprocess.run(args, capture_output=True)
    ok = r.returncode == 0 and os.path.exists(dst) and os.path.getsize(dst) > 200
    print('转码 %s → %s %s (%d B)' % (src, dst, 'OK' if ok else 'FAIL',
                                       os.path.getsize(dst) if os.path.exists(dst) else 0))
    if not ok:
        print(r.stderr.decode('utf-8', 'ignore')[:400], file=sys.stderr)
    return ok


def main():
    key, text = sys.argv[1], sys.argv[2]
    if not asyncio.run(gen(key, text)):
        print('FAIL 合成失败', file=sys.stderr)
        return 1
    os.makedirs(SMALL, exist_ok=True)
    small = os.path.join(SMALL, key + '.mp3')
    if not encode(os.path.join(RAW, key + '.mp3'), small):
        return 1
    data = json.load(io.open(os.path.join(HERE, 'p_voice.json'), encoding='utf-8'))
    before = len(data)
    data[key] = base64.b64encode(open(small, 'rb').read()).decode('ascii')
    io.open(os.path.join(HERE, 'p_voice.json'), 'w', encoding='utf-8', newline='').write(
        json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    print('p_voice.json %d → %d 条；%s = %d B base64' % (
        before, len(data), key, len(data[key])))
    return 0


if __name__ == '__main__':
    sys.exit(main())
