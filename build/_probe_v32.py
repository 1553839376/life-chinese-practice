#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v32 视觉探针：擦掉按钮（橡皮擦图标）在乐园描写屏 / 练习手写题里的实际样子。
只截图，不改产物。用法：python _probe_v32.py"""
import os, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '生活语文练习台.html')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'


def seed(body):
    return """
<script>
window.addEventListener('load', function(){
  setTimeout(function(){
    try {
      var chars = STATE.chars.map(function(c){ return c.w; }).slice(0, 10);
      var stu = { id: 'l_v32', name: '小华',
        types: ['听音找字','找一样的字','认读跟读','图字配对','看拼音写字','拼词语','汉字听写','词语听写','描红汉字'],
        chars: chars, groups: [], count: 6, status: '在读', photo: '', edited: Date.now() };
      STATE.students = STATE.students.filter(function(s){ return s.id !== 'l_v32'; })
        .concat([stu]);
      saveSnap();
      STATE.cur = stu;
      %s
    } catch(e){ document.title = 'ERR ' + e.message; }
  }, 700);
});
</script>
""" % body


def build(name, body):
    html = open(SRC, encoding='utf-8').read()
    out = os.path.join(HERE, '_v32_%s.html' % name)
    with open(out, 'w', encoding='utf-8', newline='') as f:
        f.write(html.replace('</body>', seed(body) + '</body>'))
    return out


def shot(page, out, w, h, budget=7000):
    cmd = [CHROME, '--headless=new', '--no-sandbox', '--disable-gpu',
           '--hide-scrollbars', '--virtual-time-budget=%d' % budget,
           '--window-size=%d,%d' % (w, h),
           '--screenshot=' + out, 'file://' + page]
    r = subprocess.run(cmd, capture_output=True, text=True)
    ok = os.path.exists(out)
    print('  %-34s %s' % (os.path.basename(out),
                          'ok %d KB' % (os.path.getsize(out) // 1024) if ok
                          else 'FAIL ' + r.stderr[-160:]))


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

SWAP = """
      /* 真画布验证换字清屏：先在「木」上画一笔，再打开「大」，
         截出来的图里如果还有那笔手写，就是没修好 */
      showScreen('learn');
      openTrace({ w: '木', p: 'mù' });
      setTimeout(function(){
        var cv = document.getElementById('soInk'), r = cv.getBoundingClientRect();
        function ev(t, x, y){
          cv.dispatchEvent(new PointerEvent(t, { clientX: r.left + x, clientY: r.top + y,
            pointerId: 1, bubbles: true, cancelable: true }));
        }
        ev('pointerdown', 50, 60); ev('pointermove', 120, 140);
        ev('pointermove', 200, 200); ev('pointerup', 200, 200);
        var before = (TRACE.box && TRACE.box.strokes.length) || 0;
        setTimeout(function(){
          openTrace({ w: '大', p: 'dà' });
          setTimeout(function(){
            var after = (TRACE.box && TRACE.box.strokes.length) || 0;
            document.title = 'INK ' + before + ' -> ' + after;
          }, 260);
        }, 500);
      }, 1600);
"""

# 图标本身：放大 4 倍，光看形状
ICON = """
      document.body.innerHTML =
        '<div style="padding:40px 46px;background:#fff">' +
          '<div style="transform:scale(5);transform-origin:0 0;display:inline-block">' +
            '<button class="ghost-btn with-ico" type="button">' + ICO_ERASE +
              '<span>擦掉重写</span></button>' +
          '</div>' +
        '</div>';
"""

if __name__ == '__main__':
    trace = build('trace', TRACE)
    dict_ = build('dict', DICT)
    tracep = build('tracep', TRACE_PRACTICE)
    icon = build('icon', ICON)
    swap = build('swap', SWAP)
    shot(trace, os.path.join(HERE, '预览-v32-描写屏.png'), 1080, 900)
    shot(dict_, os.path.join(HERE, '预览-v32-听写页.png'), 1080, 860)
    shot(tracep, os.path.join(HERE, '预览-v32-描红页.png'), 1080, 860)
    shot(icon, os.path.join(HERE, '预览-v32-图标放大.png'), 640, 300)
    shot(swap, os.path.join(HERE, '预览-v32-换字后.png'), 1080, 900)
    out = subprocess.run([CHROME, '--headless=new', '--no-sandbox', '--disable-gpu',
        '--virtual-time-budget=7000', '--window-size=1080,900', '--dump-dom',
        'file://' + swap], capture_output=True, text=True).stdout
    import re
    t = re.search(r'<title>(.*?)</title>', out, re.S)
    print('  换字前/后笔迹数:', t.group(1) if t else 'NO TITLE')
