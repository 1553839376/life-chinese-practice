# -*- coding: utf-8 -*-
"""「耳」「儿」发音问题专治（2026-10-23）。

用户反馈：「这些的耳和儿都怪怪的，其他还好」——其余字没问题，只有 er 韵母这两个字怪。
根因判断（来源：edge-tts issue #454 同类型）：**单字词条缺失**时，词典里只有词没有单字，
会 fallback 到一个错读音；er 是自成音节的卷舌元音，恰好是最容易被读歪的一类。

两条备选路，本脚本各生成一组样本：
  A 换音色：8 个 zh-CN 音色各念一遍「耳」「儿」，看是不是晓晓一个人的问题
  B 从词里切：词首音节的三声有后续音节撑着，调值更完整。
    「耳朵」的「耳」、「儿子」的「儿」按能量包络找到音节边界，切出来再编码回 mp3

用法：python build/gen_tts_er.py
输出：build/_tts/try_er/*.mp3 + 试听.html
"""
import asyncio
import base64
import io
import os
import subprocess

import edge_tts
import imageio_ffmpeg
import miniaudio
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '_tts', 'try_er')
RAW = os.path.join(HERE, '_tts', 'raw')
RAW_V6 = os.path.join(HERE, '_tts', 'raw_v6')
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

VOICES = [
    ('xiaoxiao', 'zh-CN-XiaoxiaoNeural', '晓晓（现状）'),
    ('xiaoyi', 'zh-CN-XiaoyiNeural', '晓伊'),
    ('yunxi', 'zh-CN-YunxiNeural', '云希'),
    ('yunjian', 'zh-CN-YunjianNeural', '云健'),
    ('yunyang', 'zh-CN-YunyangNeural', '云扬'),
    ('yunxia', 'zh-CN-YunxiaNeural', '云夏（童声）'),
    ('xiaobei', 'zh-CN-liaoning-XiaobeiNeural', '小北（东北）'),
    ('xiaoni', 'zh-CN-shaanxi-XiaoniNeural', '小妮（陕西）'),
]
CHARS = [('耳', 'u8033'), ('儿', 'u513f')]

# 从词里切：源文件、切多久、说明
CUTS = [
    ('耳', 'w80336735', '耳朵', 0.42, '耳←「耳朵」前 0.42s'),
    ('耳', 'w80336735', '耳朵', 0.30, '耳←「耳朵」前 0.30s'),
    ('儿', 'w513f5b50', '儿子', 0.42, '儿←「儿子」前 0.42s'),
    ('儿', 'w513f5b50', '儿子', 0.30, '儿←「儿子」前 0.30s'),
]

fail = []


def decode(path):
    d = miniaudio.decode_file(path)
    a = np.frombuffer(d.samples, dtype=np.int16).astype(np.float32)
    if d.nchannels > 1:
        a = a.reshape(-1, d.nchannels).mean(axis=1)
    return a, d.sample_rate


def onset_sec(path):
    """找第一个"出声"的时刻（10ms 帧能量首次超过峰值 8%）"""
    a, sr = decode(path)
    hop = max(1, int(sr * 0.01))
    n = len(a) // hop
    e = np.array([np.sqrt(np.mean(a[i * hop:(i + 1) * hop] ** 2)) for i in range(n)])
    peak = e.max() or 1.0
    thr = peak * 0.08
    idx = int(np.argmax(e > thr))
    return idx * 0.01


async def gen(key, text, voice):
    path = os.path.join(OUT, key + '.mp3')
    if os.path.exists(path) and os.path.getsize(path) > 300:
        return
    for attempt in range(4):
        try:
            await edge_tts.Communicate(text, voice, rate='-10%').save(path)
            if os.path.getsize(path) > 300:
                return
        except Exception:
            await asyncio.sleep(0.8 + attempt * 1.2)
    fail.append(key)


def cut(src, out, dur, lead=0.03):
    """从 src 的第一个出声点前 lead 秒开始，切 dur 秒，首尾各淡 25ms"""
    start = max(0.0, onset_sec(src) - lead)
    af = ('afade=t=in:st=0:d=0.02,afade=t=out:st=%.3f:d=0.03' % (dur - 0.03))
    r = subprocess.run([
        FFMPEG, '-y', '-loglevel', 'error',
        '-ss', '%.3f' % start, '-t', '%.3f' % dur,
        '-i', src, '-af', af, '-b:a', '48k', out,
    ], capture_output=True)
    if r.returncode != 0 or not os.path.exists(out):
        fail.append(os.path.basename(out))
        print('  CUT FAIL', out, r.stderr.decode('utf-8', 'replace')[:120])


async def main():
    os.makedirs(OUT, exist_ok=True)
    sem = asyncio.Semaphore(4)

    async def run(k, t, v):
        async with sem:
            await gen(k, t, v)

    tasks = []
    for vk, voice, _ in VOICES:
        for ch, uk in CHARS:
            tasks.append(run('%s_%s' % (vk, uk), ch, voice))
    await asyncio.gather(*tasks)
    print('换音色样本：%d 条，失败 %d' % (len(tasks), len(fail)))

    n0 = len(fail)
    for ch, src_key, word, dur, _ in CUTS:
        src = os.path.join(RAW_V6, src_key + '.mp3')
        if not os.path.exists(src):
            print('  缺源文件', src)
            continue
        out = os.path.join(OUT, 'cut%02d_%04x.mp3' % (int(dur * 100), ord(ch)))
        cut(src, out, dur)
    print('切词样本：%d 条，失败 %d' % (len(CUTS), len(fail) - n0))
    write_page()


def mp3_b64(p):
    return base64.b64encode(io.open(p, 'rb').read()).decode('ascii')


def write_page():
    # A 组：换音色
    rows_a = ''
    for ch, uk in CHARS:
        cells = ''
        for vk, voice, label in VOICES:
            p = os.path.join(OUT, '%s_%s.mp3' % (vk, uk))
            cells += ('<td><button data-a="%s" title="%s">▶</button></td>'
                      % (mp3_b64(p), label)) if os.path.exists(p) else '<td class="miss">—</td>'
        rows_a += '<tr><th>%s</th>%s</tr>' % (ch, cells)

    # B 组：从词里切
    rows_b = ''
    for ch in ['耳', '儿']:
        cells = ''
        for c_ch, src_key, word, dur, label in CUTS:
            if c_ch != ch:
                continue
            p = os.path.join(OUT, 'cut%02d_%04x.mp3' % (int(dur * 100), ord(ch)))
            cells += ('<td><button data-a="%s">▶</button></td>' % mp3_b64(p)) \
                if os.path.exists(p) else '<td class="miss">—</td>'
        rows_b += '<tr><th>%s</th>%s</tr>' % (ch, cells)

    head_a = ''.join('<th>%s</th>' % v[2] for v in VOICES)
    head_b = ''.join('<th>%s</th>' % c[4] for c in CUTS if c[0] == '耳')

    html = """<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>「耳 / 儿」发音对比</title>
<style>
 body{font-family:-apple-system,"Segoe UI",Roboto,sans-serif;background:#F7F3E8;color:#1B242C;
      margin:0;padding:26px 18px 60px}
 h1{font-size:20px;margin:0 0 4px}
 h2{font-size:15px;margin:26px 0 8px;color:#2F6B4F}
 p.tip{margin:0 0 14px;font-size:13px;color:#4A5A66;line-height:1.6}
 .scroll{overflow-x:auto;padding-bottom:6px}
 table{border-collapse:collapse;background:#FFFDF7;border:1.5px solid #E6DCC6;border-radius:14px;overflow:hidden}
 th,td{padding:8px 9px;text-align:center;border-bottom:1px solid #EFE8D6;font-size:13px}
 thead th{background:#F4F0E2;font-weight:800;font-size:11.5px;color:#4A5A66;white-space:nowrap}
 tbody th{font-size:30px;font-weight:700;background:#FAF7EC;position:sticky;left:0}
 button{width:46px;height:46px;border-radius:12px;border:1.5px solid #D8CCB0;background:#fff;
        font-size:15px;cursor:pointer}
 button.on{background:#2F6B4F;color:#fff;border-color:#2F6B4F}
 td.miss{color:#B0A997}
 .foot{margin-top:20px;font-size:12px;color:#8A8578}
</style></head><body>
<h1>「耳」「儿」发音对比</h1>
<p class="tip">先听 A 组：同样两个字，8 个不同音色各念一遍，看是不是晓晓这一个音色的问题。<br>
再听 B 组：从「耳朵」「儿子」的整词录音里，把第一个音节切出来——词首的声调有后面的音节撑着，通常更完整。</p>

<h2>A · 换音色（都是孤立单字，-10%% 语速）</h2>
<div class="scroll"><table>
 <thead><tr><th>字</th>%s</tr></thead><tbody>%s</tbody></table></div>

<h2>B · 从整词里切出第一个字（晓晓）</h2>
<div class="scroll"><table>
 <thead><tr><th>字</th>%s</tr></thead><tbody>%s</tbody></table></div>

<p class="foot">生成脚本 build/gen_tts_er.py；线上语音未改动。</p>
<script>
var cur=null;
document.addEventListener('click',function(e){
  var b=e.target.closest('button[data-a]'); if(!b) return;
  if(cur) cur.classList.remove('on');
  b.classList.add('on'); cur=b;
  new Audio('data:audio/mpeg;base64,'+b.getAttribute('data-a')).play();
});
</script></body></html>""" % (head_a, rows_a, head_b, rows_b)

    page = os.path.join(OUT, '试听.html')
    io.open(page, 'w', encoding='utf-8', newline='').write(html)
    print('试听页：' + page)


if __name__ == '__main__':
    asyncio.run(main())
