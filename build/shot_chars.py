"""学生字表界面截图（T-005 / v11）：空态、展开逐字剔除、搜索命中。"""
import io, os, subprocess, tempfile

BUILD = os.path.dirname(os.path.abspath(__file__))
SRC = io.open(os.path.join(BUILD, '生活语文练习台.html'), encoding='utf-8').read()
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
OUT = os.path.join(tempfile.gettempdir(), 'wb_chars')
os.makedirs(OUT, exist_ok=True)

SETUP = """
window.addEventListener("load", function(){
  setTimeout(function(){
    /* 造一个老式学生：只有组、没有字表，正好演示迁移 */
    STATE.students = [{ id:'local_demo', name:'小明', types:['听音找字','图字配对'],
      groups:['一年级上册'], count:8, status:'在读', photo:'' }];
    openTeacher();
    TEA_TAB = 'stu';
    renderTeacher();
  }, 260);
});
"""

# A 打开表单：空字表 + 折叠的分组
SHOT_A = """
window.addEventListener("load", function(){
  setTimeout(function(){
    STATE.students = [{ id:'local_demo', name:'小明', types:['听音找字','图字配对'],
      groups:[], chars:[], count:8, status:'在读', photo:'' }];
    openTeacher(); TEA_TAB = 'stu'; renderTeacher();
    setTimeout(function(){
      openStuForm('小明');
    }, 200);
  }, 260);
});
"""

# B 展开第一组，点掉两个字（从迁移出来的全选状态里剔除）
SHOT_B = SETUP + """
window.addEventListener("load", function(){
  setTimeout(function(){
    openStuForm('小明');
    var togs = document.querySelectorAll('#fStuCharList .char-g-tog');
    if (togs[0]) togs[0].click();
    setTimeout(function(){
      var chips = document.querySelectorAll('#fStuCharList .char-chip');
      if (chips[2]) chips[2].click();          /* 点掉「人」 */
      setTimeout(function(){
        var cs = document.querySelectorAll('#fStuCharList .char-chip');
        if (cs[5]) cs[5].click();              /* 点掉「女」 */
      }, 90);
    }, 130);
  }, 700);
});
"""

# C 搜索跨组命中
SHOT_C = SETUP + """
window.addEventListener("load", function(){
  setTimeout(function(){
    openStuForm('小明');
    var sq = document.getElementById('fStuCharSearch');
    sq.value = '男';
    sq.dispatchEvent(new Event('input', {bubbles:true}));
  }, 700);
});
"""

SHOTS = [('chars-a-空态', SHOT_A), ('chars-b-展开剔除', SHOT_B), ('chars-c-搜索', SHOT_C)]

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
                    '--virtual-time-budget=4200', '--window-size=1180,1260',
                    '--screenshot=' + out, 'file:///' + p.replace('\\', '/')],
                   capture_output=True)
    print(name, os.path.exists(out), out)
