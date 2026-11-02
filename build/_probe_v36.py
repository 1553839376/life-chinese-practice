# -*- coding: utf-8 -*-
"""v36 探针：三个入口 + 游戏乐园第一屏 + 选字态，真浏览器跑一遍并出预览图。"""
import io, os, re, subprocess, json

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
HTML = os.path.join(HERE, '生活语文练习台.html')

src = io.open(HTML, encoding='utf-8').read()

STATE_JS = u"""
<script>
window.addEventListener('load', function(){ setTimeout(function(){
  var res = [], d = document, $ = function(id){ return d.getElementById(id); };
  try { showScreen('learn'); learnMode('read'); } catch(e){ res.push('boot=' + e.message); }
  res.push('navs=' + Array.prototype.slice.call(d.querySelectorAll('#mainNav .nav-btn'))
    .map(function(b){ return b.textContent.trim(); }).join('/'));
  res.push('oldBtn=' + (!!$('btnPickGame') || !!$('btnPlayAll')));
  res.push('mask=' + !!$('gpMask'));

  d.querySelector('#mainNav [data-nav="games"]').click();
  res.push('pickCards=' + d.querySelectorAll('#gamePick [data-gp]').length);
  res.push('bodyHidden=' + $('learnBody').hidden);
  res.push('tabOn=' + d.querySelector('#mainNav [data-nav="games"]').classList.contains('on') +
                   '/' + d.querySelector('#mainNav [data-nav="learn"]').classList.contains('on'));
  res.push('navH=' + Math.round(d.querySelector('.nav-in').getBoundingClientRect().height));
  res.push('navOverflow=' + (d.querySelector('.nav-in').scrollWidth > d.querySelector('.nav-in').clientWidth));

  d.querySelector('#gamePick [data-gp="fruit"]').click();
  res.push('now=' + $('gnName').textContent + '/' + (!$('gameNow').hidden));
  var cs = d.querySelectorAll('#charGrid .ch-card');
  cs[0].click(); cs[1].click(); cs[2].click();
  res.push('sel=' + d.querySelectorAll('#charGrid .ch-card.sel').length +
           '|' + $('pickNum').textContent + '|' + $('pickStart').textContent +
           '|disabled=' + $('pickStart').disabled);
  cs[0].click();
  res.push('selAfterUntick=' + d.querySelectorAll('#charGrid .ch-card.sel').length +
           '|' + $('pickStart').textContent);
  d.title = res.join('  ');
}, 1400); });
</script>
"""

PLAY_JS = u"""
<script>
window.addEventListener('load', function(){ setTimeout(function(){
  try { showScreen('learn'); learnMode('play'); } catch(e){}
}, 1200); });
</script>
"""

PICKING_JS = u"""
<script>
window.addEventListener('load', function(){ setTimeout(function(){
  try {
    showScreen('learn'); learnMode('play');
    document.querySelector('#gamePick [data-gp="fish"]').click();
    var cs = document.querySelectorAll('#charGrid .ch-card');
    cs[0].click(); cs[1].click(); cs[2].click();
  } catch(e){}
}, 1200); });
</script>
"""

GAME_JS = u"""
<script>
window.addEventListener('load', function(){ setTimeout(function(){
  try {
    showScreen('learn'); learnMode('play');
    document.querySelector('#gamePick [data-gp="fish"]').click();
    var cs = document.querySelectorAll('#charGrid .ch-card');
    cs[0].click(); cs[1].click(); cs[2].click(); cs[3].click();
    document.getElementById('pickStart').click();
  } catch(e){}
}, 1200); });
</script>
"""

def build(name, js):
    p = os.path.join(HERE, name)
    io.open(p, 'w', encoding='utf-8', newline='').write(src.replace('</body>', js + '</body>'))
    return p

def dump(tmp):
    out = subprocess.run([CHROME, '--headless=new', '--no-sandbox', '--disable-gpu',
                          '--virtual-time-budget=9000', '--window-size=1080,900',
                          '--dump-dom', 'file://' + tmp],
                         capture_output=True, text=True).stdout
    m = re.search(r'<title>(.*?)</title>', out, re.S)
    return m.group(1).strip() if m else 'NO TITLE'

def shot(tmp, name, w, h):
    png = os.path.join(HERE, name)
    subprocess.run([CHROME, '--headless=new', '--no-sandbox', '--disable-gpu',
                    '--hide-scrollbars', '--virtual-time-budget=8000',
                    '--window-size=%d,%d' % (w, h), '--screenshot=' + png,
                    'file://' + tmp], capture_output=True, text=True)
    return name, (os.path.getsize(png) // 1024) if os.path.exists(png) else 0

# ① 状态探针
t = build('_v36_state.html', STATE_JS)
print('STATE:', dump(t))

# ② 桌面截图
t_play = build('_v36_play.html', PLAY_JS)
t_pick = build('_v36_picking.html', PICKING_JS)
t_game = build('_v36_game.html', GAME_JS)
print(shot(t_play, '预览-v36-游戏乐园.png', 1080, 820))
print(shot(t_pick, '预览-v36-选字态.png', 1080, 900))
print(shot(t_game, '预览-v36-开玩.png', 1080, 900))

# ③ 390 手机：套 iframe（headless 直接开 390 会被钳到 ~500）
for src_name, png in [('_v36_play.html', '预览-v36-游戏乐园-390.png'),
                      ('_v36_picking.html', '预览-v36-选字态-390.png')]:
    wrap = os.path.join(HERE, '_v36_frame390.html')
    io.open(wrap, 'w', encoding='utf-8', newline='').write(
        u'<!DOCTYPE html><html><head><meta charset="utf-8">'
        u'<style>html,body{margin:0;background:#fff}iframe{width:390px;height:820px;border:0;display:block}'
        u'</style></head><body><iframe src="' + src_name + u'"></iframe></body></html>')
    print(shot(wrap, png, 500, 840))
