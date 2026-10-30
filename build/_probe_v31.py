#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v31 视觉探针：把 9 个题型的练习页 / 结算页截出来，桌面与平板两档。
只做截图，不改产物。用法：python _probe_v31.py"""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '生活语文练习台.html')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

TYPES = ['听音找字', '找一样的字', '认读跟读', '图字配对', '看拼音写字',
         '拼词语', '汉字听写', '词语听写', '描红汉字']


def seed(finish):
    """finish=False 停在练习页；True 直接结算。"""
    tail = ''
    if finish:
        tail = """
      var z = STATE.quiz; var n = 0;
      for (var i = 0; i < z.qs.length; i++) n += (z.qs[i].words ? z.qs[i].words.length : 1);
      z.i = z.qs.length; z.right = n;
      renderSummary();
"""
    else:
        tail = """
      var z = STATE.quiz;   /* 先答两题，让题号不是 1/8 那种假数据 */
      if (z && z.qs && z.qs.length > 2){ z.i = 2; z.right = 1; }
      var qn = document.getElementById('qNow'); if (qn) qn.textContent = '3';
"""
    return """
<script>
window.addEventListener('load', function(){
  setTimeout(function(){
    try {
      var chars = STATE.chars.map(function(c){ return c.w; }).slice(0, 10);
      var stu = { id: 'l_v31', name: '小华', types: %s,
        chars: chars, groups: [], count: 6, status: '\u5728\u8bfb', photo: '',
        edited: Date.now() };
      STATE.students = STATE.students.filter(function(s){ return s.id !== 'l_v31'; })
        .concat([stu]);
      saveSnap();
      /* 先记两个题型已完成，看「半途」的样子 */
      var se = SESS || sessEnsure(stu);
      se.done['\u542c\u97f3\u627e\u5b57'] = 1;
      se.done['\u627e\u4e00\u6837\u7684\u5b57'] = 1;
      enterStudent('\u5c0f\u534e');
      setTimeout(function(){
        var g = document.getElementById('homeGo'); if (g) g.click();
        setTimeout(function(){
          var p = document.getElementById('preGo'); if (p) p.click();
          setTimeout(function(){
            try { %s } catch(e){ document.title = 'ERR ' + e.message; }
          }, 420);
        }, 320);
      }, 420);
    } catch(e){ document.title = 'ERR ' + e.message; }
  }, 700);
});
</script>
""" % (repr(TYPES).replace("'", '"'), tail)


def build(name, finish):
    html = open(SRC, encoding='utf-8').read()
    out = os.path.join(HERE, '_v31_%s.html' % name)
    with open(out, 'w', encoding='utf-8', newline='') as f:
        f.write(html.replace('</body>', seed(finish) + '</body>'))
    return out


def shot(page, out, w, h):
    cmd = [CHROME, '--headless=new', '--no-sandbox', '--disable-gpu',
           '--hide-scrollbars', '--virtual-time-budget=6000',
           '--window-size=%d,%d' % (w, h),
           '--screenshot=' + out, 'file://' + page]
    r = subprocess.run(cmd, capture_output=True, text=True)
    print('  %-38s %s' % (os.path.basename(out),
                          'ok %d KB' % (os.path.getsize(out) // 1024) if os.path.exists(out) else 'FAIL ' + r.stderr[-200:]))


if __name__ == '__main__':
    play = build('play', False)
    summ = build('sum', True)
    for w, h, tag in ((1080, 760, 'd'), (768, 760, 't')):
        print('窗口 %dx%d' % (w, h))
        shot(play, os.path.join(HERE, '预览-v31-%s-练习页.png' % tag), w, h)
        shot(summ, os.path.join(HERE, '预览-v31-%s-结算页.png' % tag), w, h)
