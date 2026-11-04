# -*- coding: utf-8 -*-
"""v40 拍快照：游戏乐园六张玩法卡 / 听写屏 / 描写屏的默写态"""
import io, os, subprocess, tempfile

os.chdir(os.path.dirname(os.path.abspath(__file__)))
SRC = io.open('生活语文练习台.html', encoding='utf-8').read()
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
TMP = os.path.join(tempfile.gettempdir(), 'wb_v40_shots')
os.makedirs(TMP, exist_ok=True)

PICK = """
setTimeout(function(){
  learnMode('play');
  document.getElementById('learnBody').hidden = true;
}, 400);
"""

DICT = """
setTimeout(function(){
  var i, t = null;
  for (i = 0; i < STATE.chars.length; i++){ if (STATE.chars[i].w === '手') t = STATE.chars[i]; }
  startGame('dict', [t || STATE.chars[0], STATE.chars[1], STATE.chars[2], STATE.chars[3]]);
}, 400);
"""

TRACE = """
setTimeout(function(){
  var i, c = null;
  for (i = 0; i < STATE.chars.length; i++){ if (STATE.chars[i].w === '木') c = STATE.chars[i]; }
  openTrace(c || STATE.chars[0]);
  setTimeout(function(){
    document.getElementById('traceMem').click();
  }, 700);
}, 400);
"""

SHOTS = [
    ('picks', PICK, 1600, 1180, 900),
    ('dict_wide', DICT, 2200, 1180, 900),
    ('dict_narrow', DICT, 2200, 390, 844),
    ('trace_recite', TRACE, 2200, 900, 900),
]

for name, js, budget, w, h in SHOTS:
    html = SRC.replace('</body>', '<script>\nwindow.addEventListener("load",function(){'
                       + js + '});\n</script>\n</body>')
    p = os.path.join(TMP, name + '.html')
    io.open(p, 'w', encoding='utf-8', newline='').write(html)
    out = os.path.join(TMP, name + '.png')
    if os.path.exists(out):
        os.remove(out)
    subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
                    '--user-data-dir=' + os.path.join(TMP, 'ud'),
                    '--hide-scrollbars', '--force-device-scale-factor=1',
                    '--virtual-time-budget=%d' % budget,
                    '--window-size=%d,%d' % (w, h),
                    '--screenshot=' + out, 'file:///' + p.replace('\\', '/')],
                   capture_output=True)
    print(name, '->', out, os.path.exists(out))
print('DIR', TMP)
