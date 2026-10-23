"""进度页截图（v12 前后对照）：造 3 个学生 + 一批学习记录。"""
import io, os, subprocess, sys, tempfile

BUILD = os.path.dirname(os.path.abspath(__file__))
SRC = io.open(os.path.join(BUILD, '生活语文练习台.html'), encoding='utf-8').read()
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
TAG = sys.argv[1] if len(sys.argv) > 1 else 'before'
OUT = os.path.join(tempfile.gettempdir(), 'wb_prog_' + TAG)
os.makedirs(OUT, exist_ok=True)

SETUP = u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    var cs = STATE.chars.filter(function(c){ return c.on && c.w; });
    function pick(a, b){ return cs.slice(a, b).map(function(c){ return c.w; }); }
    STATE.students = [
      { id:'local_a', name:'小明', types:['听音找字','认读跟读'], chars: pick(0, 20),
        groups:[], count:8, status:'在读', photo:'', edited: Date.now() - 86400000*12 },
      { id:'local_b', name:'小红', types:['听音找字'], chars: pick(20, 34),
        groups:[], count:8, status:'在读', photo:'', edited: Date.now() - 86400000*3 },
      { id:'local_c', name:'小刚', types:['图字配对'], chars: [],
        groups:[], count:8, status:'暂停', photo:'', edited: Date.now() - 86400000*30 }
    ];
    var now = Date.now();
    function put(stu, w, alone, wrong, prompts, daysAgo){
      STATE.logs[stu + '|' + w] = { id:'', key: stu + '|' + w, stu: stu, ch: w,
        n: alone + wrong, alone: alone, hinted: 0, wrong: wrong, prompts: prompts,
        last: new Date(now - 86400000*daysAgo).toISOString(), level:'', dirty:false };
    }
    var A = STATE.students[0].chars, B = STATE.students[1].chars, i;
    for (i = 0; i < 9; i++) put('小明', A[i], 4, 0, 0, 1 + i % 5);
    for (i = 9; i < 14; i++) put('小明', A[i], 1, 1, 2, 2 + i % 4);
    put('小明', A[14], 0, 4, 0, 3);
    put('小明', A[15], 0, 3, 1, 6);
    put('小明', A[0], 4, 0, 0, 0);
    for (i = 0; i < 3; i++) put('小红', B[i], 4, 0, 0, 9 + i);
    for (i = 3; i < 6; i++) put('小红', B[i], 1, 2, 3, 1);
    saveSnap();
    openTeacher(); TEA_TAB = 'prog'; renderTeacher();
  }, 320);
});
"""

html = SRC.replace('</body>', '<script>' + SETUP + '</script></body>')
p = os.path.join(OUT, 'prog.html')
io.open(p, 'w', encoding='utf-8', newline='').write(html)
out = os.path.join(OUT, 'prog-' + TAG + '.png')
if os.path.exists(out):
    os.remove(out)
subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
                '--user-data-dir=' + os.path.join(OUT, 'ud'),
                '--hide-scrollbars', '--force-device-scale-factor=1',
                '--virtual-time-budget=5200', '--window-size=1180,1500',
                '--screenshot=' + out, 'file:///' + p.replace('\\', '/')],
               capture_output=True)
print(os.path.exists(out), out)
