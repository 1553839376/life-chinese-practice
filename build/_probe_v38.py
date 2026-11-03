# -*- coding: utf-8 -*-
"""v38 探针：听写「看一眼」按钮（四按钮 + 3 秒自动合上）+ 390 窄屏排列。"""
import io, os, re, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
HTML = os.path.join(HERE, '生活语文练习台.html')

src = io.open(HTML, encoding='utf-8').read()

# 造一个学生、进听写。字表取内置字库里现成的字，避免「字表空 → 静默不出题」。
BOOT = u"""
(function(){
  var names = ['小','手','大','人','山'];
  var arr = names.filter(function(w){
    return STATE.chars.some(function(c){ return c.w === w && c.on !== false; });
  });
  var stu = { name: '探针生', chars: arr, groups: [], count: 5, status: '在读',
              photo: '', types: ['汉字听写'] };
  STATE.students.push(stu);
  STATE.cur = stu;
  try { showScreen('play'); } catch(e){}
  startQuiz('汉字听写');
})();
"""

STATE_JS = u"""
<script>
window.addEventListener('load', function(){ setTimeout(function(){
  var res = [], d = document, $ = function(id){ return d.getElementById(id); };
  var tx = function(n){ return n ? n.textContent.replace(/\\s+/g, '') : 'null'; };
  try { %s } catch(e){ res.push('boot=' + e.message); }

  res.push('acts=' + Array.prototype.slice.call(d.querySelectorAll('#stage .hw-acts .hw-btn'))
    .map(function(b){ return tx(b) + (b.disabled ? '(禁用)' : ''); }).join('/'));
  res.push('actsClass=' + (d.querySelector('#stage .hw-acts') || {}).className);
  res.push('peekCount=' + d.querySelectorAll('#stage [data-wg-act="peek"]').length);

  var pb = d.querySelector('#stage [data-wg-act="peek"]');
  if (pb){
    pb.click();
    res.push('peekAns=' + tx(d.querySelector('#stage .wg-ans')));
    res.push('peekCls=' + d.querySelector('#stage .wg-box').className);
    res.push('peekLabel=' + tx(pb));
    setTimeout(function(){
      res.push('after1s=' + tx(d.querySelector('#stage [data-wg-act="peek"]')));
      setTimeout(function(){
        res.push('after3sAns=' + (tx(d.querySelector('#stage .wg-ans')) || '空'));
        res.push('after3sLabel=' + tx(d.querySelector('#stage [data-wg-act="peek"]')));
        res.push('after3sCls=' + d.querySelector('#stage .wg-box').className);
        d.title = res.join('  ');
      }, 2400);
    }, 1000);
  } else {
    d.title = res.join('  ');
  }
}, 1600); });
</script>
"""

SHOT_JS = u"""
<script>
window.addEventListener('load', function(){ setTimeout(function(){
  try { %s } catch(e){ document.title = 'ERR ' + e.message; }
}, 1300); });
</script>
"""

# 点开「看一眼」后截图（答案亮着、按钮倒数 3）。
# 截完不等倒计时自己跑完：Chrome 的 --virtual-time-budget 会把 3 秒一起推进，
# 拍到的就是「已经合上」的状态。点完立刻 PEEK.tok++ 把定时器作废，停在第一帧。
PEEK_JS = u"""
<script>
window.addEventListener('load', function(){ setTimeout(function(){
  try {
    %s
    setTimeout(function(){
      var pb = document.querySelector('#stage [data-wg-act="peek"]');
      if (pb){ pb.click(); PEEK.tok++; }
    }, 400);
  } catch(e){}
}, 1300); });
</script>
"""


def build(name, js):
    p = os.path.join(HERE, name)
    io.open(p, 'w', encoding='utf-8', newline='').write(src.replace('</body>', js + '</body>'))
    return p


def dump(tmp):
    out = subprocess.run([CHROME, '--headless=new', '--no-sandbox', '--disable-gpu',
                          '--virtual-time-budget=9000', '--window-size=1080,900',
                          '--dump-dom', 'file://' + tmp],
                         capture_output=True, text=True).stdout
    m = re.search(r'<title>(.*?)</title>', out, re.S)
    return m.group(1).strip() if m else 'NO TITLE'


def shot(tmp, name, w, h):
    png = os.path.join(HERE, name)
    subprocess.run([CHROME, '--headless=new', '--no-sandbox', '--disable-gpu',
                    '--hide-scrollbars', '--virtual-time-budget=8000',
                    '--window-size=%d,%d' % (w, h), '--screenshot=' + png,
                    'file://' + tmp], capture_output=True, text=True)
    return name, (os.path.getsize(png) // 1024) if os.path.exists(png) else 0


t = build('_v38_state.html', STATE_JS % BOOT)
print('STATE:', dump(t))

t_dict = build('_v38_dict.html', SHOT_JS % BOOT)
t_peek = build('_v38_peek.html', PEEK_JS % BOOT)
print(shot(t_dict, '预览-v38-听写.png', 1080, 900))
print(shot(t_peek, '预览-v38-看一眼.png', 1080, 900))

# 390 宽：headless 直接开 390 会被钳到 500，套 iframe 才看得到真实手机排版
for src_name, png in [('_v38_dict.html', '预览-v38-听写-390.png'),
                      ('_v38_peek.html', '预览-v38-看一眼-390.png')]:
    wrap = os.path.join(HERE, '_v38_frame390.html')
    io.open(wrap, 'w', encoding='utf-8', newline='').write(
        u'<!DOCTYPE html><html><head><meta charset="utf-8">'
        u'<style>html,body{margin:0;background:#fff}iframe{width:390px;height:840px;border:0;display:block}'
        u'</style></head><body><iframe src="' + src_name + u'"></iframe></body></html>')
    print(shot(wrap, png, 500, 860))

# 390 下四个按钮的落点：两列两行 → left 只有两档、top 只有两档
PROBE390 = u"""
<!DOCTYPE html><html><head><meta charset="utf-8"><title>pending</title>
<style>html,body{margin:0}iframe{width:390px;height:840px;border:0;display:block}</style>
</head><body><iframe id="f" src="_v38_dict.html"></iframe>
<script>
setTimeout(function(){
  try {
    var d = document.getElementById('f').contentDocument;
    var btns = Array.prototype.slice.call(d.querySelectorAll('#stage .hw-acts .hw-btn'));
    var rects = btns.map(function(b){
      var r = b.getBoundingClientRect();
      return Math.round(r.left) + ',' + Math.round(r.top) + ',' + Math.round(r.width) + 'x' + Math.round(r.height);
    });
    var rows = {}; var cols = {};
    btns.forEach(function(b){
      var r = b.getBoundingClientRect(); rows[Math.round(r.top)] = 1; cols[Math.round(r.left)] = 1;
    });
    var acts = d.querySelector('#stage .hw-acts');
    document.title = 'w=' + d.documentElement.clientWidth +
      ' rows=' + Object.keys(rows).length +
      ' cols=' + Object.keys(cols).length +
      ' overflow=' + (acts.scrollWidth > acts.clientWidth + 1) +
      ' rects=' + rects.join(' | ') +
      ' tipH=' + Math.round((d.querySelector('#stage .hw-tip')||{getBoundingClientRect:function(){return{height:0}}}).getBoundingClientRect().height);
  } catch(e){ document.title = 'ERR ' + e.message; }
}, 2800);
</script></body></html>
"""
p390 = os.path.join(HERE, '_v38_probe390.html')
io.open(p390, 'w', encoding='utf-8', newline='').write(PROBE390)
out = subprocess.run([CHROME, '--headless=new', '--no-sandbox', '--disable-gpu',
                      '--allow-file-access-from-files', '--virtual-time-budget=9000',
                      '--window-size=520,900', '--dump-dom', 'file://' + p390],
                     capture_output=True, text=True).stdout
m = re.search(r'<title>(.*?)</title>', out, re.S)
print('390:', m.group(1).strip() if m else 'NO TITLE')
