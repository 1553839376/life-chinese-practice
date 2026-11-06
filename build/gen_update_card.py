# -*- coding: utf-8 -*-
"""生成「生活语文练习台」更新公告卡（v34 → v48）· 分享给同事的一屏简版。

老师反馈「图片太长了，我只需要简单说明就好了，是要分享给同事的版式」——
所以不再逐条列 6 项新增 + 5 条修复，改成：一段话说明 + 三条要点 + 网址。
目标尺寸跟 v34 那张分享卡相近（约 520×850 CSS，2 倍图 1040×1700）。

用法：python build/gen_update_card.py
输出：项目根目录 生活语文练习台-更新公告-v34至v48.png

沿用 v34 分享卡的米白 / 绿胶囊 / 圆角卡视觉。老师口径：只讲 v34 之后、
保留网址但不放二维码。整张卡是 HTML + CSS 本机 Edge 截图，
不调用图像生成模型、不消耗积分。改文案只改这个文件。
"""
import io
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / '生活语文练习台-更新公告-v34至v48.png'
TMP_HTML = Path(tempfile.gettempdir()) / 'wb_update_card_v48.html'

EDGE = r'C://Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
URL = 'https://workbuddy.link/p/nU41kHmAoelqM2mGxWRFll'
WIDTH = 520
SCALE = 2

CSS = u"""
*{box-sizing:border-box;margin:0;padding:0}
body{width:__W__px;background:#F7F3E8;padding:22px;
     font-family:"Microsoft YaHei","PingFang SC","Hiragino Sans GB",-apple-system,sans-serif;
     color:#1B242C;-webkit-font-smoothing:antialiased}
.card{background:#FFFDF7;border:1.5px solid #E6DCC6;border-radius:22px;
      padding:26px 24px 20px;box-shadow:0 8px 26px rgba(27,36,44,.07)}

.eyebrow{display:inline-block;padding:5px 12px;border-radius:999px;
         background:#E4F1E8;border:1px solid #9CC7AC;color:#2F6B4F;
         font-size:12.5px;font-weight:700;letter-spacing:.4px}
h1{margin:14px 0 0;font-size:33px;line-height:1.2;letter-spacing:.5px}
.sub{margin-top:8px;font-size:13.5px;color:#4A5A66;line-height:1.6;letter-spacing:.2px}

.jump{margin:16px 0 0;padding:10px 14px;background:#F7F3E8;border:1px solid #E6DCC6;
      border-radius:13px;display:flex;align-items:center;gap:10px}
.jump b{font-size:18px;color:#2F6B4F;letter-spacing:.3px;white-space:nowrap}
.jump .line{flex:1;height:2px;background:repeating-linear-gradient(90deg,#9CC7AC 0 5px,transparent 5px 10px)}
.jump .arrow{font-size:14px;color:#9CC7AC}
.jump span.tail{font-size:11.5px;color:#8A8578;white-space:nowrap}

/* 一段话：这是整张卡的主角，断行点写死在句读后 */
.brief{margin:16px 0 0;background:#F7F3E8;border:1px solid #E6DCC6;border-radius:14px;
       padding:14px 15px;font-size:14px;line-height:1.85;color:#2A3A33;letter-spacing:.2px}
.brief b{color:#2F6B4F}

/* 三条要点（修饰类别叫 note：下面角标提示那条已经占了 .note，会整行套上底色） */
.points{margin:15px 0 0}
.pt{display:flex;gap:10px;align-items:center;padding:9px 0;border-top:1px dashed #E6DCC6}
.pt:first-child{border-top:0}
.pt i{flex:none;font-style:normal;font-size:11px;font-weight:700;
      padding:3px 9px;border-radius:999px;letter-spacing:.5px}
.pt.new i{background:#E4F1E8;border:1px solid #9CC7AC;color:#2F6B4F}
.pt.fix i{background:#FDF1E3;border:1px solid #EED3AF;color:#8A5B28}
.pt.remind i{background:#EEF1F4;border:1px solid #D7DDE3;color:#4A5A66}
.pt span{font-size:12.8px;line-height:1.55;color:#2A3A33}
.pt span b{color:#1B242C}

/* 网址 */
.link{margin-top:17px;background:#E4F1E8;border:1px solid #9CC7AC;
      border-radius:14px;padding:13px 14px 12px}
.link h2{font-size:12.5px;color:#2F6B4F;letter-spacing:.5px;margin-bottom:8px}
.link .u{display:block;background:#FFFDF7;border:1px dashed #9CC7AC;border-radius:9px;
         padding:9px 10px;font-size:11.5px;color:#1B242C;word-break:break-all;
         font-family:ui-monospace,Consolas,Menlo,monospace;letter-spacing:.1px}
.link .u-note{margin-top:7px;font-size:11.5px;color:#2A3A33;line-height:1.6}

.note{margin-top:12px;background:#F7F3E8;border-radius:10px;padding:9px 11px;
      font-size:11.8px;line-height:1.7;color:#6B665A}
.note b{color:#1B242C}

.foot{margin-top:14px;padding-top:12px;border-top:1px dashed #E6DCC6;
      display:flex;justify-content:space-between;align-items:center;
      font-size:11px;color:#8A8578;letter-spacing:.3px}
"""

HTML = u"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><style>__CSS__</style></head><body>
<div class="card">
  <div class="eyebrow">更新公告 · 生活语文练习台</div>
  <h1>练习台更新了</h1>
  <div class="sub">v34 → v48　·　2026-11-02 → 11-06　·　<b>线上已是新版</b></div>

  <div class="jump">
    <b>v34</b><span class="line"></span><span class="arrow">▶</span><b>v48</b>
    <span class="tail">已上线</span>
  </div>

  <div class="brief">
    这四天加了<b>早读</b>、<b>乐园听写</b>和<b>错字清单</b>，<br>
    几款游戏的画面也重画了；<br>
    另外修好了<b>大屏上点两次进不去老师端</b>、<br>
    同音字混进选项、刚打开没声音这几个问题。
  </div>

  <div class="points">
    <div class="pt new"><i>新增</i><span>早读模式、乐园听写、结算列出没认出来的字等 <b>6 项</b></span></div>
    <div class="pt fix"><i>修好</i><span>大屏老师入口、同音字干扰项、语音加载等 <b>5 处</b></span></div>
    <div class="pt remind"><i>提醒</i><span><b>刷新就是新版</b>，学生名单和练习记录不动</span></div>
  </div>

  <div class="link">
    <h2>打开新版</h2>
    <span class="u">__URL__</span>
    <div class="u-note">手机、平板、电脑都能直接打开；不用注册、不用安装。</div>
  </div>

  <div class="note">打开后进老师端，角标应是 <b>v48 · 内置词 969</b>；还是 v34 就<b>刷新一下</b>。</div>

  <div class="foot"><span>v48 · 2026-11-06</span><span>打开链接即用</span></div>
</div>
</body></html>"""


def main():
    html = (HTML.replace('__CSS__', CSS)
                .replace('__W__', str(WIDTH))
                .replace('__URL__', URL))
    left = [t for t in ('__CSS__', '__W__', '__URL__') if t in html]
    if left:
        print('ERROR 还有占位符没替换：', left)
        return 1

    base = [EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
            '--hide-scrollbars', '--force-device-scale-factor=%d' % SCALE]
    uri = TMP_HTML.as_uri()

    # 先量卡片真实高度（写进 title 再 dump-dom 读回来），否则底部不是被裁就是拖一片空白
    probe = html.replace('</body>',
                         '<script>window.onload=function(){'
                         'var c=document.querySelector(".card");'
                         'document.title=String(Math.ceil(c.getBoundingClientRect().height)+44);'
                         '};</script></body>')
    TMP_HTML.write_text(probe, encoding='utf-8')
    r = subprocess.run(base + ['--window-size=%d,1200' % WIDTH,
                               '--virtual-time-budget=1500', '--dump-dom', uri],
                       capture_output=True, text=True, timeout=120)
    m = re.search(r'<title>(\d+)</title>', r.stdout or '')
    if not m:
        print('ERROR 没量到高度，dump 片段：', (r.stdout or '')[:300])
        return 1
    height = int(m.group(1))
    print('内容高度 %d px（CSS）→ 输出 %d×%d' % (height, WIDTH * SCALE, height * SCALE))

    TMP_HTML.write_text(html, encoding='utf-8')
    subprocess.run(base + ['--window-size=%d,%d' % (WIDTH, height),
                           '--virtual-time-budget=2500',
                           '--screenshot=' + str(OUT), uri],
                   check=True, timeout=120)
    print('OK', OUT, OUT.stat().st_size, 'B')
    return 0


if __name__ == '__main__':
    sys.exit(main())
