#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v35 探针：先选游戏再选字（T-030）在真浏览器里跑一遍 + 出预览图。

量到的数字写进 document.title 再 --dump-dom 读回来（headless 下 console 抓不到）。
用法：python _probe_v35.py
"""
import os
import re
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '生活语文练习台.html')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
TMP = os.path.join(HERE, '_v35_probe.html')

PROBE = """
<script>
window.addEventListener('load', function(){
  setTimeout(function(){
    try {
      var d = document, res = [];
      var $ = function(id){ return d.getElementById(id); };
      var cards = function(){ return d.querySelectorAll('#charGrid .ch-card'); };
      showScreen('learn');
      res.push('entry=' + !!$('btnPickGame'));

      /* ① 先选游戏：弹出玩法面板 */
      $('btnPickGame').click();
      res.push('mask=' + ($('gpMask').hidden === false));
      res.push('games=' + d.querySelectorAll('#gpMask [data-gp]').length);

      /* ② 选「钓鱼」：进入多选态 */
      d.querySelector('#gpMask [data-gp="fish"]').click();
      res.push('maskShut=' + $('gpMask').hidden);
      res.push('picking=' + PICK.on + '/' + d.body.classList.contains('picking'));
      res.push('bar=' + ($('pickBar').hidden === false));
      res.push('ck=' + d.querySelectorAll('#charGrid .ch-ck').length);
      res.push('bar0=' + $('pickNum').textContent + '|' + $('pickStart').disabled);

      /* ③ 点三张字卡 */
      var cs = cards();
      cs[0].click(); cs[1].click(); cs[2].click();
      res.push('sel=' + d.querySelectorAll('#charGrid .ch-card.sel').length);
      res.push('bar3=' + $('pickNum').textContent + '|' + $('pickStart').disabled +
               '|' + $('pickStart').textContent);

      /* ④ 再点一下第三张 → 取消掉它 */
      cards()[2].click();
      res.push('sel2=' + d.querySelectorAll('#charGrid .ch-card.sel').length +
               '|' + $('pickNum').textContent);

      /* ⑤ 开始：进游戏，玩法/字单都要对上 */
      $('pickStart').click();
      var q = GAME.queue.map(function(c){ return c.w; }).join('');
      res.push('phase=' + STATE.phase + '|kind=' + GAME.kind +
               '|origin=' + GAME.origin.chars.length +
               '|queue=' + GAME.queue.length + '|' + q);
      res.push('barGone=' + $('pickBar').hidden + '|pickingOff=' + (!PICK.on) +
               '|ckGone=' + (d.querySelectorAll('#charGrid .ch-ck').length === 0));

      document.title = res.join(' ');
    } catch(e){ document.title = 'ERR ' + e.message; }
  }, 900);
});
</script>
"""

# 预览用的三个状态：玩法面板 / 多选态 / 进了游戏
SHOT_JS = {
    'pick': "$('btnPickGame').click();",
    'picking': ("$('btnPickGame').click();"
                "document.querySelector('#gpMask [data-gp=\"fish\"]').click();"
                "var cs=document.querySelectorAll('#charGrid .ch-card');"
                "cs[0].click();cs[1].click();cs[2].click();cs[4].click();"),
    'game': ("$('btnPickGame').click();"
             "document.querySelector('#gpMask [data-gp=\"fish\"]').click();"
             "var cs=document.querySelectorAll('#charGrid .ch-card');"
             "cs[0].click();cs[1].click();cs[2].click();"
             "$('pickStart').click();"),
}


def build_page(js):
    html = open(SRC, encoding='utf-8').read()
    inject = ("<script>window.addEventListener('load',function(){setTimeout(function(){var $="
              "function(id){return document.getElementById(id);};try{%s}catch(e){}},900);});</script>"
              % js)
    with open(TMP, 'w', encoding='utf-8', newline='') as f:
        f.write(html.replace('</body>', inject + '</body>'))


def main():
    html = open(SRC, encoding='utf-8').read()
    with open(TMP, 'w', encoding='utf-8', newline='') as f:
        f.write(html.replace('</body>', PROBE + '</body>'))

    out = subprocess.run([CHROME, '--headless=new', '--no-sandbox', '--disable-gpu',
                          '--virtual-time-budget=9000', '--window-size=1080,900',
                          '--dump-dom', 'file://' + TMP],
                         capture_output=True, text=True).stdout
    m = re.search(r'<title>(.*?)</title>', out, re.S)
    print('  实测：' + (m.group(1) if m else 'NO TITLE'))

    shots = [('pick', '预览-v35-选游戏.png', 1080, 720),
             ('picking', '预览-v35-选字态.png', 1080, 900),
             ('game', '预览-v35-挑字开玩.png', 1080, 900)]
    for js, name, w, h in shots:
        build_page(SHOT_JS[js])
        png = os.path.join(HERE, name)
        subprocess.run([CHROME, '--headless=new', '--no-sandbox', '--disable-gpu',
                        '--hide-scrollbars', '--virtual-time-budget=8000',
                        '--window-size=%d,%d' % (w, h), '--screenshot=' + png,
                        'file://' + TMP], capture_output=True, text=True)
        print('  截图 %s %s' % (name, ('ok %d KB' % (os.path.getsize(png) // 1024))
                                if os.path.exists(png) else 'FAIL'))

    # 窄屏：headless 的窗口宽度会被钳到 ~500px，直接开 390 会「看起来溢出」，
    # 其实是截图裁掉了右边。套一个 390px 的 iframe，媒体查询才真的按 390 算。
    build_page(SHOT_JS['picking'])
    frame = os.path.join(HERE, '_v35_frame390.html')
    with open(frame, 'w', encoding='utf-8', newline='') as f:
        f.write('<!DOCTYPE html><html><head><meta charset="utf-8"><style>'
                'html,body{margin:0;background:#fff}'
                'iframe{width:390px;height:780px;border:0;display:block}'
                '</style></head><body><iframe src="_v35_probe.html"></iframe></body></html>')
    png = os.path.join(HERE, '预览-v35-选字态-390.png')
    subprocess.run([CHROME, '--headless=new', '--no-sandbox', '--disable-gpu',
                    '--hide-scrollbars', '--virtual-time-budget=8000',
                    '--window-size=500,800', '--screenshot=' + png, 'file://' + frame],
                   capture_output=True, text=True)
    print('  截图 %s %s' % (os.path.basename(png),
                           ('ok %d KB' % (os.path.getsize(png) // 1024))
                           if os.path.exists(png) else 'FAIL'))


if __name__ == '__main__':
    main()
