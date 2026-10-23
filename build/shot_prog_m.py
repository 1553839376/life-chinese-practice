# -*- coding: utf-8 -*-
"""截老师端「进度总览」的窄屏图（v17 起）。

headless Edge 的 --window-size 会被浏览器边框吃掉一部分（写 400 实际视口 492 左右），
所以这里按「实测视口」反推窗口宽度，并在页面里回落真实 innerWidth 方便核对。

用法：python build/shot_prog_m.py [名字]
输出：%TEMP%/wb_prog_m_<名字>/prog-m.png
"""
import io
import os
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', '生活语文练习台.html')
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

NAME = sys.argv[1] if len(sys.argv) > 1 else 'm'
OUT = os.path.join(tempfile.gettempdir(), 'wb_prog_m_' + NAME)

# 造两个学生：小明（9 个已掌握 + 3 个靠提示 + 1 个需巩固）、小红（3 个已掌握，其余待学）
SETUP = u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    var cs = STATE.chars.filter(function(c){ return c.on && c.w; });
    function pick(a,b){ return cs.slice(a,b).map(function(c){ return c.w; }); }
    STATE.students = [
      { id:'local_a', name:'小明', types:['听音找字'], chars: pick(0,20), groups:[], count:8, status:'在读', photo:'' },
      { id:'local_b', name:'小红', types:['听音找字'], chars: pick(20,34), groups:[], count:8, status:'在读', photo:'' }
    ];
    var now = Date.now(), i, A = pick(0,20), B = pick(20,34);
    function put(stu, w, alone, wrong, prompts, d){
      STATE.logs[stu+'|'+w] = { id:'', key: stu+'|'+w, stu: stu, ch: w, n: alone+wrong,
        alone: alone, hinted:0, wrong: wrong, prompts: prompts,
        last: new Date(now - 86400000*d).toISOString(), level:'', dirty:false };
    }
    for (i = 0; i < 9; i++) put('小明', A[i], 4, 0, 0, 0);
    for (i = 9; i < 12; i++) put('小明', A[i], 1, 1, 2, 2);
    put('小明', A[13], 0, 4, 0, 3);
    for (i = 0; i < 3; i++) put('小红', B[i], 4, 0, 0, 1);
    openTeacher(); TEA_TAB = 'prog'; renderTeacher();
    var o = document.getElementById('teaOffline'); if (o) o.hidden = true;
    var b = document.querySelector('.backup-bar'); if (b) b.style.display = 'none';
  }, 400);
});
"""


def main():
    os.makedirs(OUT, exist_ok=True)
    src = io.open(SRC, encoding='utf-8').read()
    html = src.replace('</body>', '<script>' + SETUP + '</script></body>')
    page = os.path.join(OUT, 'm.html')
    io.open(page, 'w', encoding='utf-8', newline='').write(html)

    shot = os.path.join(OUT, 'prog-m.png')
    if os.path.exists(shot):
        os.remove(shot)
    subprocess.run([
        EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
        '--user-data-dir=' + os.path.join(OUT, 'ud'), '--hide-scrollbars',
        '--force-device-scale-factor=1', '--virtual-time-budget=5000',
        '--window-size=514,1300', '--screenshot=' + shot,
        'file:///' + page.replace('\\', '/'),
    ], capture_output=True)
    print('OK' if os.path.exists(shot) else 'FAIL', shot)


if __name__ == '__main__':
    main()
