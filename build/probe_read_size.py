# -*- coding: utf-8 -*-
"""量早读屏的实际尺寸（宽 / 窄两档），结果写进 document.title，用 --dump-dom 读。"""
import io
import os
import re
import subprocess
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', '生活语文练习台.html')
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
OUT = os.path.join(tempfile.gettempdir(), 'wb_read')

JS = u"""
window.addEventListener('load', function(){
  setTimeout(function(){
    var pool = STATE.chars.filter(function(c){ return c.w; }).slice(0, 6);
    startGame('read', pool);
    setTimeout(function(){
      var q = function(s){ return document.querySelector(s); };
      var r = function(s){ var e = q(s); if (!e) return '无'; var b = e.getBoundingClientRect();
        return Math.round(b.width) + 'x' + Math.round(b.height); };
      var fs = q('.rd-front b') && getComputedStyle(q('.rd-front b')).fontSize;
      var cn = q('.rd-card').getBoundingClientRect();
      document.title = [
        'stage=' + r('#readStage'),
        'table=' + r('#readTable'),
        'card=' + r('.rd-card'),
        'char=' + fs,
        'next=' + r('#readNext'),
        'foot=' + r('.read-foot'),
        'tip=' + r('.read-tip'),
        'col=' + getComputedStyle(q('#readTable')).gridTemplateColumns,
        'scrollW=' + document.documentElement.scrollWidth + '/' + window.innerWidth,
        'bodyH=' + Math.round(document.body.getBoundingClientRect().height)
      ].join(' | ');
    }, 900);
  }, 300);
});
"""


def run(w, h):
    os.makedirs(OUT, exist_ok=True)
    src = io.open(SRC, encoding='utf-8').read()
    html = src.replace('</body>', '<script>' + JS + '</script>\n</body>')
    page = os.path.join(OUT, 'measure_%d.html' % w)
    io.open(page, 'w', encoding='utf-8', newline='').write(html)
    res = subprocess.run([
        EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
        '--user-data-dir=' + os.path.join(OUT, 'ud'), '--hide-scrollbars',
        '--force-device-scale-factor=1', '--virtual-time-budget=2600',
        '--window-size=%d,%d' % (w, h), '--dump-dom',
        'file:///' + page.replace('\\', '/')], capture_output=True)
    dom = res.stdout.decode('utf-8', 'ignore')
    m = re.search(r'<title>(.*?)</title>', dom, re.S)
    print(w, '→', m.group(1) if m else '没读到 title')


if __name__ == '__main__':
    for w, h in ((1180, 940), (492, 844)):
        run(w, h)
