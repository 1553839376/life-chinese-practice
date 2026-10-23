"""拼词语截图（T-008 / v14）：空态、拼对两个词、窄屏、老师端勾题型。"""
import io, os, subprocess, tempfile

BUILD = os.path.dirname(os.path.abspath(__file__))
SRC = io.open(os.path.join(BUILD, '生活语文练习台.html'), encoding='utf-8').read()
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
OUT = os.path.join(tempfile.gettempdir(), 'wb_word')
os.makedirs(OUT, exist_ok=True)

BASE = u"""
window.__seed = function(){
  var cs = STATE.chars.filter(function(c){ return c.on && c.w; });
  function ids(list){
    var out = [];
    for (var i = 0; i < list.length; i++) out.push(list[i]);
    return out;
  }
  /* 用「大人 / 太阳 / 木头」这 6 个字，正好拼出 3 个词 */
  var want = ['大', '人', '太', '阳', '木', '头'];
  var have = want.filter(function(ch){
    return cs.some(function(c){ return c.w === ch; });
  });
  STATE.students = [
    { id:'local_a', name:'小明', types:['拼词语'], chars: have,
      groups:[], count:8, status:'在读', photo:'', edited: Date.now() },
    { id:'local_b', name:'小红', types:['听音找字','拼词语'], chars: cs.slice(0, 20).map(function(c){ return c.w; }),
      groups:[], count:8, status:'在读', photo:'', edited: Date.now() }
  ];
  saveSnap();
};
window.__enter = function(name){
  enterStudent(name || '小明');
};
window.__pickPair = function(word){
  var q = curQ();
  if (!q) return null;
  function idxOf(ch){
    for (var i = 0; i < q.tiles.length; i++){
      if (q.tiles[i] === ch) return i;
    }
    return -1;
  }
  var a = idxOf(word.charAt(0)), b = idxOf(word.charAt(1));
  wbPick(a); wbPick(b);
  return a + ',' + b;
};
"""

A = BASE + u"""
window.addEventListener("load", function(){
  setTimeout(function(){ window.__seed(); window.__enter(); }, 320);
});
"""
B = BASE + u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    window.__seed(); window.__enter();
    setTimeout(function(){
      var q = curQ();
      window.__pickPair(q.words[0].w);
      setTimeout(function(){ window.__pickPair(q.words[1].w); }, 500);
    }, 300);
  }, 320);
});
"""
C = BASE + u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    window.__seed(); window.__enter();
    setTimeout(function(){
      var q = curQ();
      window.__pickPair(q.words[0].w);
    }, 300);
  }, 320);
});
"""
D = BASE + u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    window.__seed(); openTeacher(); TEA_TAB = 'stu'; renderTeacher();
    setTimeout(function(){
      var tr = document.querySelectorAll('#stuTbody tr')[1];
      if (tr) tr.querySelector('[data-edit]').click();
      setTimeout(function(){
        var h = document.getElementById('fStuTypes');
        h.scrollIntoView({ block: 'center' });
      }, 300);
    }, 250);
  }, 320);
});
"""

SHOTS = [
    ('word-a-空态', A, '1180,1000'),
    ('word-b-拼对两个', B, '1180,1000'),
    ('word-c-窄屏', C, '560,1100'),
    ('word-d-老师勾题型', D, '1180,1200'),
]
for name, probe, size in SHOTS:
    html = SRC.replace('</body>', '<script>' + probe + '</script></body>')
    p = os.path.join(OUT, name + '.html')
    io.open(p, 'w', encoding='utf-8', newline='').write(html)
    out = os.path.join(OUT, name + '.png')
    if os.path.exists(out):
        os.remove(out)
    subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
                    '--user-data-dir=' + os.path.join(OUT, 'ud'),
                    '--hide-scrollbars', '--force-device-scale-factor=1',
                    '--virtual-time-budget=6000', '--window-size=' + size,
                    '--screenshot=' + out, 'file:///' + p.replace('\\', '/')],
                   capture_output=True)
    print(name, os.path.exists(out), out)
