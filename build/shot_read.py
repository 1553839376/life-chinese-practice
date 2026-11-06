# -*- coding: utf-8 -*-
"""早读屏快照：发牌落下、翻开第一张的样子。

用法：python build/shot_read.py
输出：%TEMP%/wb_read/*.png
"""
import io
import os
import subprocess
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', '生活语文练习台.html')
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
OUT = os.path.join(tempfile.gettempdir(), 'wb_read')

# 用固定几个字，别让随机字表影响画面对比
JS = u"""
window.addEventListener('load', function(){
  setTimeout(function(){
    var want = '人手男女大小';
    var pool = [];
    for (var i = 0; i < want.length; i++){
      for (var j = 0; j < STATE.chars.length; j++){
        if (STATE.chars[j].w === want.charAt(i)){ pool.push(STATE.chars[j]); break; }
      }
    }
    if (pool.length < 4) pool = STATE.chars.filter(function(c){ return c.w; }).slice(0, 6);
    startGame('read', pool);
    document.title = 'READ ' + pool.length;
  }, 260);
});
"""

# 第四张：四张牌全翻开的样子（走到一批尾声），给老师看「读过哪些一目了然」
JS_ALL = JS.replace("startGame('read', pool);",
                    "startGame('read', pool);\n"
                    "    setTimeout(function(){ readFlip(0); readFlip(1); readFlip(2); readFlip(3); }, 800);")

SHOTS = [('read_wide', 1180, 940, 1700), ('read_all', 1180, 940, 2200),
         ('read_narrow', 492, 844, 1700)]


def main():
    os.makedirs(OUT, exist_ok=True)
    src = io.open(SRC, encoding='utf-8').read()
    for name, w, h, vt in SHOTS:
        js = JS_ALL if name == 'read_all' else JS
        html = src.replace('</body>', '<script>' + js + '</script>\n</body>')
        page = os.path.join(OUT, name + '.html')
        io.open(page, 'w', encoding='utf-8', newline='').write(html)
        shot = os.path.join(OUT, name + '.png')
        if os.path.exists(shot):
            os.remove(shot)
        subprocess.run([
            EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
            '--user-data-dir=' + os.path.join(OUT, 'ud'), '--hide-scrollbars',
            '--force-device-scale-factor=1',
            '--virtual-time-budget=%d' % vt,
            '--window-size=%d,%d' % (w, h), '--screenshot=' + shot,
            'file:///' + page.replace('\\', '/')], capture_output=True)
        print(name, os.path.exists(shot))
    print('DIR', OUT)


if __name__ == '__main__':
    main()
