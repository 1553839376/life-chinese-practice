# -*- coding: utf-8 -*-
"""截「今天的练习全部完成」那一屏的窄屏图（v26，T-021 第七节）。

学生只排了 1 个题型：做完这一刻既是「结算页」又是「全部完成页」，
最容易出现「完成大字 + 鼓励语 + 按钮」三块挤在一起看不清主次。
按实测视口反推窗口宽度（Edge --window-size 会被边框吃掉一部分）。

用法：python build/shot_done.py
输出：%TEMP%/wb_done/done.png
"""
import io
import os
import subprocess
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', '生活语文练习台.html')
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
OUT = os.path.join(tempfile.gettempdir(), 'wb_done')

SETUP = u"""
window.addEventListener('load', function(){
  setTimeout(function(){
    var cs = STATE.chars.filter(function(c){ return c.on && c.w; });
    var ws = cs.slice(0, 10).map(function(c){ return c.w; });
    STATE.students = [{ id:'local_done', name:'小明', types:['图字配对'],
      chars: ws, groups:[], count: 6, status:'在读', photo:'' }];
    try { localStorage.removeItem('wb2_sess_v1'); } catch(e){}
    saveSnap();
    enterStudent('小明');
    setTimeout(function(){
      var g = document.getElementById('homeGo'); if (g) g.click();
      setTimeout(function(){
        var p = document.getElementById('preGo'); if (p) p.click();
        setTimeout(function(){
          var z = STATE.quiz; if (!z) return;
          z.i = z.qs.length; z.right = z.qs.length;
          renderSummary();
        }, 300);
      }, 300);
    }, 300);
  }, 500);
});
"""


def main():
    os.makedirs(OUT, exist_ok=True)
    src = io.open(SRC, encoding='utf-8').read()
    html = src.replace('</body>', '<script>' + SETUP + '</script></body>')
    page = os.path.join(OUT, 'd.html')
    io.open(page, 'w', encoding='utf-8', newline='').write(html)

    shot = os.path.join(OUT, 'done.png')
    if os.path.exists(shot):
        os.remove(shot)
    subprocess.run([
        EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
        '--user-data-dir=' + os.path.join(OUT, 'ud'), '--hide-scrollbars',
        '--force-device-scale-factor=1', '--virtual-time-budget=6000',
        '--window-size=514,1200', '--screenshot=' + shot,
        'file:///' + page.replace('\\', '/'),
    ], capture_output=True)
    print('OK' if os.path.exists(shot) else 'FAIL', shot)


if __name__ == '__main__':
    main()
