# -*- coding: utf-8 -*-
"""给四款游戏拍快照：初始态 + 答对瞬间（验证捕获动画与容器计数）"""
import io, os, subprocess, tempfile

os.chdir(os.path.dirname(os.path.abspath(__file__)))
SRC = io.open('生活语文练习台.html', encoding='utf-8').read()
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
TMP = os.path.join(tempfile.gettempdir(), 'wb_game_shots')
os.makedirs(TMP, exist_ok=True)

PICK = """
var t=null,i; for(i=0;i<STATE.chars.length;i++){ if(STATE.chars[i].w==='手') t=STATE.chars[i]; }
var target = t || STATE.chars[0];
startGame('%s', [target]);
"""

HIT = """
setTimeout(function(){
  var btns = document.querySelectorAll('#gameField .g-item'), i;
  for (i=0;i<btns.length;i++){
    if (btns[i].getAttribute('data-w') === '手'){ btns[i].click(); break; }
  }
}, 620);
"""

SHOTS = [
    ('fish0', 'fish', '', 2600),
    ('fish1', 'fish', HIT, 1180),
    ('fruit0', 'fruit', '', 2600),
    ('fruit1', 'fruit', HIT, 1180),
    ('feed0', 'feed', '', 2600),
    ('feed1', 'feed', HIT, 1180),
    ('bubble1', 'bubble', HIT, 1180),
]

for name, kind, extra, budget in SHOTS:
    body = 'setTimeout(function(){' + (PICK % kind) + extra + '}, 260);'
    js = '<script>\nwindow.addEventListener("load",function(){' + body + '});\n</script>\n'
    html = SRC.replace('</body>', js + '</body>')
    p = os.path.join(TMP, name + '.html')
    io.open(p, 'w', encoding='utf-8', newline='').write(html)
    out = os.path.join(TMP, name + '.png')
    if os.path.exists(out):
        os.remove(out)
    subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
                    '--user-data-dir=' + os.path.join(TMP, 'ud'),
                    '--hide-scrollbars', '--force-device-scale-factor=1',
                    '--virtual-time-budget=%d' % budget,
                    '--window-size=1180,900',
                    '--screenshot=' + out, 'file:///' + p.replace('\\', '/')],
                   capture_output=True)
    print(name, '->', out, os.path.exists(out))
print('DIR', TMP)
