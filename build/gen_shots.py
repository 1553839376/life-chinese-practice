# -*- coding: utf-8 -*-
"""生成若干静态快照页，用 Edge headless 截图检查真实排版"""
import io, os, subprocess, sys, shutil, tempfile

os.chdir(os.path.dirname(os.path.abspath(__file__)))
SRC = io.open('生活语文练习台.html', encoding='utf-8').read()
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
TMP = tempfile.gettempdir() + '\\edge_wb_shot'
os.makedirs(TMP, exist_ok=True)

ACTS = {
    'learn': "",
    'pick': "showScreen('pick');",
    'teacher': "openTeacher();",
    'lib': "openTeacher(); TEA_TAB='lib'; renderTeacher();",
    'play': """
    STATE.students=[{id:'s1',name:'小明',on:true,types:['找一样的字'],count:6,groups:['一年级上册'],photoLocal:''}];
    renderPick(); enterStudent('小明');
    """,
    'av': """
    STATE.students=[{id:'s1',name:'小明',on:true,types:['找一样的字'],count:6,groups:['一年级上册'],photoLocal:''}];
    renderPick(); enterStudent('小明'); setTimeout(openAV,400);
    """,
    'bubble': """
    var t=null,i; for(i=0;i<STATE.chars.length;i++){ if(STATE.chars[i].w==='手') t=STATE.chars[i]; }
    startGame('bubble',[t||STATE.chars[0]]);
    """,
    'card': """
    LEARN.stage='一年级上册'; renderLearn();
    var t=null,i; for(i=0;i<STATE.chars.length;i++){ if(STATE.chars[i].w==='手') t=STATE.chars[i]; }
    openCard(t||LEARN.list[0]);
    """,
    'card2': """
    LEARN.stage='一年级上册'; renderLearn();
    var t=null,i; for(i=0;i<STATE.chars.length;i++){
      if(STATE.chars[i].w==='二' && !artOf(STATE.chars[i])) t=STATE.chars[i];
    }
    openCard(t||LEARN.list[0]);
    """,
    'bubble': """
    LEARN.stage='一年级上册'; renderLearn();
    var t=null,i; for(i=0;i<STATE.chars.length;i++){ if(STATE.chars[i].w==='手') t=STATE.chars[i]; }
    startGame('bubble',[t]);
    """,
    'fish': """
    LEARN.stage='一年级上册'; renderLearn();
    var t=null,i; for(i=0;i<STATE.chars.length;i++){ if(STATE.chars[i].w==='手') t=STATE.chars[i]; }
    startGame('fish',[t]);
    """,
    'fruit': """
    LEARN.stage='一年级上册'; renderLearn();
    var t=null,i; for(i=0;i<STATE.chars.length;i++){ if(STATE.chars[i].w==='手') t=STATE.chars[i]; }
    startGame('fruit',[t]);
    """,
    'feed': """
    LEARN.stage='一年级上册'; renderLearn();
    var t=null,i; for(i=0;i<STATE.chars.length;i++){ if(STATE.chars[i].w==='手') t=STATE.chars[i]; }
    startGame('feed',[t]);
    """,
    'play': """
    STATE.students=[{id:'s1',name:'小明',on:true,types:['找一样的字'],count:6,groups:['一年级上册'],photoLocal:''}];
    renderPick(); enterStudent('小明');
    """,
    'av': """
    STATE.students=[{id:'s1',name:'小明',on:true,types:['找一样的字'],count:6,groups:['一年级上册'],photoLocal:''}];
    renderPick(); enterStudent('小明'); setTimeout(openAV,500);
    """,
    'score': """
    LEARN.stage='一年级上册'; renderLearn();
    var t=null,i; for(i=0;i<STATE.chars.length;i++){ if(STATE.chars[i].w==='手') t=STATE.chars[i]; }
    startGame('bubble',[t]);
    var ok=setInterval(function(){
      if(!GAME.queue.length){ clearInterval(ok); return; }
      var q=GAME.queue[GAME.i]; if(!q) return;
      var all=document.querySelectorAll('#gameField .g-item'), k;
      for(k=0;k<all.length;k++){ if(all[k].getAttribute('data-w')===q.w){ all[k].click(); break; } }
    }, 200);
    """,
}

only = sys.argv[1:] if len(sys.argv) > 1 else list(ACTS.keys())
BUDGET = {'score': 7000}
for name in only:
    act = ACTS[name]
    page = SRC.replace('</body>', '<script>\nwindow.addEventListener("load",function(){setTimeout(function(){\n'
                       + act + '\n},260);});\n</script>\n</body>')
    f = '_shot_%s.html' % name
    io.open(f, 'w', encoding='utf-8').write(page)
    raw = os.path.join(TMP, name + '.png')
    if os.path.exists(raw):
        os.remove(raw)
    cmd = [EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
           '--user-data-dir=' + os.path.join(TMP, 'ud'),
           '--hide-scrollbars',
           '--window-size=1024,768', '--force-device-scale-factor=1',
           '--virtual-time-budget=%d' % BUDGET.get(name, 4200), '--screenshot=' + raw,
           'file:///' + os.path.abspath(f).replace('\\', '/')]
    subprocess.run(cmd, capture_output=True)
    out = '_shot_%s.png' % name
    if os.path.exists(raw):
        shutil.copyfile(raw, out)
        print(name, '->', out, os.path.getsize(out))
    else:
        print(name, 'FAILED')
