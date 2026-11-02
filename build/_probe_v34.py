#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v34 探针：老师入口「连点两下」在真浏览器里的行为（jsdom 之外的二次确认）。
单击不进 / 紧接着点第二下进 / 隔 0.6 秒再点不算双击。只读，不改产物。
用法：python _probe_v34.py"""
import os, re, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '生活语文练习台.html')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

PROBE = """
<script>
window.addEventListener('load', function(){
  setTimeout(function(){
    try {
      showScreen('learn');
      var b = document.getElementById('btnTeacherTop');
      function st(){ return document.getElementById('scrTeacher').hidden; }
      function tap(){
        var r = b.getBoundingClientRect();
        b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true,
          clientX: r.left + 12, clientY: r.top + 12, pointerId: 1, pointerType: 'touch' }));
      }
      var res = [];
      res.push('start=' + st());
      tap(); res.push('one=' + st());
      tap(); res.push('two=' + st());
      showScreen('learn');
      setTimeout(function(){
        tap(); res.push('slowA=' + st());
        setTimeout(function(){
          tap(); res.push('slowB=' + st());
          document.title = res.join(' ') + ' | btnTitle=' + b.title +
            ' | touchAction=' + getComputedStyle(b).touchAction;
        }, 640);
      }, 80);
    } catch(e){ document.title = 'ERR ' + e.message; }
  }, 700);
});
</script>
"""


def main():
    html = open(SRC, encoding='utf-8').read()
    page = os.path.join(HERE, '_v34_probe.html')
    with open(page, 'w', encoding='utf-8', newline='') as f:
        f.write(html.replace('</body>', PROBE + '</body>'))

    out = subprocess.run([CHROME, '--headless=new', '--no-sandbox', '--disable-gpu',
                          '--virtual-time-budget=9000', '--window-size=1080,900',
                          '--dump-dom', 'file://' + page],
                         capture_output=True, text=True).stdout
    m = re.search(r'<title>(.*?)</title>', out, re.S)
    print('  ' + (m.group(1) if m else 'NO TITLE'))

    png = os.path.join(HERE, '预览-v34-乐园顶部.png')
    subprocess.run([CHROME, '--headless=new', '--no-sandbox', '--disable-gpu',
                    '--hide-scrollbars', '--virtual-time-budget=8000',
                    '--window-size=1080,360', '--screenshot=' + png,
                    'file://' + page], capture_output=True, text=True)
    print('  截图 %s %s' % (os.path.basename(png),
                           'ok %d KB' % (os.path.getsize(png) // 1024)
                           if os.path.exists(png) else 'FAIL'))


if __name__ == '__main__':
    main()
