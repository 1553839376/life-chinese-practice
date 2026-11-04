# -*- coding: utf-8 -*-
"""游戏结算框（v39 正确率）拍快照：桌宽 + 窄屏各一张，看四行文案排得下不下"""
import io, os, subprocess, tempfile

os.chdir(os.path.dirname(os.path.abspath(__file__)))
SRC = io.open('生活语文练习台.html', encoding='utf-8').read()
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
TMP = os.path.join(tempfile.gettempdir(), 'wb_gameover_shots')
os.makedirs(TMP, exist_ok=True)

JS = """
window.addEventListener('load', function(){
  setTimeout(function(){
    var i, t = null;
    for (i = 0; i < STATE.chars.length; i++){ if (STATE.chars[i].w === '手') t = STATE.chars[i]; }
    var pool = [t || STATE.chars[0], STATE.chars[1], STATE.chars[2], STATE.chars[3]];
    startGame('%s', pool);
    setTimeout(function(){
      var q = GAME.queue[0], all = document.querySelectorAll('#gameField .g-item');
      var w = null, r = null;
      for (i = 0; i < all.length; i++){
        if (all[i].getAttribute('data-w') === q.w) r = all[i];
        else if (!w) w = all[i];
      }
      if (w) w.click();                       /* 先点错一次 → retried */
      setTimeout(function(){
        if (r) r.click();                     /* 再点对 */
        for (var k = 1; k < GAME.queue.length; k++){
          GAME.i = k; gameQuestion(); clearGameTimer();
          var q2 = GAME.queue[k], a2 = document.querySelectorAll('#gameField .g-item'), r2 = null;
          for (i = 0; i < a2.length; i++) if (a2[i].getAttribute('data-w') === q2.w) r2 = a2[i];
          if (r2) gamePick(r2);
          clearGameTimer();
        }
        GAME.i = GAME.queue.length; gameQuestion();
        document.title = 'OVER ' + (document.getElementById('gameOverBox') || {}).textContent;
      }, 300);
    }, 900);
  }, 300);
});
"""

SHOTS = [('over_wide', 1180, 900), ('over_narrow', 480, 900), ('over_phone', 390, 844)]

for name, w, h in SHOTS:
    html = SRC.replace('</body>', '<script>' + (JS % 'bubble') + '</script>\n</body>')
    p = os.path.join(TMP, name + '.html')
    io.open(p, 'w', encoding='utf-8', newline='').write(html)
    out = os.path.join(TMP, name + '.png')
    if os.path.exists(out):
        os.remove(out)
    r = subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
                        '--user-data-dir=' + os.path.join(TMP, 'ud'),
                        '--hide-scrollbars', '--force-device-scale-factor=1',
                        '--virtual-time-budget=4000',
                        '--window-size=%d,%d' % (w, h),
                        '--screenshot=' + out, 'file:///' + p.replace('\\', '/')],
                       capture_output=True)
    print(name, '->', out, os.path.exists(out))
print('DIR', TMP)
