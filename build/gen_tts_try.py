# -*- coding: utf-8 -*-
"""生成「单字三声听不清」的对比样本，并出一个本地试听页。

背景（用户 2026-10-23）：「现有的语音特别是单字好像读的不清晰，特别是第三声的字，
很难区分，比如耳和儿，学生听不出区别。」

根因是**孤立单字的声调本来就不完整**（三声没有后续音节，声带不会真升上去），
不是录音坏了。这里生成 4 个版本让人耳判断，不改线上任何东西。

用法：python build/gen_tts_try.py
输出：build/_tts/try/*.mp3 + build/_tts/try/试听.html
"""
import asyncio
import io
import os

import edge_tts

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '_tts', 'try')

# 成对的三声 / 二声，最后一个韵母相同（女 nǚ / 鱼 yú 都是 ü）
CHARS = ['耳', '儿', '五', '无', '女', '鱼', '好', '小']

XIAO = 'zh-CN-XiaoxiaoNeural'
YUNXI = 'zh-CN-YunxiNeural'

# (版本 key, 音色, 语速, 文本模板, 说明)
VARIANTS = [
    ('now', XIAO, '-10%', '{c}', '① 现状'),
    ('slow', XIAO, '-30%', '{c}', '② 慢 -30%'),
    ('slow45', XIAO, '-45%', '{c}', '③ 慢 -45%'),
    ('twice', XIAO, '-10%', '{c}，{c}。', '④ 念两遍'),
    ('tone', XIAO, '-10%', '{c}。{c}啊。', '⑤ 字+啊'),
    ('yunxi', YUNXI, '-10%', '{c}', '⑥ 云希男声'),
]

fail = []


async def one(sem, key, text, voice, rate):
    path = os.path.join(OUT, key + '.mp3')
    if os.path.exists(path) and os.path.getsize(path) > 300:
        return
    async with sem:
        for attempt in range(4):
            try:
                await edge_tts.Communicate(text, voice, rate=rate).save(path)
                if os.path.getsize(path) > 300:
                    return
            except Exception as e:
                await asyncio.sleep(0.8 + attempt * 1.2)
        fail.append(key)


async def main():
    os.makedirs(OUT, exist_ok=True)
    sem = asyncio.Semaphore(5)
    tasks = []
    for vkey, voice, rate, tpl, _ in VARIANTS:
        for ch in CHARS:
            key = '%s_%04x' % (vkey, ord(ch))
            tasks.append(one(sem, key, tpl.format(c=ch), voice, rate))
    await asyncio.gather(*tasks)
    print('生成完成，失败 %d' % len(fail))
    for f in fail[:10]:
        print('  FAIL', f)
    write_page()


def write_page():
    """试听页：每个字一行，横向排 6 个版本的按钮，点一下直接播。"""
    import base64

    rows = ''
    for ch in CHARS:
        cells = ''
        for vkey, voice, rate, tpl, _ in VARIANTS:
            key = '%s_%04x' % (vkey, ord(ch))
            p = os.path.join(OUT, key + '.mp3')
            if not os.path.exists(p):
                cells += '<td class="miss">—</td>'
                continue
            b64 = base64.b64encode(io.open(p, 'rb').read()).decode('ascii')
            cells += ('<td><button data-a="%s">▶</button></td>' % b64)
        rows += '<tr><th>%s</th>%s</tr>' % (ch, cells)

    heads = ''.join('<th>%s</th>' % v[4] for v in VARIANTS)
    html = """<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>单字发音对比（三声 vs 二声）</title>
<style>
 body{font-family:-apple-system,"Segoe UI",Roboto,sans-serif;background:#F7F3E8;color:#1B242C;
      margin:0;padding:28px 20px 60px}
 h1{font-size:21px;margin:0 0 6px}
 p.tip{margin:0 0 20px;font-size:13.5px;color:#4A5A66;line-height:1.6}
  .scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:6px}
 table{border-collapse:collapse;background:#FFFDF7;border:1.5px solid #E6DCC6;border-radius:14px;
       overflow:hidden}
 th,td{padding:8px 9px;text-align:center;border-bottom:1px solid #EFE8D6;font-size:14px}
 thead th{background:#F4F0E2;font-weight:800;font-size:12px;color:#4A5A66;white-space:nowrap}
 tbody th{font-size:30px;font-weight:700;background:#FAF7EC;position:sticky;left:0}
 button{width:46px;height:46px;border-radius:12px;border:1.5px solid #D8CCB0;background:#fff;
        font-size:15px;cursor:pointer}
 button.on{background:#2F6B4F;color:#fff;border-color:#2F6B4F}
 td.miss{color:#B0A997}
 .foot{margin-top:18px;font-size:12.5px;color:#8A8578}
</style></head><body>
<h1>单字发音对比：三声（耳 五 女 好 小）vs 二声（儿 无 鱼）</h1>
<p class="tip">每行一个字，横向是 6 个版本。点 ▶ 直接播放（音频已内联，断网也能听）。
<br>重点听：<b>耳 / 儿</b>、<b>五 / 无</b> 这两对能不能一下听出区别。</p>
<div class="scroll">
<table>
 <thead><tr><th>字</th>%s</tr></thead>
 <tbody>%s</tbody>
</table>
</div>
<p class="foot">生成脚本 build/gen_tts_try.py；这里只是试听样本，线上语音未改动。</p>
<script>
var cur=null;
document.addEventListener('click', function(e){
  var b = e.target.closest('button[data-a]');
  if (!b) return;
  if (cur) cur.classList.remove('on');
  b.classList.add('on'); cur = b;
  var a = new Audio('data:audio/mpeg;base64,' + b.getAttribute('data-a'));
  a.play();
});
</script>
</body></html>""" % (heads, rows)

    page = os.path.join(OUT, '试听.html')
    io.open(page, 'w', encoding='utf-8', newline='').write(html)
    print('试听页：' + page)


if __name__ == '__main__':
    asyncio.run(main())
