# -*- coding: utf-8 -*-
"""生成「生活语文练习台」扫码分享卡（v20）。

输出：项目根目录 生活语文练习台-扫码卡-v20.png
二维码内容 = 官方发布态短链（publish-page 返回的 publishUrl）。
"""
import base64
import io
import os
import subprocess
import tempfile

import segno

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_PNG = os.path.join(ROOT, '生活语文练习台-扫码卡-v20.png')
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

URL = 'https://workbuddy.link/p/nU41kHmAoelqM2mGxWRFll'

# 1) 二维码 -> base64 PNG
buf = io.BytesIO()
segno.make(URL, error='h').save(buf, kind='png', scale=10, border=3,
                                dark='#1B242C', light='#FFFDF7')
qr_b64 = base64.b64encode(buf.getvalue()).decode('ascii')

HTML = u"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 460px; background: #F7F3E8; padding: 28px 26px 24px;
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
                      "Microsoft YaHei", sans-serif; color: #1B242C; }
  .card { background: #FFFDF7; border: 1px solid #E6DCC6; border-radius: 20px;
          padding: 26px 26px 22px; text-align: center;
          box-shadow: 0 6px 22px rgba(27,36,44,.07); }
  h1 { font-size: 27px; letter-spacing: 1px; }
  .sub { margin-top: 8px; font-size: 14px; color: #6B6250; line-height: 1.6; }
  .tag { display: inline-block; margin-top: 12px; padding: 4px 11px; border-radius: 999px;
         background: #E8F2E4; color: #2F6B33; font-size: 12.5px; font-weight: 600; }
  .qr { margin: 20px auto 6px; width: 260px; height: 260px; }
  .qr img { width: 100%; height: 100%; display: block; border-radius: 10px; }
  .url { margin: 10px 0 0; font-size: 11.5px; color: #4B5560; word-break: break-all;
         font-family: ui-monospace, Consolas, monospace; background: #F4EFDF;
         border: 1px dashed #D8CCB0; border-radius: 10px; padding: 9px 10px; }
  .hint { margin-top: 16px; padding-top: 14px; border-top: 1px solid #EFE6D2;
          font-size: 12px; color: #7A7160; line-height: 1.75; text-align: left; }
  .hint b { color: #9A3412; }
</style></head><body>
<div class="card">
  <h1>生活语文练习台</h1>
  <div class="sub">认字 · 练习 · 学生档案 · 老师端</div>
  <div class="tag">v20 · 字表有在学上限了</div>
  <div class="qr"><img src="data:image/png;base64,__QR__" alt="QR"></div>
  <div class="url">__URL__</div>
  <div class="hint">
    手机相机或微信扫码打开；电脑可直接输入上面的网址。<br>
    打开后标题应是<b>「生活语文练习台」</b>。
    若看到「识字启蒙台」，那是早期的另一个页面，链接用错了。
  </div>
</div>
</body></html>
"""
HTML = HTML.replace('__QR__', qr_b64).replace('__URL__', URL)

tmp_html = os.path.join(tempfile.gettempdir(), 'wb_share_card.html')
with io.open(tmp_html, 'w', encoding='utf-8', newline='') as f:
    f.write(HTML)

size = (460, 654)
subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
                '--hide-scrollbars', '--force-device-scale-factor=2',
                '--window-size=%d,%d' % size,
                '--screenshot=' + OUT_PNG,
                'file:///' + tmp_html.replace('\\', '/')],
               check=True, timeout=120)

print('OK', OUT_PNG, os.path.getsize(OUT_PNG), 'B')
print('URL', URL)
