# -*- coding: utf-8 -*-
"""v52 六项需求的截图核对：选项 4/6/8 三档、续练条、复习标记、错字本、乐园档位条。

用法：python build/shot_v52.py
输出：%TEMP%/wb_v52/*.png
"""
import io
import os
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', '生活语文练习台.html')
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
OUT = os.path.join(tempfile.gettempdir(), 'wb_v52')

SETUP = u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    var cs = STATE.chars.filter(function(c){ return c.on && c.w; }).slice(0, 14);
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
    /* 前两个字已掌握（会被移出在学），第三个靠提示 */
    put(names[0], { n:6, alone:6, wrong:0, level:'已掌握' });
    put(names[1], { n:6, alone:6, wrong:0, level:'已掌握' });
    put(names[2], { n:4, alone:1, wrong:1, prompts:3 });
    /* 复习计划：这两个字今天到期 —— 字卡上会多一句「要复习 2」 */
    var past = new Date(); past.setDate(past.getDate() - 1);
    function ymd(d){ return d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2) +
      '-' + ('0'+d.getDate()).slice(-2); }
    var rv = {}; rv['小明|' + names[0]] = { box:1, due: ymd(past), n:2, last: ymd(past) };
    rv['小明|' + names[1]] = { box:1, due: ymd(past), n:2, last: ymd(past) };
    localStorage.setItem('wb2_review_v1', JSON.stringify(rv)); REVIEW = null;
    enterStudent('小明');
    var o1 = document.getElementById('teaOffline'); if (o1) o1.hidden = true;
  }, 420);
});
"""

# 练习页 8 档
Q8 = u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    document.getElementById('homeGo').click();
    setTimeout(function(){
      optnSet(8); paintOptnBars();
      document.getElementById('preGo').click();
    }, 320);
  }, 1000);
});
"""
# 练习页 6 档
Q6 = u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    document.getElementById('homeGo').click();
    setTimeout(function(){
      optnSet(6); paintOptnBars();
      document.getElementById('preGo').click();
    }, 320);
  }, 1000);
});
"""
# 4 档（老课堂基线，确认没被改坏）
Q4 = u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    document.getElementById('homeGo').click();
    setTimeout(function(){
      optnSet(4); paintOptnBars();
      document.getElementById('preGo').click();
    }, 320);
  }, 1000);
});
"""
# 今日字卡：续练条 + 复习标记
PRE = u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    localStorage.setItem('wb2_resume_v1', JSON.stringify({ v:1, stu:'小明', type:'听音找字',
      i:3, right:3, prompts:0, retried:0, wc:[], day: todayKey(),
      qs: [{t:'大',o:['大','小','多','少']},{t:'人',o:['人','入','八','大']},
           {t:'上',o:['上','下','土','工']},{t:'手',o:['手','毛','半','牛']},
           {t:'水',o:['水','木','永','冰']}] }));
    document.getElementById('homeGo').click();
  }, 1000);
});
"""
# 乐园玩法选择页 + 选项档位条
LEARN = u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    learnMode('play');
    optnSet(6); paintOptnBars();
  }, 900);
});
"""
# 选字态：勾三个字 + 底部三个按钮
PICKING = u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    learnMode('play');
    pickBegin('fish');
    var cards = document.querySelectorAll('#charGrid .ch-card');
    for (var i = 0; i < 3 && i < cards.length; i++) cards[i].click();
  }, 900);
});
"""


def game(kind, n):
    return u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    optnSet(%d);
    var cs = STATE.chars.slice(0, 6);
    startGame('%s', cs);
  }, 900);
});
""" % (n, kind)


SETTLE = u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    /* 错字本里留几个字，结算页才会出现那一块 */
    wrongBookMark('小明|' + STATE.chars[0].w);
    wrongBookMark('小明|' + STATE.chars[1].w);
    wrongBookMark('小明|' + STATE.chars[2].w);
    document.getElementById('homeGo').click();
    setTimeout(function(){
      document.getElementById('preGo').click();
      setTimeout(function(){
        var z = STATE.quiz;
        z.i = z.qs.length; z.right = z.qs.length; z.retried = 2;
        renderSummary();
      }, 500);
    }, 320);
  }, 1000);
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
        '--virtual-time-budget=9000',
        '--window-size=%d,%d' % (w, h), '--screenshot=' + img,
        'file:///' + page.replace('\\', '/'),
    ], capture_output=True)
    print(('OK  ' if os.path.exists(img) else 'FAIL'), img)


SHOTS = [
    ('a-练习-8档', lambda: (Q8, 1180, 1180)),
    ('b-练习-6档', lambda: (Q6, 1180, 1180)),
    ('c-练习-4档', lambda: (Q4, 1180, 1180)),
    ('d-字卡-续练与复习', lambda: (PRE, 1180, 1000)),
    ('e-乐园-档位条', lambda: (LEARN, 1180, 900)),
    ('f-选字-一键取消', lambda: (PICKING, 1180, 900)),
    ('g-钓鱼-8条', lambda: (game('fish', 8), 1180, 1000)),
    ('h-泡泡-8个', lambda: (game('bubble', 8), 1180, 1000)),
    ('i-果子-8颗', lambda: (game('fruit', 8), 1180, 1000)),
    ('j-喂食-8个', lambda: (game('feed', 8), 1180, 1000)),
    ('k-结算-错字本', lambda: (SETTLE, 1180, 1000)),
    ('l-窄屏-练习8档', lambda: (Q8, 514, 1400)),
]


def main():
    os.makedirs(OUT, exist_ok=True)
    # 可只重拍几张：python build/shot_v52.py e f
    pick = [a for a in sys.argv[1:] if a]
    for name, make in SHOTS:
        if pick and not any(name.startswith(p) for p in pick):
            continue
        extra, w, h = make()
        shot(name, extra, w, h)


if __name__ == '__main__':
    main()
