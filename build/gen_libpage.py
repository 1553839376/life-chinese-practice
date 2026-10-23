# -*- coding: utf-8 -*-
"""生成「字库核对.html」：按册次列出 700 条生字，便于逐条核对导入结果"""
import io, json, os
from collections import OrderedDict

os.chdir(os.path.dirname(os.path.abspath(__file__)))

recs = json.load(io.open('_verify_lib.json', encoding='utf-8'))
art = json.load(io.open('art_pack1.json', encoding='utf-8'))

groups = OrderedDict()
for r in recs:
    groups.setdefault(r['分组'], []).append(r)

uniq = []
cnt = {}
for r in recs:
    w = r['字词']
    cnt[w] = cnt.get(w, 0) + 1
    if w not in uniq:
        uniq.append(w)
have = [c for c in uniq if c in art]

H = []
H.append('''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>字库核对 · 生活语文生字</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#F6F3EC;color:#2E2A24;font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;line-height:1.5}
.wrap{max-width:1180px;margin:0 auto;padding:26px 20px 60px}
h1{font-size:24px;margin:0 0 6px}
.sub{margin:0 0 16px;color:#7A7266;font-size:13px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}
.chip{background:#fff;border:1px solid #E4DED1;border-radius:999px;padding:5px 12px;font-size:13px;color:#5A5248}
.chip b{color:#185FA5;font-size:15px;margin:0 2px}
.bar{display:flex;gap:10px;align-items:center;margin-bottom:22px;flex-wrap:wrap}
input[type=search]{flex:1;min-width:220px;padding:9px 12px;border:1px solid #DCD5C6;border-radius:10px;font-size:14px;background:#fff}
input[type=search]:focus{outline:2px solid #BCD8F0;border-color:#8FBDE6}
button{padding:9px 14px;border:1px solid #DCD5C6;background:#fff;border-radius:10px;font-size:13px;color:#4C4438;cursor:pointer}
button:hover{background:#FBF8F1}
h2{font-size:16px;margin:26px 0 10px;padding-bottom:6px;border-bottom:1px solid #E7E1D4;display:flex;gap:10px;align-items:baseline}
h2 em{font-style:normal;font-size:12px;color:#8A8172;font-weight:400}
.cells{display:grid;grid-template-columns:repeat(auto-fill,minmax(178px,1fr));gap:9px}
.c{background:#fff;border:1px solid #E7E1D4;border-radius:10px;padding:9px 11px;position:relative}
.c .w{font-size:21px;font-weight:600;letter-spacing:1px}
.c .p{font-size:12px;color:#8A8172;margin-left:6px}
.c .g{font-size:12.5px;color:#4C4438;margin-top:3px;word-break:break-all}
.c .t{position:absolute;top:7px;right:8px;font-size:11px;color:#185FA5;background:#EAF3FB;border-radius:6px;padding:1px 5px}
.c .d{position:absolute;top:28px;right:8px;font-size:11px;color:#96502E;background:#FBEDE4;border-radius:6px;padding:1px 5px}
.hide{display:none}
</style></head><body><div class="wrap">''')

H.append('<h1>字库核对 · 生活语文生字</h1>')
H.append('<p class="sub">来源：你发来的《生活语文生字.xlsx》，已逐条写进页面内置字库；跨册重复的字按原表保留。</p>')
H.append('<div class="chips">'
         '<span class="chip">录入 <b>%d</b> 条</span>'
         '<span class="chip">唯一字 <b>%d</b> 个</span>'
         '<span class="chip">册次分组 <b>%d</b> 个</span>'
         '<span class="chip">有图示 <b>%d</b> 个（%d%%）</span>'
         '<span class="chip">走词语卡 <b>%d</b> 个</span>'
         '</div>' % (len(recs), len(uniq), len(groups), len(have),
                     round(len(have) * 100.0 / len(uniq)), len(uniq) - len(have)))

H.append('<div class="bar"><input type="search" id="q" placeholder="搜字 / 拼音 / 组词，例如 虎、hǔ、老虎">'
         '<button type="button" id="btnArt">只看有图的</button>'
         '<button type="button" id="btnWord">只看词语卡的</button>'
         '<button type="button" id="btnAll">显示全部</button></div>')

for g, items in groups.items():
    use = list(OrderedDict.fromkeys(x['字词'] for x in items))
    H.append('<h2 data-g="%s">%s<em>%d 条 · %d 个生字</em></h2>' % (g, g, len(items), len(use)))
    seen = set()
    cells = []
    for r in items:
        w = r['字词']
        if w in seen:
            continue
        seen.add(w)
        mark = ''
        if w in art:
            mark = '<span class="t">图</span>'
        if cnt[w] > 1:
            mark += '<span class="d">×%d</span>' % cnt[w]
        cells.append('<div class="c" data-w="%s" data-k="%s" data-a="%d">%s<div><span class="w">%s</span>'
                     '<span class="p">%s</span></div><div class="g">%s</div></div>'
                     % (w, (w + ' ' + r['拼音'] + ' ' + r['组词']).lower(), 1 if w in art else 0,
                        mark, w, r['拼音'], r['组词']))
    H.append('<div class="cells">' + ''.join(cells) + '</div>')

H.append('''</div><script>
var q=document.getElementById('q'),mode='all';
function apply(){
  var kw=(q.value||'').trim().toLowerCase();
  var cells=document.querySelectorAll('.c'),hs=document.querySelectorAll('h2');
  for(var i=0;i<cells.length;i++){
    var c=cells[i],k=c.getAttribute('data-k'),a=c.getAttribute('data-a')==='1';
    var okk=!kw||k.indexOf(kw)>=0;
    var okm=(mode==='all')||(mode==='art'&&a)||(mode==='word'&&!a);
    c.className='c'+((okk&&okm)?'':' hide');
  }
  for(var j=0;j<hs.length;j++){
    var h=hs[j],n=h.nextElementSibling,vis=n.querySelectorAll('.c:not(.hide)').length;
    h.className=(vis?'':'hide');
  }
}
q.addEventListener('input',apply);
document.getElementById('btnArt').onclick=function(){mode='art';apply();};
document.getElementById('btnWord').onclick=function(){mode='word';apply();};
document.getElementById('btnAll').onclick=function(){mode='all';apply();};
</script></body></html>''')

out = '字库核对.html'
io.open(out, 'w', encoding='utf-8').write(''.join(H))
print('%s  %d KB' % (out, os.path.getsize(out) // 1024))
