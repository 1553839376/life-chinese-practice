# -*- coding: utf-8 -*-
"""探针：答对摘果子后，树冠 <g> 是否真的在动（验证 SVG 上的 CSS transform 生效）"""
import io, os, re, subprocess, tempfile

os.chdir(os.path.dirname(os.path.abspath(__file__)))
SRC = io.open('生活语文练习台.html', encoding='utf-8').read()
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
TMP = os.path.join(tempfile.gettempdir(), 'wb_crown_probe')
os.makedirs(TMP, exist_ok=True)

PROBE = """
window.addEventListener("load", function(){
  setTimeout(function(){
    var i, t = null;
    for (i = 0; i < STATE.chars.length; i++){ if (STATE.chars[i].w === '手') t = STATE.chars[i]; }
    startGame('fruit', [t || STATE.chars[0]]);
    setTimeout(function(){
      var out = [];
      var g = document.getElementById('treeCrown');
      out.push('exists=' + !!g);
      if (g){
        out.push('tag=' + g.tagName);
        out.push('csstransformbox=' + getComputedStyle(g).transformBox);
        var btn = null, bs = document.querySelectorAll('#gameField .g-item');
        for (i = 0; i < bs.length; i++){ if (bs[i].getAttribute('data-w') === '手') btn = bs[i]; }
        out.push('btn=' + (btn ? btn.getAttribute('data-w') : 'none'));
        if (btn) btn.click();
        setTimeout(function(){
          out.push('cls=' + g.getAttribute('class'));
          var b1 = g.getBoundingClientRect();
          setTimeout(function(){
            var b2 = g.getBoundingClientRect();
            out.push('dx=' + (b2.left - b1.left).toFixed(2));
            out.push('move=' + (Math.abs(b2.left - b1.left) > 0.3));
            document.title = 'PROBE|' + out.join('|');
          }, 130);
        }, 60);
      } else {
        document.title = 'PROBE|' + out.join('|');
      }
    }, 400);
  }, 260);
});
"""

js = '<script>\n' + PROBE + '\n</script>\n'
html = SRC.replace('</body>', js + '</body>')
p = os.path.join(TMP, 'probe.html')
io.open(p, 'w', encoding='utf-8', newline='').write(html)

r = subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
                    '--user-data-dir=' + os.path.join(TMP, 'ud'), '--hide-scrollbars',
                    '--virtual-time-budget=4000', '--window-size=1180,900',
                    '--dump-dom', 'file:///' + p.replace('\\', '/')],
                   capture_output=True)
dom = r.stdout.decode('utf-8', 'ignore')
m = re.search(r'<title>([^<]*)</title>', dom)
print(m.group(1) if m else 'NO TITLE FOUND')
