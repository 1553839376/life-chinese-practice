"""字库/词库按钮可用性排查：点「新增汉字」之后到底发生了什么（视口内可见？需要滚动？）"""
import io, os, subprocess, tempfile

BUILD = os.path.dirname(os.path.abspath(__file__))
SRC = io.open(os.path.join(BUILD, '生活语文练习台.html'), encoding='utf-8').read()
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
OUT = os.path.join(tempfile.gettempdir(), 'wb_lib')
os.makedirs(OUT, exist_ok=True)

HUD = u"""
window.__hud = function(lines){
  var e = document.createElement('div');
  e.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#111;color:#0f0;' +
    'font:13px/1.5 monospace;padding:8px 10px;white-space:pre;max-width:100%';
  e.textContent = lines.join('\\n');
  document.body.appendChild(e);
};
"""

# A：进字库，量「不点之前」表单与按钮的位置
A = HUD + u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    openTeacher(); TEA_TAB = 'lib'; renderTeacher();
    setTimeout(function(){
      var b = document.getElementById('btnLibNew');
      var f = document.getElementById('libForm');
      var t = document.getElementById('libTbody');
      var w = document.querySelector('#tpLib .list-wrap');
      window.__hud([
        '视口 ' + innerWidth + 'x' + innerHeight,
        '按钮 btnLibNew rect.top=' + Math.round(b.getBoundingClientRect().top),
        '表格 list-wrap 高=' + Math.round(w.getBoundingClientRect().height) + ' scrollH=' + w.scrollHeight,
        '字条数=' + STATE.chars.length + '  tbody 行=' + t.children.length,
        '表单 libForm hidden=' + f.hidden + ' top=' + Math.round(f.getBoundingClientRect().top),
        '文档 scrollHeight=' + document.documentElement.scrollHeight
      ]);
    }, 500);
  }, 350);
});
"""

# B：点了「新增汉字」之后
B = HUD + u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    openTeacher(); TEA_TAB = 'lib'; renderTeacher();
    setTimeout(function(){
      var b = document.getElementById('btnLibNew');
      var f = document.getElementById('libForm');
      b.click();
      setTimeout(function(){
        var r = f.getBoundingClientRect();
        var inp = document.getElementById('fLibWord');
        window.__hud([
          '点了「新增汉字」之后',
          'libForm hidden=' + f.hidden,
          '表单 rect.top=' + Math.round(r.top) + ' bottom=' + Math.round(r.bottom) + ' 高=' + Math.round(r.height),
          '在视口内？' + (r.top < innerHeight && r.bottom > 0 ? '部分可见' : '完全看不见'),
          'scrollY=' + Math.round(scrollY) + '  文档高=' + document.documentElement.scrollHeight,
          '输入框聚焦=' + (document.activeElement === inp),
          '表单离按钮 ' + Math.round(r.top - b.getBoundingClientRect().bottom) + ' px'
        ]);
      }, 300);
    }, 500);
  }, 350);
});
"""


STU = HUD + u"""
window.addEventListener("load", function(){
  setTimeout(function(){
    openTeacher(); TEA_TAB = 'stu'; renderTeacher();
    setTimeout(function(){
      document.getElementById('btnStuNew').click();
      setTimeout(function(){
        var f = document.getElementById('stuForm');
        var r = f.getBoundingClientRect();
        window.__hud(['点「新增学生」之后', '表单 top=' + Math.round(r.top) + ' bottom=' + Math.round(r.bottom),
          '可见？' + (r.top < innerHeight && r.bottom > 0 ? '是' : '否'), '姓名框聚焦=' + (document.activeElement === document.getElementById('fStuName'))]);
      }, 400);
    }, 500);
  }, 350);
});
"""

SHOTS = [('lib-a-点前', A), ('lib-b-点后', B), ('lib-c-学生表单', STU)]
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
                    '--virtual-time-budget=6000', '--window-size=1180,900',
                    '--screenshot=' + out, 'file:///' + p.replace('\\', '/')],
                   capture_output=True)
    print(name, os.path.exists(out), out)
