# -*- coding: utf-8 -*-
"""截「在学上限」相关界面（T-009 / v19）：学生表单字段 + 档案页在学标记。

用法：python build/shot_cap.py [tag]
输出：%TEMP%/wb_cap_<tag>/*.png
"""
import io
import os
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', '生活语文练习台.html')
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
TAG = sys.argv[1] if len(sys.argv) > 1 else 'cap'
OUT = os.path.join(tempfile.gettempdir(), 'wb_cap_' + TAG)

# 造一个 30 字的学生：8 个已掌握、2 个需巩固，在学上限 6
SEED = u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    var seen = {}, pool = [];
    STATE.chars.forEach(function(c){
      if (!c.on || !c.w || seen[c.w]) return;
      seen[c.w] = 1; pool.push(c.w);
    });
    pool = pool.slice(0, 30);
    /* 不裁 STATE.chars（裁了内置词就只剩几十个，角标会显示「内置词 52」），
       只把学生的字表设成 30 个 */
    STATE.logs = {}; STATE.words = [];
    STATE.students = [{ id:'local_a', name:'小明', types:['听音找字','认读跟读'],
      chars: pool.slice(), groups: [], count: 6, status:'在读', photo:'' }];
    var now = new Date().toISOString();
    function put(ch, o){
      STATE.logs['小明|' + ch] = Object.assign({ id:'', key:'小明|' + ch, stu:'小明',
        ch: ch, last: now, n:0, alone:0, hinted:0, wrong:0, prompts:0, level:'', dirty:false }, o);
    }
    pool.slice(0, 8).forEach(function(ch){ put(ch, { n: 5, alone: 5, wrong: 0 }); });
    put(pool[10], { n: 4, alone: 0, wrong: 4 });
    put(pool[11], { n: 4, alone: 0, wrong: 3 });
    openTeacher();
    TEA_TAB = 'stu';
    renderTeacher();
    var o = document.getElementById('teaOffline'); if (o) o.hidden = true;
  }, 420);
});
"""

# 档案页
PROF = SEED + u"""
window.addEventListener("load", function(){
  setTimeout(function(){ openStuProfile('小明'); }, 900);
});
"""

# 学生表单（看「在学字数」输入框）
FORM = SEED + u"""
window.addEventListener("load", function(){
  setTimeout(function(){ openStuForm('小明'); }, 900);
});
"""


def shot(name, extra, w, h):
    src = io.open(SRC, encoding='utf-8').read()
    html = src.replace('</body>', '<script>' + extra + '</script></body>')
    page = os.path.join(OUT, name + '.html')
    io.open(page, 'w', encoding='utf-8', newline='').write(html)
    img = os.path.join(OUT, name + '.png')
    if os.path.exists(img):
        os.remove(img)
    subprocess.run([
        EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
        '--user-data-dir=' + os.path.join(OUT, 'ud_' + name),
        '--hide-scrollbars', '--force-device-scale-factor=1',
        '--virtual-time-budget=7000',
        '--window-size=%d,%d' % (w, h), '--screenshot=' + img,
        'file:///' + page.replace('\\', '/'),
    ], capture_output=True)
    print(('OK  ' if os.path.exists(img) else 'FAIL'), img)


def main():
    os.makedirs(OUT, exist_ok=True)
    shot('cap-a-档案页', PROF, 1180, 1400)
    shot('cap-b-学生表单', FORM, 1180, 1100)
    shot('cap-c-窄屏档案', PROF, 514, 1500)


if __name__ == '__main__':
    main()
