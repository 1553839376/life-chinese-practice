# -*- coding: utf-8 -*-
"""老师端词库截图（T-010 / v15）：内置组词预填、收进词库、窄屏。"""
import io, os, subprocess, tempfile

BUILD = os.path.dirname(os.path.abspath(__file__))
SRC = io.open(os.path.join(BUILD, '生活语文练习台.html'), encoding='utf-8').read()
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
OUT = os.path.join(tempfile.gettempdir(), 'wb_wordlib')
os.makedirs(OUT, exist_ok=True)

BASE = u"""
function __openWord(){
  openTeacher(); TEA_TAB = 'word'; renderTeacher();
}
"""

A = BASE + u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    __openWord();
    setTimeout(function(){
      var box = document.getElementById('tpWord');
      if (box && box.scrollIntoView) box.scrollIntoView({ block: 'start' });
    }, 300);
  }, 420);
});
"""

B = BASE + u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    __openWord();
    setTimeout(function(){
      var b = document.querySelector('[data-wcopy="大人"]');
      if (b) b.click();
      setTimeout(function(){
        var s = document.getElementById('wdSearch');
        s.value = '大人';
        s.dispatchEvent(new Event('input', { bubbles: true }));
        setTimeout(function(){
          var box = document.getElementById('tpWord');
          if (box && box.scrollIntoView) box.scrollIntoView({ block: 'start' });
        }, 320);
      }, 420);
    }, 420);
  }, 420);
});
"""

C = BASE + u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    __openWord();
    setTimeout(function(){
      var s = document.getElementById('wdSearch');
      s.value = '山';
      s.dispatchEvent(new Event('input', { bubbles: true }));
    }, 320);
  }, 420);
});
"""

SHOTS = [
    ('wordlib-a-内置组词', A, '1180,1000'),
    ('wordlib-b-收进词库并搜索', B, '1180,1000'),
    ('wordlib-c-窄屏', C, '560,1100'),
]
for name, probe, size in SHOTS:
    html = SRC.replace('</body>', '<script>' + probe + '</script></body>')
    p = os.path.join(OUT, name + '.html')
    io.open(p, 'w', encoding='utf-8', newline='').write(html)
    out = os.path.join(OUT, name + '.png')
    if os.path.exists(out):
        os.remove(out)
    subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
                    '--user-data-dir=' + os.path.join(OUT, 'ud_' + name),
                    '--hide-scrollbars', '--force-device-scale-factor=1',
                    '--virtual-time-budget=7000', '--window-size=' + size,
                    '--screenshot=' + out, 'file:///' + p.replace('\\', '/')],
                   capture_output=True)
    print(name, os.path.exists(out), out, (os.path.getsize(out) if os.path.exists(out) else 0), 'B')
