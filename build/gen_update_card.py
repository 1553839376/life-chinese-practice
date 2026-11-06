# -*- coding: utf-8 -*-
"""生成「生活语文练习台」更新公告卡（v34 → v48）。

用法：python build/gen_update_card.py
输出：项目根目录 生活语文练习台-更新公告-v34至v48.png（竖版长图，微信直接发图 / 打印张贴）

沿用 v34 分享卡那套视觉（米白底 / 绿胶囊 / 圆角卡），同事一眼认得出是同一份东西。
用户口径：只讲 v34 之后（v35→v48）、保留网址但不放二维码。

不调用任何图像生成模型：整张卡是 HTML + CSS，用本机 Edge 无头截图，
所以不消耗积分。改文案只改这个文件。
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

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
URL = 'https://workbuddy.link/p/nU41kHmAoelqM2mGxWRFll'
WIDTH = 520            # CSS 像素，微信里按屏幕宽度铺满
SCALE = 2              # 2 倍图，发出去不糊

# ---------- 内容（写给人看，不写技术黑话） ----------
NEW_ITEMS = [
    ('早读模式', 'v47',
     '挑几个字，一次最多发四张牌，一张张自动翻开念，每个字留 <b>5 秒</b>跟读。<br>可暂停、可跳过，不判分、不写档案。'),
    ('游戏乐园', 'v35 / v36',
     '顶部多了「游戏乐园」：<b>先选玩法，再挑一批字专门练</b>；<br>也可以「随便玩」，四款游戏轮着来。'),
    ('乐园听写 · 默一默', 'v40',
     '听写在乐园里也能玩，<b>不写进学生档案</b>；<br>描写屏多了「默一默」，灰字藏起来凭记忆写。'),
    ('结算列出没认出来的字', 'v45',
     '一局结束，把这局没认出来的字列出来，<br>同一个字只列一次，方便老师接着教。'),
    ('摘果子 / 钓鱼都重画了', 'v46 / v44',
     '树改成简笔画的树，摘下的果子<b>真的掉进旁边的篮子</b>；<br>钓鱼点对了，线会把鱼钓上来。'),
    ('找字更快 · 算分更准', 'v37 / v39',
     '册次改成「先年级、再册次」；游戏正确率按<b>一次就点对</b>算，<br>试错后点对不再算满分。'),
]

FIX_ITEMS = [
    ('希沃大屏上点两次进不去老师端', 'v48',
     '手指点没反应，只有鼠标行',
     '连点两下、双击、按住不放，三种都能进'),
    ('同音字混进干扰项', 'v38',
     '读 hé 时选项里同时有「禾」「和」，选哪个都对、程序只认一个',
     '干扰项一律不同音'),
    ('「看一眼」和老师「提示一下」串成一条', 'v38',
     '按哪个都一个样',
     '学生看一眼亮 3 秒自动合上；老师提示一直亮着'),
    ('刚打开时没有自己的语音', 'v43',
     '首屏先出来、语音还没下载到，临时用浏览器自带声音，音色不对',
     '语音跟首屏一起到'),
    ('几处画面小毛病', 'v44 / v45 / v46',
     '果子落不进篮子、钓鱼场上出现两根线、窄屏结算框标题被裁',
     '都修好了'),
]

CSS = u"""
*{box-sizing:border-box;margin:0;padding:0}
body{width:__W__px;background:#F7F3E8;padding:22px;
     font-family:"Microsoft YaHei","PingFang SC","Hiragino Sans GB",-apple-system,sans-serif;
     color:#1B242C;-webkit-font-smoothing:antialiased}
.card{background:#FFFDF7;border:1.5px solid #E6DCC6;border-radius:22px;
      padding:26px 24px 20px;box-shadow:0 8px 26px rgba(27,36,44,.07)}

/* 顶部 */
.eyebrow{display:inline-block;padding:5px 12px;border-radius:999px;
         background:#E4F1E8;border:1px solid #9CC7AC;color:#2F6B4F;
         font-size:12.5px;font-weight:700;letter-spacing:.4px}
h1{margin:14px 0 0;font-size:32px;line-height:1.2;letter-spacing:.5px}
.sub{margin-top:8px;font-size:13.5px;color:#4A5A66;line-height:1.6;letter-spacing:.2px}
.jump{margin:16px 0 0;padding:11px 14px;background:#F7F3E8;border:1px solid #E6DCC6;
      border-radius:13px;display:flex;align-items:center;gap:10px}
.jump b{font-size:19px;color:#2F6B4F;letter-spacing:.3px;white-space:nowrap}
.jump .line{flex:1;height:2px;background:repeating-linear-gradient(90deg,#9CC7AC 0 5px,transparent 5px 10px)}
.jump .arrow{font-size:15px;color:#9CC7AC}
.jump span.tail{font-size:11.5px;color:#8A8578;white-space:nowrap}

/* 四个数字 */
.facts{margin:12px 0 0;display:grid;grid-template-columns:1fr 1fr;gap:9px}
.fact{background:#F7F3E8;border:1px solid #E6DCC6;border-radius:13px;padding:10px 12px}
.fact b{display:block;font-size:16.5px;line-height:1.25;color:#2F6B4F;letter-spacing:.2px}
.fact span{display:block;margin-top:3px;font-size:11px;color:#8A8578;line-height:1.45}

/* 分区 */
.sec{margin-top:20px}
.sec-h{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.sec-h i{width:5px;height:17px;border-radius:3px;background:#2F6B4F;display:block}
.sec-h b{font-size:15px;letter-spacing:.3px}
.sec-h em{font-style:normal;font-size:11px;color:#8A8578;margin-left:auto}
.sec.fix .sec-h i{background:#B07A3C}
.sec.fix .sec-h b{color:#8A5B28}

/* 新功能条目：标题行放编号+标题+版本胶囊，说明独占整行。
   胶囊若占一列会把正文压窄，中文引号容易被拆到两行（第一版就踩了）。 */
.item{padding:9px 0;border-top:1px dashed #E6DCC6}
.item:first-of-type{border-top:0}
.hd{display:flex;align-items:center;gap:10px}
.n{flex:none;width:19px;height:19px;border-radius:50%;
   background:#2F6B4F;color:#fff;font-size:11px;font-weight:700;
   text-align:center;line-height:19px}
.item .tt{flex:1;font-size:13.5px;font-weight:700;line-height:1.4}
.item .dd{margin:3px 0 0 29px;font-size:11.8px;line-height:1.6;color:#4A5A66}
.item .dd b{color:#2F6B4F}
.ver{flex:none;align-self:center;padding:2px 6px;border-radius:6px;
     background:#E4F1E8;color:#2F6B4F;font-size:10px;white-space:nowrap}

/* 修复条目：以前 -> 现在 */
.fx{background:#FDF6EA;border:1px solid #EED9B8;border-radius:12px;
    padding:10px 11px 9px;margin-top:8px}
.fx .tt{font-size:13px;font-weight:700;line-height:1.4;color:#6B451C}
.fx .tt .p{margin-left:6px;font-size:10px;font-weight:400;color:#A8814F}
.fx .row{display:flex;gap:7px;margin-top:5px;font-size:11.5px;line-height:1.55;color:#5A5346}
.fx .row i{flex:none;font-style:normal;font-size:10px;font-weight:700;
           padding:1px 5px;border-radius:5px;height:17px;line-height:15px}
.fx .row.old i{background:#F3E2C8;color:#9A6B3F}
.fx .row.new i{background:#DCEEDF;color:#2F6B4F}
.fx .row.new span{color:#1B242C}

/* 网址 */
.link{margin-top:20px;background:#E4F1E8;border:1px solid #9CC7AC;
      border-radius:14px;padding:13px 14px 12px}
.link h2{font-size:12.5px;color:#2F6B4F;letter-spacing:.5px;margin-bottom:8px}
.link .u{display:block;background:#FFFDF7;border:1px dashed #9CC7AC;border-radius:9px;
         padding:9px 10px;font-size:11.5px;color:#1B242C;word-break:break-all;
         font-family:ui-monospace,Consolas,Menlo,monospace;letter-spacing:.1px}
.link .u-note{margin-top:7px;font-size:11.5px;color:#2A3A33;line-height:1.6}

/* 老师须知 */
.tips{margin-top:13px;border-top:1px dashed #E6DCC6;padding-top:11px}
.tips h2{font-size:12px;color:#8A8578;letter-spacing:.5px;margin-bottom:7px}
.tip{display:flex;gap:7px;font-size:11.8px;line-height:1.6;color:#4A5A66}
.tip + .tip{margin-top:5px}
.tip .k{flex:none;font-size:10.5px;font-weight:700;color:#2F6B4F;
        border:1px solid #9CC7AC;border-radius:5px;padding:0 4px;height:17px;line-height:16px}
.tip b{color:#1B242C}

.foot{margin-top:14px;padding-top:12px;border-top:1px dashed #E6DCC6;
      display:flex;justify-content:space-between;align-items:center;
      font-size:11px;color:#8A8578;letter-spacing:.3px}
"""

HTML = u"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><style>__CSS__</style></head><body>
<div class="card">
  <div class="eyebrow">更新公告 · 生活语文练习台</div>
  <h1>这四天，练习台更新了</h1>
  <div class="sub">v34 → v48　·　2026-11-02 → 11-06　·　<b>线上已是新版</b></div>

  <div class="jump">
    <b>v34</b><span class="line"></span><span class="arrow">▶</span><b>v48</b>
    <span class="tail">已上线</span>
  </div>

  <div class="facts">
    <div class="fact"><b>6 项新东西</b><span>早读 · 乐园听写 · 错字清单</span></div>
    <div class="fact"><b>5 个问题修好</b><span>大屏入口 · 同音字 · 语音</span></div>
    <div class="fact"><b>不用装、不用迁移</b><span>刷新一下就是新版</span></div>
    <div class="fact"><b>学生数据不动</b><span>名单和练习记录还在你设备上</span></div>
  </div>

  <div class="sec">
    <div class="sec-h"><i></i><b>新增 / 变好用</b><em>6 项</em></div>
    __NEW__
  </div>

  <div class="sec fix">
    <div class="sec-h"><i></i><b>修好了</b><em>以前 → 现在</em></div>
    __FIX__
  </div>

  <div class="link">
    <h2>打开新版</h2>
    <span class="u">__URL__</span>
    <div class="u-note">手机、平板、电脑都能直接打开；不用注册、不用安装。</div>
  </div>

  <div class="tips">
    <h2>给同事的两句话</h2>
    <div class="tip"><i class="k">1</i><span>学生名单和练习记录<b>存在你自己这台设备上</b>，这次升级不会动它们。</span></div>
    <div class="tip"><i class="k">2</i><span>打开后进老师端，角标应是 <b>v48 · 内置词 969</b>；还是 v34 就<b>刷新一下</b>。</span></div>
  </div>

  <div class="foot"><span>v48 · 2026-11-06</span><span>打开链接即用</span></div>
</div>
</body></html>"""


def build_new():
    out = []
    for idx, (title, ver, desc) in enumerate(NEW_ITEMS, 1):
        out.append(
            u'<div class="item"><div class="hd"><i class="n">%d</i>'
            u'<div class="tt">%s</div><span class="ver">%s</span></div>'
            u'<div class="dd">%s</div></div>' % (idx, title, ver, desc))
    return u''.join(out)


def build_fix():
    out = []
    for title, ver, old, new in FIX_ITEMS:
        out.append(
            u'<div class="fx"><div class="tt">%s<span class="p">%s</span></div>'
            u'<div class="row old"><i>以前</i><span>%s</span></div>'
            u'<div class="row new"><i>现在</i><span>%s</span></div></div>'
            % (title, ver, old, new))
    return u''.join(out)


def main():
    html = (HTML.replace('__CSS__', CSS)
                .replace('__W__', str(WIDTH))
                .replace('__NEW__', build_new())
                .replace('__FIX__', build_fix())
                .replace('__URL__', URL))
    left = [t for t in ('__CSS__', '__W__', '__NEW__', '__FIX__', '__URL__') if t in html]
    if left:
        print('ERROR 还有占位符没替换：', left)
        return 1

    base = [EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
            '--hide-scrollbars', '--force-device-scale-factor=%d' % SCALE]
    uri = TMP_HTML.as_uri()

    # 1) 先量真实高度：写进 document.title 再 dump-dom 读回来。
    # 别量 documentElement.scrollHeight（视口比内容高时会返回视口高度，底下拖一大片空白）。
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

    # 2) 按量到的高度截图
    TMP_HTML.write_text(html, encoding='utf-8')
    subprocess.run(base + ['--window-size=%d,%d' % (WIDTH, height),
                           '--virtual-time-budget=2500',
                           '--screenshot=' + str(OUT), uri],
                   check=True, timeout=120)
    print('OK', OUT, OUT.stat().st_size, 'B')
    return 0


if __name__ == '__main__':
    sys.exit(main())
