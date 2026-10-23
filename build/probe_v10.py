# -*- coding: utf-8 -*-
"""v10 目检：跟读大按钮的位置与尺寸、鱼的摆尾动效、音效音量参数。
用法：python probe_v10.py
产物写到系统临时目录 wb_v10/ 下，同时打印关键测量值。
"""
import io, os, re, subprocess, tempfile

os.chdir(os.path.dirname(os.path.abspath(__file__)))
SRC = io.open('生活语文练习台.html', encoding='utf-8').read()
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
TMP = os.path.join(tempfile.gettempdir(), 'wb_v10')
os.makedirs(TMP, exist_ok=True)


def run(name, probe, size='1180,900', shot=True, budget=3600):
    html = SRC.replace('</body>', '<script>' + probe + '</script></body>')
    p = os.path.join(TMP, name + '.html')
    io.open(p, 'w', encoding='utf-8', newline='').write(html)
    out = os.path.join(TMP, name + '.png')
    if os.path.exists(out):
        os.remove(out)
    args = [EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
            '--user-data-dir=' + os.path.join(TMP, 'ud'), '--hide-scrollbars',
            '--force-device-scale-factor=1', '--virtual-time-budget=%d' % budget,
            '--window-size=' + size]
    if shot:
        args.append('--screenshot=' + out)
    else:
        args.append('--dump-dom')
    args.append('file:///' + p.replace('\\', '/'))
    r = subprocess.run(args, capture_output=True)
    if not shot:
        m = re.search(r'<title>([^<]*)</title>', r.stdout.decode('utf-8', 'ignore'))
        print(name, '=>', m.group(1) if m else 'NO TITLE')
    else:
        print(name, '=>', 'ok' if os.path.exists(out) else 'FAIL', out)
    return out


FAKE = """
function fakeStu(){
  var g = (STATE.chars[0]||{}).g;
  return { name:'测试同学', groups:[g], types:['认读跟读'], count:6, status:'练习中' };
}
"""

# 1) 跟读页：量按钮尺寸与是否在首屏内
run('read', FAKE + """
window.addEventListener("load", function(){
  setTimeout(function(){
    STATE.cur = fakeStu();
    renderPlayHeader(); renderTypeTabs(); showScreen('play');
    startQuiz('认读跟读');
    setTimeout(function(){
      var b = document.getElementById('btnReadNext');
      var br = b.getBoundingClientRect();
      var t = document.querySelector('#stage .read-tip');
      var help = document.querySelector('.help-bar');
      var hr = help.getBoundingClientRect();
      document.title = 'R|btn=' + Math.round(br.width) + 'x' + Math.round(br.height) +
        '|top=' + Math.round(br.top) + '|bottom=' + Math.round(br.bottom) +
        '|vw=' + document.documentElement.clientWidth +
        '|vh=' + document.documentElement.clientHeight +
        '|helpTop=' + Math.round(hr.top) +
        '|tip=' + (t ? t.textContent : 'NONE') +
        '|btnRightHidden=' + document.getElementById('btnRight').hidden +
        '|feedback=' + !!document.querySelector('#stage .feedback');
    }, 600);
  }, 260);
});
""", shot=False)

run('read_shot', FAKE + """
window.addEventListener("load", function(){
  setTimeout(function(){
    STATE.cur = fakeStu();
    renderPlayHeader(); renderTypeTabs(); showScreen('play');
    startQuiz('认读跟读');
  }, 260);
});
""")

# 2) 跟读答过之后：大按钮应收起，反馈条出现
run('read_after', FAKE + """
window.addEventListener("load", function(){
  setTimeout(function(){
    STATE.cur = fakeStu();
    renderPlayHeader(); renderTypeTabs(); showScreen('play');
    startQuiz('认读跟读');
    setTimeout(function(){
      document.getElementById('btnReadNext').click();
      setTimeout(function(){
        var ra = document.getElementById('readActions');
        document.title = 'A|raHidden=' + (ra ? ra.hidden : 'gone') +
          '|feedback=' + !!document.querySelector('#stage .feedback') +
          '|btnGo=' + !!document.getElementById('btnGo');
      }, 300);
    }, 700);
  }, 260);
});
""", shot=False)

# 3) 鱼：暂停动画到指定帧，分别截图
FISH = """
window.addEventListener("load", function(){
  setTimeout(function(){
    var i, t = null;
    for (i = 0; i < STATE.chars.length; i++){ if (STATE.chars[i].w === '手') t = STATE.chars[i]; }
    startGame('fish', [t || STATE.chars[0]]);
    setTimeout(function(){
      var f = document.querySelector('#gameField .fish');
      var tail = f.querySelector('.fish-tail');
      var anims = f.getAnimations({subtree:true});
      var info = anims.map(function(a){
        return (a.animationName || '?');
      }).join(',');
      /* 冻结在指定时刻 */
      var T = Number(window.__T || 0);
      anims.forEach(function(a){ a.pause(); a.currentTime = T; });
      var tr = getComputedStyle(tail).transform;
      document.title = 'F|anims=' + info + '|tailTr=' + tr +
        '|at=' + T;
    }, 800);
  }, 260);
});
"""

for tag, t in (('a', '0'), ('b', '430')):
    run('fish_' + tag, 'window.__T=' + t + ';' + FISH, shot=False, budget=3600)
    # 暂停后再截一张
    run('fish_shot_' + tag, 'window.__T=' + t + ';' + FISH, budget=3600)
