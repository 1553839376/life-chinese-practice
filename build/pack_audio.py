# -*- coding: utf-8 -*-
"""把原始语音/音效转码压缩后打成 p_voice.js（base64 内联）。

产物：
  p_voice.js   var VOICE_PACK = {键: base64}  + var SFX_PACK = {键: base64}
语音：24kbps / 22050Hz / 单声道，去首尾静音
音效：64kbps / 32000Hz / 单声道，去首尾静音
"""
import base64
import io
import os
import subprocess
import sys

import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
FF = imageio_ffmpeg.get_ffmpeg_exe()
RAW = os.path.join(HERE, '_tts', os.environ.get('TTS_DIR', 'raw'))
SMALL = os.path.join(HERE, '_tts', 'small')
SFX_SRC = os.path.join(os.environ.get('TEMP', '/tmp'), 'uisfx_probe', 'sfx')

VOICE_BR = '24k'
VOICE_AR = '22050'
TRIM = ('silenceremove=start_periods=1:start_threshold=-45dB,'
        'areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse')

# 音效映射：语义名 -> uisfx 素材名
SFX_MAP = {
    'ok': 'organic_success',
    'no': 'organic_error',
    'tap': 'organic_select',
    'pop': 'organic_snap',
    'win': 'rubber_complete',
    'streak': 'organic_streak',
}


def encode(src, dst, br, ar, trim=True):
    args = [FF, '-y', '-loglevel', 'error', '-i', src]
    if trim:
        args += ['-af', TRIM]
    args += ['-codec:a', 'libmp3lame', '-b:a', br, '-ar', ar, '-ac', '1', dst]
    r = subprocess.run(args, capture_output=True)
    return r.returncode == 0 and os.path.exists(dst) and os.path.getsize(dst) > 200


def b64(path):
    return base64.b64encode(open(path, 'rb').read()).decode('ascii')


def main():
    os.makedirs(SMALL, exist_ok=True)
    voice = {}
    srcs = sorted(f for f in os.listdir(RAW) if f.endswith('.mp3')) if os.path.isdir(RAW) else []
    bad = 0
    for f in srcs:
        key = f[:-4]
        out = os.path.join(SMALL, key + '.mp3')
        if not encode(os.path.join(RAW, f), out, VOICE_BR, VOICE_AR):
            bad += 1
            continue
        voice[key] = b64(out)

    sfx = {}
    for key, name in SFX_MAP.items():
        src = os.path.join(SFX_SRC, name + '.mp3')
        out = os.path.join(SMALL, 'sfx_' + key + '.mp3')
        if not os.path.exists(src):
            # 素材目录已清理时，直接用上次转码好的成品，避免重打包丢音效
            if os.path.exists(out) and os.path.getsize(out) > 200:
                sfx[key] = b64(out)
            else:
                print('WARN 缺少音效素材', name, file=sys.stderr)
            continue
        if encode(src, out, '64k', '32000'):
            sfx[key] = b64(out)

    total = sum(len(v) for v in voice.values()) + sum(len(v) for v in sfx.values())
    js = io.StringIO()
    js.write('/* 语音与音效资源包（内联 base64）\n')
    js.write('   语音：zh-CN 神经语音预生成，24kbps 单声道；%d 条读音 + 指令句\n' % len(voice))
    js.write('   音效：uisfx (github.com/romainsimon/uisfx, MIT 代码 / CC0 音频) organic + rubber 包\n')
    js.write('   运行时零网络请求、不依赖设备语音包。*/\n')
    js.write('var VOICE_PACK = {\n')
    items = sorted(voice.items())
    for i, (k, v) in enumerate(items):
        tail = ',' if i < len(items) - 1 else ''
        js.write('"%s":"%s"%s\n' % (k, v, tail))
    js.write('};\n')
    js.write('var SFX_PACK = {\n')
    items = sorted(sfx.items())
    for i, (k, v) in enumerate(items):
        tail = ',' if i < len(items) - 1 else ''
        js.write('"%s":"%s"%s\n' % (k, v, tail))
    js.write('};\n')
    open(os.path.join(HERE, 'p_voice.js'), 'w', encoding='utf-8').write(js.getvalue())

    print('语音 %d 条 / 音效 %d 条' % (len(voice), len(sfx)))
    print('失败 %d 条' % bad)
    print('base64 总量 %.2f MB' % (total / 1024.0 / 1024.0))
    sizes = sorted((len(v), k) for k, v in voice.items())
    if sizes:
        print('最小 %s=%dB  最大 %s=%dB' % (sizes[0][1], sizes[0][0], sizes[-1][1], sizes[-1][0]))


if __name__ == '__main__':
    main()
