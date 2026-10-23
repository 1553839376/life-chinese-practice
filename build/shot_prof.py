"""学生档案截图（T-006 / v12）：名单进度条、档案逐字、抽练练习页。"""
import io, os, subprocess, tempfile

BUILD = os.path.dirname(os.path.abspath(__file__))
SRC = io.open(os.path.join(BUILD, '生活语文练习台.html'), encoding='utf-8').read()
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
OUT = os.path.join(tempfile.gettempdir(), 'wb_prof2')
os.makedirs(OUT, exist_ok=True)

BASE = u"""
window.__seed = function(){
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
  for (i = 0; i < 3; i++) put('小红', B[i], 4, 0, 0, 9 + i);
  for (i = 3; i < 6; i++) put('小红', B[i], 1, 2, 3, 1);
  /* 共同难点：两人都错同一个字 */
  put('小红', A[14], 0, 3, 0, 2);
  saveSnap();
};
"""

A = BASE + u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    window.__seed(); openTeacher(); TEA_TAB = 'stu'; renderTeacher();
  }, 320);
});
"""
B = BASE + u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    window.__seed(); openTeacher(); TEA_TAB = 'stu'; renderTeacher();
    setTimeout(function(){
      openStuProfile('小明');
      setTimeout(function(){
        var g = document.querySelectorAll('#profGrid .pgc');
        if (g[14]) g[14].click();     /* 点一个需巩固的字，看详情 */
      }, 200);
    }, 200);
  }, 320);
});
"""
C = BASE + u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    window.__seed(); openTeacher();
    var s = STATE.students[0];
    drillStudent('小明', stuProfile(s).focus.slice(0, 5));
  }, 320);
});
"""

SHOTS = [('prof-a-名单', A), ('prof-b-档案', B), ('prof-c-抽练', C)]
for name, probe in SHOTS:
    html = SRC.replace('</body>', '<script>' + probe + '</script></body>')
    p = os.path.join(OUT, name + '.html')
    io.open(p, 'w', encoding='utf-8', newline='').write(html)
    out = os.path.join(OUT, name + '.png')
    if os.path.exists(out):
        os.remove(out)
    subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
                    '--user-data-dir=' + os.path.join(OUT, 'ud'),
                    '--hide-scrollbars', '--force-device-scale-factor=1',
                    '--virtual-time-budget=5200', '--window-size=1180,1400',
                    '--screenshot=' + out, 'file:///' + p.replace('\\', '/')],
                   capture_output=True)
    print(name, os.path.exists(out), out)
