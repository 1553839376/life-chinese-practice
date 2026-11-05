# -*- coding: utf-8 -*-
"""摘果子掉落核对（v46）：点对一个果子后，量
  ① fruitDropTo 写进 --fd-x/--fd-y 的位移；
  ② 果子起始中心 + 位移 = 预测落点；
  ③ 篮子口沿中心（左右居中、上下 0.34 处）；
  ④ 预测落点与篮口中心的偏差（应该在 2px 以内）。
结果写进 document.title，用 --dump-dom 读。另外摆一帧「掉到一半」的动画截图。

用法：python build/probe_fruit_drop.py
"""
import io
import os
import re
import subprocess
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', '生活语文练习台.html')
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
OUT = os.path.join(tempfile.gettempdir(), 'wb_fruit_drop')

PROBE = u"""
window.addEventListener('load', function(){
  setTimeout(function(){
    var pool = STATE.chars.filter(function(c){ return c.w; }).slice(0, 4);
    startGame('fruit', pool);
    setTimeout(function(){
      var q = GAME.queue[0], all = document.querySelectorAll('#gameField .fruit');
      var el = null, i;
      for (i = 0; i < all.length; i++) if (all[i].getAttribute('data-w') === q.w) el = all[i];
      if (!el){ document.title = 'NO_EL'; return; }
      var bsk = document.querySelector('#gameField .basket');
      var er = el.getBoundingClientRect(), br = bsk.getBoundingClientRect();
      var sx = er.left + er.width / 2, sy = er.top + er.height / 2;
      var mx = br.left + br.width / 2, my = br.top + br.height * 0.34;
      el.click();
      clearGameTimer();                 /* 别让 gameAward 的 880ms 把题翻过去 */
      setTimeout(function(){
        clearGameTimer();
        var fx = el.style.getPropertyValue('--fd-x'), fy = el.style.getPropertyValue('--fd-y');
        var dx = parseFloat(fx) || 0, dy = parseFloat(fy) || 0;
        var lx = sx + dx, ly = sy + dy;
        var gap = Math.sqrt(Math.pow(lx - mx, 2) + Math.pow(ly - my, 2));
        document.title = 'DROP sx=' + Math.round(sx) + ' sy=' + Math.round(sy) +
          ' dx=' + Math.round(dx) + ' dy=' + Math.round(dy) +
          ' land=' + Math.round(lx) + ',' + Math.round(ly) +
          ' mouth=' + Math.round(mx) + ',' + Math.round(my) +
          ' gap=' + gap.toFixed(1) +
          ' stage=' + (document.getElementById('treeStage') ? 'on' : 'off') +
          ' basketInStage=' + (bsk.parentNode && bsk.parentNode.className);
        /* headless 既不推进 CSS 时间、也不会被负 delay 骗到中间帧，所以照 _mk_reel.py 的老办法：
           直接把「掉到 p」这一帧摆出来。.fruit 带 filter:drop-shadow 会进独立合成层，
           摆帧后截图仍按旧像素画（v44 钓鱼踩过三次），所以摆帧时先把 filter 摘掉。 */
        var p = parseFloat((location.hash.match(/p=([\d.]+)/) || [0, '0.55'])[1]);
        el.style.animation = 'none';
        el.style.filter = 'none';
        void el.offsetWidth;
        el.style.transform = 'translate(' + (dx * p).toFixed(1) + 'px,' + (dy * p).toFixed(1) +
          'px) rotate(' + (26 * p).toFixed(1) + 'deg) scale(' + (1 - 0.58 * p).toFixed(3) + ')';
        el.style.opacity = String(1 - p * p);
      }, 120);
    }, 500);
  }, 300);
});
"""

SHOTS = [('drop_wide', 1180, 940), ('drop_narrow', 492, 844)]


def main():
    os.makedirs(OUT, exist_ok=True)
    src = io.open(SRC, encoding='utf-8').read()
    for name, w, h in SHOTS:
        html = src.replace('</body>', '<script>' + PROBE + '</script>\n</body>')
        page = os.path.join(OUT, name + '.html')
        io.open(page, 'w', encoding='utf-8', newline='').write(html)
        shot = os.path.join(OUT, name + '.png')
        if os.path.exists(shot):
            os.remove(shot)
        # 先 dump-dom 拿数值
        r = subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
                            '--user-data-dir=' + os.path.join(OUT, 'ud'),
                            '--window-size=%d,%d' % (w, h),
                            '--virtual-time-budget=4000', '--dump-dom',
                            'file:///' + page.replace('\\', '/')],
                           capture_output=True, text=True, encoding='utf-8', errors='replace')
        m = re.search(r'<title>([^<]*)</title>', r.stdout or '')
        print(name, '::', m.group(1) if m else '(no title)')
        subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
                        '--user-data-dir=' + os.path.join(OUT, 'ud'), '--hide-scrollbars',
                        '--force-device-scale-factor=1', '--virtual-time-budget=4000',
                        '--window-size=%d,%d' % (w, h), '--screenshot=' + shot,
                        'file:///' + page.replace('\\', '/')], capture_output=True)
    print('DIR', OUT)


if __name__ == '__main__':
    main()
