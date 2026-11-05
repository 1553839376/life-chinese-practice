# -*- coding: utf-8 -*-
"""摘果子一屏现状快照（改树之前先看清现在长什么样）。

用法：python build/shot_fruit_now.py
输出：%TEMP%/wb_fruit/*.png
"""
import io
import os
import subprocess
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', '生活语文练习台.html')
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
OUT = os.path.join(tempfile.gettempdir(), 'wb_fruit')

JS = u"""
window.addEventListener('load', function(){
  setTimeout(function(){
    var pool = STATE.chars.filter(function(c){ return c.w; }).slice(0, 4);
    startGame('fruit', pool);
    setTimeout(function(){
      var q = GAME.queue[0];
      document.title = 'READY ' + q.w;
    }, 500);
  }, 300);
});
"""

SHOTS = [('fruit_wide', 1180, 940), ('fruit_narrow', 492, 844)]


def main():
    os.makedirs(OUT, exist_ok=True)
    src = io.open(SRC, encoding='utf-8').read()
    for name, w, h in SHOTS:
        html = src.replace('</body>', '<script>' + JS + '</script>\n</body>')
        page = os.path.join(OUT, name + '.html')
        io.open(page, 'w', encoding='utf-8', newline='').write(html)
        shot = os.path.join(OUT, name + '.png')
        if os.path.exists(shot):
            os.remove(shot)
        subprocess.run([
            EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
            '--user-data-dir=' + os.path.join(OUT, 'ud'), '--hide-scrollbars',
            '--force-device-scale-factor=1', '--virtual-time-budget=4000',
            '--window-size=%d,%d' % (w, h), '--screenshot=' + shot,
            'file:///' + page.replace('\\', '/')], capture_output=True)
        print(name, os.path.exists(shot))
    print('DIR', OUT)


if __name__ == '__main__':
    main()
