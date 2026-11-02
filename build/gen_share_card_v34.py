# -*- coding: utf-8 -*-
"""生成「生活语文练习台」同事分享卡（v34）。

用法：python3 build/gen_share_card_v34.py
输出：项目根目录 生活语文练习台-分享卡-v34.png（竖版，微信直接发图 / 打印张贴都够清楚）

为什么用 HTML + 无头 Chrome 截图：卡片的排版、圆角、字距全部靠 CSS，改文案只改这个文件；
Chromium 的 --screenshot 只截视口，所以先用 --dump-dom 读一次真实内容高度，
再按那个高度截图 —— 不然不是被裁掉底部，就是底下拖一大片空白。
"""
import base64
import io
import os
import re
import subprocess
import sys

import segno

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, '生活语文练习台-分享卡-v34.png')
TMP_HTML = '/tmp/wb_share_card_v34.html'

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
URL = 'https://workbuddy.link/p/nU41kHmAoelqM2mGxWRFll'
WIDTH = 520            # CSS 像素，微信里按屏幕宽度铺满
SCALE = 2              # 2 倍图，发出去不糊

# ---------- 1) 二维码 ----------
buf = io.BytesIO()
segno.make(URL, error='h').save(buf, kind='png', scale=12, border=0,
                                dark='#1B242C', light='#FFFDF7')
QR_B64 = base64.b64encode(buf.getvalue()).decode('ascii')

HTML = u"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:%(W)dpx;background:#F7F3E8;padding:22px;
       font-family:"PingFang SC","Hiragino Sans GB","Microsoft YaHei",-apple-system,sans-serif;
       color:#1B242C;-webkit-font-smoothing:antialiased}
  .card{background:#FFFDF7;border:1.5px solid #E6DCC6;border-radius:22px;
        padding:26px 24px 20px;box-shadow:0 8px 26px rgba(27,36,44,.07)}

  /* 顶部 */
  .eyebrow{display:inline-block;padding:5px 12px;border-radius:999px;
           background:#E4F1E8;border:1px solid #9CC7AC;color:#2F6B4F;
           font-size:12.5px;font-weight:700;letter-spacing:.4px}
  h1{margin:14px 0 0;font-size:33px;line-height:1.2;letter-spacing:.5px}
  .sub{margin-top:8px;font-size:14.5px;color:#4A5A66;letter-spacing:.2px}

  /* 四个数字 */
  .facts{margin:19px 0 0;display:grid;grid-template-columns:1fr 1fr;gap:9px}
  .fact{background:#F7F3E8;border:1px solid #E6DCC6;border-radius:13px;padding:10px 12px}
  .fact b{display:block;font-size:17px;line-height:1.25;color:#2F6B4F;letter-spacing:.2px}
  .fact span{display:block;margin-top:3px;font-size:11.5px;color:#8A8578;line-height:1.4}

  /* 二维码 */
  .qr-wrap{margin:20px auto 0;width:250px;height:250px;padding:13px;
           background:#FFFDF7;border:1.5px solid #E6DCC6;border-radius:18px}
  .qr-wrap img{width:100%%;height:100%%;display:block;image-rendering:pixelated}
  .url{margin:11px 0 0;text-align:center;font-size:11.5px;color:#4A5A66;
       font-family:ui-monospace,Menlo,Consolas,monospace;letter-spacing:.1px}

  /* 给同事的话 */
  .tips{margin:17px 0 0;background:#E4F1E8;border:1px solid #9CC7AC;
        border-radius:14px;padding:13px 14px 12px}
  .tips h2{font-size:12.5px;color:#2F6B4F;letter-spacing:.5px;margin-bottom:9px}
  .tip{display:flex;gap:8px;font-size:12.5px;line-height:1.62;color:#2A3A33}
  .tip + .tip{margin-top:7px}
  .n{flex:none;width:16px;height:16px;margin-top:1.5px;border-radius:50%%;
     background:#2F6B4F;color:#fff;font-size:10.5px;font-weight:700;
     text-align:center;line-height:16px}
  .tip b{color:#1B242C}

  .foot{margin-top:14px;padding-top:12px;border-top:1px dashed #E6DCC6;
        display:flex;justify-content:space-between;align-items:center;
        font-size:11px;color:#8A8578;letter-spacing:.3px}
</style></head><body>
<div class="card">
  <div class="eyebrow">培智 · 特需学生 语文</div>
  <h1>生活语文练习台</h1>
  <div class="sub">认字乐园 · 班级练习 · 学生档案 · 老师端</div>

  <div class="facts">
    <div class="fact"><b>700 字 / 22 册</b><span>按生活语文教材分册</span></div>
    <div class="fact"><b>9 种题型</b><span>听写 · 描红 · 笔顺</span></div>
    <div class="fact"><b>每人一份字表</b><span>只练他这几个字</span></div>
    <div class="fact"><b>1695 条语音</b><span>语速放慢，句间有停顿</span></div>
  </div>

  <div class="qr-wrap"><img src="data:image/png;base64,%(QR)s" alt="扫码打开"></div>
  <div class="url">%(URL)s</div>

  <div class="tips">
    <h2>老师须知（三句话）</h2>
    <div class="tip"><i class="n">1</i><span>右上角「<b>老师</b>」<b>连点两下</b>进老师端：加学生、传照片、勾字表。单击不会进去，学生误触不了。</span></div>
    <div class="tip"><i class="n">2</i><span>不用注册、不用安装。学生名单和练习记录<b>存在你自己这台设备上</b>，你收的学生别人看不到。</span></div>
    <div class="tip"><i class="n">3</i><span>手机、平板、电脑都能开，<b>平板横屏</b>字最大。手机、平板扫码，电脑可直接输上面的网址。</span></div>
  </div>

  <div class="foot"><span>v34 · 2026-11</span><span>扫码即用</span></div>
</div>
</body></html>
""" % {'W': WIDTH, 'QR': QR_B64, 'URL': URL}

with io.open(TMP_HTML, 'w', encoding='utf-8', newline='') as f:
    f.write(HTML)

BASE = [CHROME, '--headless=new', '--disable-gpu', '--no-sandbox',
        '--hide-scrollbars', '--force-device-scale-factor=%d' % SCALE]

# ---------- 2) 先量真实高度（写进 document.title，再 dump-dom 读回来）----------
# 注意别量 documentElement.scrollHeight：视口比内容高时它返回视口高度，
# 截出来底下会拖一大片空白。卡片实际高度 + body 上下 padding(22×2) 才是要的那一条。
probe = HTML.replace('</body>',
                     '<script>window.onload=function(){'
                     'var c=document.querySelector(".card");'
                     'document.title=String(Math.ceil(c.getBoundingClientRect().height)+44);};</script>'
                     '</body>')
with io.open(TMP_HTML, 'w', encoding='utf-8', newline='') as f:
    f.write(probe)

r = subprocess.run(BASE + ['--window-size=%d,1200' % WIDTH, '--virtual-time-budget=1500',
                           '--dump-dom', 'file://' + TMP_HTML],
                   capture_output=True, text=True, timeout=120)
m = re.search(r'<title>(\d+)</title>', r.stdout or '')
if not m:
    print('ERROR 没量到高度，dump 片段：', (r.stdout or '')[:300])
    sys.exit(1)
height = int(m.group(1))
print('内容高度 %d px（CSS）→ 输出 %d×%d' % (height, WIDTH * SCALE, height * SCALE))

# ---------- 3) 按量到的高度截图 ----------
with io.open(TMP_HTML, 'w', encoding='utf-8', newline='') as f:
    f.write(HTML)

subprocess.run(BASE + ['--window-size=%d,%d' % (WIDTH, height),
                       '--virtual-time-budget=2500',
                       '--screenshot=' + OUT, 'file://' + TMP_HTML],
               check=True, timeout=120)

print('OK', OUT, os.path.getsize(OUT), 'B')
print('URL', URL)
