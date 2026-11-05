# -*- coding: utf-8 -*-
"""v45「结算页列错字」两处快照：游戏乐园（钓鱼）结算 + 班级练习（听音找字）结算，宽屏与 390 各一张。

用法：python build/shot_wrong.py
输出：%TEMP%/wb_wrong/*.png
"""
import io
import os
import subprocess
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', '生活语文练习台.html')
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
OUT = os.path.join(tempfile.gettempdir(), 'wb_wrong')

# 游戏乐园：钓鱼局，前 3 题先点错再点对 → 结算里应该列出这 3 个「没找出来」的字
JS_GAME = u"""
window.addEventListener('load', function(){
  setTimeout(function(){
    var pool = STATE.chars.filter(function(c){ return c.w; }).slice(0, 8);
    startGame('fish', pool);
    setTimeout(function(){
      playRound(0);
      function playRound(k){
        if (k >= GAME.queue.length){
          clearGameTimer(); GAME.i = GAME.queue.length; gameQuestion();
          var b = document.getElementById('gameOverBox');
          document.title = 'OVER ' + (b ? b.textContent : 'NULL');
          return;
        }
        clearGameTimer(); GAME.i = k; gameQuestion(); clearGameTimer();
        var q = GAME.queue[k], all = document.querySelectorAll('#gameField .g-item');
        var r = null, w = null, i;
        for (i = 0; i < all.length; i++){
          var dw = all[i].getAttribute('data-w');
          if (dw === q.w) r = all[i];
          else if (!w) w = all[i];
        }
        var wrongFirst = (k < 3);
        if (wrongFirst && w) w.click();
        setTimeout(function(){
          if (r) r.click();
          clearGameTimer();
          setTimeout(function(){ playRound(k + 1); }, 40);
        }, wrongFirst ? 130 : 20);
      }
    }, 400);
  }, 300);
});
"""

# 班级练习：听音找字，先真点错一次，再把前 3 题的目标字都算进「没听出来」
JS_SUM = u"""
window.addEventListener('load', function(){
  setTimeout(function(){
    var cs = STATE.chars.filter(function(c){ return c.on && c.w; });
    var ws = cs.slice(0, 10).map(function(c){ return c.w; });
    STATE.students = [{ id:'local_wr', name:'小明', types:['听音找字'],
      chars: ws, groups:[], count: 6, status:'在读', photo:'' }];
    try { localStorage.removeItem('wb2_sess_v1'); } catch(e){}
    saveSnap();
    enterStudent('小明');
    setTimeout(function(){
      var g = document.getElementById('homeGo'); if (g) g.click();
      setTimeout(function(){
        var p = document.getElementById('preGo'); if (p) p.click();
        setTimeout(function(){
          var z = STATE.quiz; if (!z) { document.title = 'NOQUIZ'; return; }
          var opts = document.querySelectorAll('#stage .opt'), i;
          for (i = 0; i < opts.length; i++){
            if (opts[i].getAttribute('data-c') !== z.qs[0].target.w){ opts[i].click(); break; }
          }
          setTimeout(function(){
            z.wrongChars = [z.qs[0].target, z.qs[1].target, z.qs[2].target];
            var n = 0, k;
            for (k = 0; k < z.qs.length; k++) n += z.qs[k].words ? z.qs[k].words.length : 1;
            z.i = z.qs.length; z.right = n - 3;
            renderSummary();
            document.title = 'SUM ' + (document.querySelector('#stage .wrong-box') || {}).textContent;
          }, 200);
        }, 400);
      }, 350);
    }, 350);
  }, 400);
});
"""

SHOTS = [
    ('wrong_game_wide', JS_GAME, 1180, 940),
    # headless=new 的视口宽度被钳在 492（--window-size=390 只是把右边裁掉，不是真的 390），
    # 所以窄屏这两张按 492 拍；390 的观感另用数值核对（.game-over 能滚、不横滚）。
    ('wrong_game_narrow', JS_GAME, 492, 844),
    ('wrong_sum_wide', JS_SUM, 1180, 940),
    ('wrong_sum_narrow', JS_SUM, 492, 844),
]


def main():
    os.makedirs(OUT, exist_ok=True)
    src = io.open(SRC, encoding='utf-8').read()
    for name, js, w, h in SHOTS:
        html = src.replace('</body>', '<script>' + js + '</script>\n</body>')
        page = os.path.join(OUT, name + '.html')
        io.open(page, 'w', encoding='utf-8', newline='').write(html)
        shot = os.path.join(OUT, name + '.png')
        if os.path.exists(shot):
            os.remove(shot)
        subprocess.run([
            EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
            '--user-data-dir=' + os.path.join(OUT, 'ud'), '--hide-scrollbars',
            '--force-device-scale-factor=1', '--virtual-time-budget=9000',
            '--window-size=%d,%d' % (w, h), '--screenshot=' + shot,
            'file:///' + page.replace('\\', '/')], capture_output=True)
        print(name, os.path.exists(shot))
    print('DIR', OUT)


if __name__ == '__main__':
    main()
