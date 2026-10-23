# -*- coding: utf-8 -*-
"""截「今日字卡」预习页（v18）的三张图：桌面空态 / 桌面读过几张 / 窄屏。

用法：python build/shot_pre.py [tag]
输出：%TEMP%/wb_pre_<tag>/*.png
"""
import io
import os
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', '生活语文练习台.html')
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
TAG = sys.argv[1] if len(sys.argv) > 1 else 'pre'
OUT = os.path.join(tempfile.gettempdir(), 'wb_pre_' + TAG)

# 造一个 20 字的字表：2 个需巩固、2 个已掌握、其余待学，每日题量 8
SETUP = u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    var cs = STATE.chars.filter(function(c){ return c.on && c.w; }).slice(0, 20);
    STATE.chars = cs;
    var names = cs.map(function(c){ return c.w; });
    STATE.logs = {};
    STATE.words = [];
    STATE.students = [{ id:'local_a', name:'小明', types:['听音找字','找一样的字'],
      chars: names, groups: [], count: 8, status:'在读', photo:'' }];
    var now = new Date().toISOString();
    function put(ch, o){
      STATE.logs['小明|' + ch] = Object.assign({ id:'', key:'小明|' + ch, stu:'小明',
        ch: ch, last: now, n: 0, alone: 0, hinted: 0, wrong: 0, prompts: 0,
        level:'', dirty:false }, o);
    }
    put(names[0], { n:4, alone:0, wrong:4 });
    put(names[1], { n:4, alone:0, wrong:3 });
    put(names[2], { n:6, alone:6, wrong:0 });
    put(names[3], { n:5, alone:5, wrong:0 });
    enterStudent('小明');
    var o1 = document.getElementById('teaOffline'); if (o1) o1.hidden = true;
  }, 420);
});
"""

# 读过前 3 张
READ = u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    var cards = document.querySelectorAll('#stage .pre-card');
    for (var i = 0; i < 3 && i < cards.length; i++) cards[i].click();
  }, 900);
});
"""


def shot(name, extra, w, h):
    src = io.open(SRC, encoding='utf-8').read()
    html = src.replace('</body>', '<script>' + SETUP + extra + '</script></body>')
    page = os.path.join(OUT, name + '.html')
    io.open(page, 'w', encoding='utf-8', newline='').write(html)
    img = os.path.join(OUT, name + '.png')
    if os.path.exists(img):
        os.remove(img)
    subprocess.run([
        EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
        '--user-data-dir=' + os.path.join(OUT, 'ud_' + name),
        '--hide-scrollbars', '--force-device-scale-factor=1',
        '--virtual-time-budget=6000',
        '--window-size=%d,%d' % (w, h), '--screenshot=' + img,
        'file:///' + page.replace('\\', '/'),
    ], capture_output=True)
    print(('OK  ' if os.path.exists(img) else 'FAIL'), img)


def main():
    os.makedirs(OUT, exist_ok=True)
    shot('pre-a-桌面', '', 1180, 1200)
    shot('pre-b-读过三张', READ, 1180, 1200)
    # headless 的 window-size 会被边框吃掉，写 514 实际视口约 492
    shot('pre-c-窄屏', READ, 514, 1280)


if __name__ == '__main__':
    main()
