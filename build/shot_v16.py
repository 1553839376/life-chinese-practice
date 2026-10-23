# -*- coding: utf-8 -*-
"""v16 词库空表抢救截图：① 老师端角标（版本 + 内置词数）② 兜底时的界面提示。"""
import io, os, subprocess, tempfile

BUILD = os.path.dirname(os.path.abspath(__file__))
SRC = io.open(os.path.join(BUILD, '生活语文练习台.html'), encoding='utf-8').read()
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
OUT = os.path.join(tempfile.gettempdir(), 'wb_v16')
os.makedirs(OUT, exist_ok=True)

A = u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    openTeacher(); TEA_TAB = 'word'; renderTeacher();
  }, 500);
});
"""

B = u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    /* 模拟「字库组词栏被抹 + 整张表是外来字」，看兜底界面 */
    STATE.chars = [
      { id:'local_z1', kind:'字', w:'淼', p:'miǎo', g:'测试', img:'', words:'', sent:'', on:true },
      { id:'local_z2', kind:'字', w:'焱', p:'yàn', g:'测试', img:'', words:'', sent:'', on:true }
    ];
    BUILTIN_WORDS = null; WORD_BANK = null;
    openTeacher(); TEA_TAB = 'word'; renderTeacher();
  }, 500);
});
"""

SHOTS = [
    ('v16-a-角标与词库', A, '1180,900'),
    ('v16-b-兜底提示', B, '1180,760'),
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
