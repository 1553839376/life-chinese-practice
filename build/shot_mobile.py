"""窄屏（老师用平板/手机查看时）核对：名单 / 档案 / 进度。"""
import io, os, subprocess, tempfile

BUILD = os.path.dirname(os.path.abspath(__file__))
SRC = io.open(os.path.join(BUILD, '生活语文练习台.html'), encoding='utf-8').read()
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
OUT = os.path.join(tempfile.gettempdir(), 'wb_prof_m')
os.makedirs(OUT, exist_ok=True)

BASE = io.open(os.path.join(BUILD, 'shot_prof.py'), encoding='utf-8').read()
seed = BASE.split('BASE = u"""')[1].split('"""')[0]

SC = {
    'm-a-名单': 'openTeacher(); TEA_TAB = "stu"; renderTeacher();',
    'm-b-档案': 'openTeacher(); TEA_TAB = "stu"; renderTeacher(); setTimeout(function(){ openStuProfile("小明"); }, 200);',
    'm-c-进度': 'openTeacher(); TEA_TAB = "prog"; renderTeacher();',
}
for name, body in SC.items():
    probe = ('window.addEventListener("load", function(){ setTimeout(function(){' + seed +
             '\nwindow.__seed();\n' + body +
             '\nsetTimeout(function(){var b=document.body;var e=document.createElement("div");' +
             'e.style.cssText="position:fixed;left:0;bottom:0;z-index:99999;background:#000;color:#fff;font-size:12px;padding:3px 6px";' +
             'e.textContent="client="+document.documentElement.clientWidth+" scroll="+document.documentElement.scrollWidth;' +
             'b.appendChild(e);},1200);' +
             '\n}, 320); });')
    html = SRC.replace('</body>', '<script>' + probe + '</script></body>')
    p = os.path.join(OUT, name + '.html')
    io.open(p, 'w', encoding='utf-8', newline='').write(html)
    out = os.path.join(OUT, name + '.png')
    if os.path.exists(out):
        os.remove(out)
    subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
                    '--user-data-dir=' + os.path.join(OUT, 'ud'),
                    '--hide-scrollbars', '--force-device-scale-factor=1',
                    '--virtual-time-budget=5000', '--window-size=560,2600',
                    '--screenshot=' + out, 'file:///' + p.replace('\\', '/')],
                   capture_output=True)
    print(name, os.path.exists(out), out)
