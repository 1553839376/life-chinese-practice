#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v33 视觉探针：手写操作条统一后，练习页 / 描写屏 / 判分态的实际样子 + 尺寸实测。
只截图，不改产物。用法：python _probe_v33.py"""
import os, re, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '生活语文练习台.html')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'


def seed(body, measure=''):
    return """
<script>
window.addEventListener('load', function(){
  setTimeout(function(){
    try {
      var chars = STATE.chars.map(function(c){ return c.w; }).slice(0, 10);
      var stu = { id: 'l_v33', name: '小华',
        types: ['听音找字','找一样的字','认读跟读','图字配对','看拼音写字','拼词语','汉字听写','词语听写','描红汉字'],
        chars: chars, groups: [], count: 6, status: '在读', photo: '', edited: Date.now() };
      STATE.students = STATE.students.filter(function(s){ return s.id !== 'l_v33'; })
        .concat([stu]);
      saveSnap();
      STATE.cur = stu;
      %s
      %s
    } catch(e){ document.title = 'ERR ' + e.message; }
  }, 700);
});
</script>
""" % (body, measure)


MEASURE = """
setTimeout(function(){
  var rows = document.querySelectorAll('.hw-acts'), out = [], i, bs;
  for (i = 0; i < rows.length; i++){
    bs = rows[i].querySelectorAll('.hw-btn');
    var tops = {}, hs = {}, ws = [];
    for (var k = 0; k < bs.length; k++){
      tops[Math.round(bs[k].getBoundingClientRect().top)] = 1;
      hs[Math.round(bs[k].getBoundingClientRect().height)] = 1;
      ws.push(Math.round(bs[k].getBoundingClientRect().width));
    }
    out.push('acts' + i + ': n=' + bs.length +
      ' rows=' + Object.keys(tops).length +
      ' h=' + Object.keys(hs).join('/') +
      ' w=' + ws.join(','));
  }
  var tip = document.querySelector('.hw-tip');
  document.title = out.join(' | ') +
    ' | tip=' + (tip ? Math.round(tip.getBoundingClientRect().width) + 'px' : '-') +
    ' | inner=' + window.innerWidth + ' scrollW=' + document.documentElement.scrollWidth;
}, 1400);
"""

TRACE = """
      showScreen('learn');
      openTrace({ w: '木', p: 'mù' });
"""

DICT = """
      showScreen('play');
      preReset(stu.name);
      startQuiz('汉字听写');
"""

TRACE_PRACTICE = """
      showScreen('play');
      preReset(stu.name);
      startQuiz('描红汉字');
"""

JUDGE = """
      showScreen('play');
      preReset(stu.name);
      startQuiz('汉字听写');
      setTimeout(function(){
        WG.boxes[0].strokes.push([{ x: 8, y: 8 }, { x: 40, y: 40 }]);
        document.querySelector('#stage [data-wg-act="done"]').click();
      }, 500);
"""


def build(name, body, measure=''):
    html = open(SRC, encoding='utf-8').read()
    out = os.path.join(HERE, '_v33_%s.html' % name)
    with open(out, 'w', encoding='utf-8', newline='') as f:
        f.write(html.replace('</body>', seed(body, measure) + '</body>'))
    return out


def shot(page, out, w, h, budget=8000):
    cmd = [CHROME, '--headless=new', '--no-sandbox', '--disable-gpu',
           '--hide-scrollbars', '--virtual-time-budget=%d' % budget,
           '--window-size=%d,%d' % (w, h),
           '--screenshot=' + out, 'file://' + page]
    r = subprocess.run(cmd, capture_output=True, text=True)
    ok = os.path.exists(out)
    print('  %-30s %s' % (os.path.basename(out),
                          'ok %d KB' % (os.path.getsize(out) // 1024) if ok
                          else 'FAIL ' + r.stderr[-160:]))


def measure(page, w=1080):
    out = subprocess.run([CHROME, '--headless=new', '--no-sandbox', '--disable-gpu',
        '--virtual-time-budget=8000', '--window-size=%d,900' % w, '--dump-dom',
        'file://' + page], capture_output=True, text=True).stdout
    t = re.search(r'<title>(.*?)</title>', out, re.S)
    print('  %4d → %s' % (w, t.group(1) if t else 'NO TITLE'))


if __name__ == '__main__':
    trace = build('trace', TRACE)
    dict_ = build('dict', DICT, MEASURE)
    tracep = build('tracep', TRACE_PRACTICE, MEASURE)
    judge = build('judge', JUDGE, MEASURE)
    shot(trace, os.path.join(HERE, '预览-v33-描写屏.png'), 1080, 900)
    shot(dict_, os.path.join(HERE, '预览-v33-听写页.png'), 1080, 860)
    shot(tracep, os.path.join(HERE, '预览-v33-描红页.png'), 1080, 860)
    shot(judge, os.path.join(HERE, '预览-v33-判分态.png'), 1080, 860)
    shot(trace, os.path.join(HERE, '预览-v33-描写屏-390.png'), 390, 844)
    for tag, page in (('听写', dict_), ('描红', tracep), ('判分', judge)):
        print('  量' + tag)
        for w in (1080, 768, 520, 390):
            measure(page, w)
