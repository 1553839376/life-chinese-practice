# -*- coding: utf-8 -*-
"""v37 探针：册次两级（年级 → 册次），真浏览器点一遍 + 出预览图。"""
import io, os, re, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
HTML = os.path.join(HERE, '生活语文练习台.html')

src = io.open(HTML, encoding='utf-8').read()

STATE_JS = u"""
<script>
window.addEventListener('load', function(){ setTimeout(function(){
  var res = [], d = document, $ = function(id){ return d.getElementById(id); };
  var tx = function(n){ return n ? n.textContent.replace(/\\s+/g, '') : 'null'; };
  try { showScreen('learn'); learnMode('read'); } catch(e){ res.push('boot=' + e.message); }

  res.push('grades=' + Array.prototype.slice.call(d.querySelectorAll('#gradeStrip .grade-chip'))
    .map(function(b){ return tx(b); }).join('/'));
  res.push('gradeH=' + Math.round($('gradeStrip').getBoundingClientRect().height));
  res.push('gradeOverflow=' + ($('gradeStrip').scrollWidth > $('gradeStrip').clientWidth + 1));
  res.push('stageHiddenAtStart=' + $('stageStrip').hidden);
  res.push('cardsAtStart=' + d.querySelectorAll('#charGrid .ch-card').length);

  d.querySelector('#gradeStrip [data-grade="六"]').click();
  res.push('gradeOn=' + tx(d.querySelector('#gradeStrip .grade-chip.on')));
  res.push('stageHidden=' + $('stageStrip').hidden);
  res.push('stages=' + Array.prototype.slice.call(d.querySelectorAll('#stageStrip .stage-chip'))
    .map(function(b){ return tx(b); }).join('/'));
  res.push('cardsG6=' + d.querySelectorAll('#charGrid .ch-card').length);
  res.push('stageOverflow=' + ($('stageStrip').scrollWidth > $('stageStrip').clientWidth + 1));
  res.push('stageW=' + Math.round($('stageStrip').scrollWidth) + '/' + Math.round($('stageStrip').clientWidth));
  res.push('grpHeads=' + Array.prototype.slice.call(d.querySelectorAll('#charGrid .grp-h'))
    .map(function(n){ return n.textContent.trim(); }).join('/'));
  res.push('countG6=' + tx($('learnCount')));

  d.querySelector('#stageStrip [data-g="六年级上册-写"]').click();
  res.push('stageOn=' + tx(d.querySelector('#stageStrip .stage-chip.on')));
  res.push('cardsG6a=' + d.querySelectorAll('#charGrid .ch-card').length);

  d.querySelector('#gradeStrip [data-grade=""]').click();
  res.push('backAllCards=' + d.querySelectorAll('#charGrid .ch-card').length);
  res.push('backStageHidden=' + $('stageStrip').hidden);

  d.querySelector('#gradeStrip [data-grade="一"]').click();
  res.push('cardsG1=' + d.querySelectorAll('#charGrid .ch-card').length);
  res.push('stagesG1=' + Array.prototype.slice.call(d.querySelectorAll('#stageStrip .stage-chip'))
    .map(function(b){ return tx(b); }).join('/'));

  var inp = $('learnSearch');
  inp.value = '日';
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  setTimeout(function(){
    res.push('searchHidden=' + $('stageStrip').hidden);
    res.push('searchOn=' + tx(d.querySelector('#gradeStrip .grade-chip.on')));
    res.push('searchCards=' + d.querySelectorAll('#charGrid .ch-card').length);
    res.push('searchCount=' + tx($('learnCount')));
    d.title = res.join('  ');
  }, 500);
}, 1500); });
</script>
"""

SHOT_JS = u"""
<script>
window.addEventListener('load', function(){ setTimeout(function(){
  try { showScreen('learn'); learnMode('read'); } catch(e){}
}, 1100); });
</script>
"""

SHOT_G6_JS = u"""
<script>
window.addEventListener('load', function(){ setTimeout(function(){
  try {
    showScreen('learn'); learnMode('read');
    document.querySelector('#gradeStrip [data-grade="六"]').click();
  } catch(e){}
}, 1100); });
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


t = build('_v37_state.html', STATE_JS)
print('STATE:', dump(t))

t_all = build('_v37_all.html', SHOT_JS)
t_g6 = build('_v37_g6.html', SHOT_G6_JS)
print(shot(t_all, '预览-v37-全部.png', 1080, 860))
print(shot(t_g6, '预览-v37-六年级.png', 1080, 860))

for src_name, png in [('_v37_all.html', '预览-v37-全部-390.png'),
                      ('_v37_g6.html', '预览-v37-六年级-390.png')]:
    wrap = os.path.join(HERE, '_v37_frame390.html')
    io.open(wrap, 'w', encoding='utf-8', newline='').write(
        u'<!DOCTYPE html><html><head><meta charset="utf-8">'
        u'<style>html,body{margin:0;background:#fff}iframe{width:390px;height:840px;border:0;display:block}'
        u'</style></head><body><iframe src="' + src_name + u'"></iframe></body></html>')
    print(shot(wrap, png, 500, 860))

# ④ 390 宽下的溢出实测：headless 直接开 390 会被钳到 500，只能套 iframe 读里面
PROBE390 = u"""
<!DOCTYPE html><html><head><meta charset="utf-8"><title>pending</title>
<style>html,body{margin:0}iframe{width:390px;height:840px;border:0;display:block}</style>
</head><body><iframe id="f" src="_v37_g6.html"></iframe>
<script>
setTimeout(function(){
  try {
    var d = document.getElementById('f').contentDocument;
    var g = d.getElementById('gradeStrip'), s = d.getElementById('stageStrip');
    document.title = 'w=' + d.documentElement.clientWidth +
      ' gradeOverflow=' + (g.scrollWidth > g.clientWidth + 1) +
      ' stageOverflow=' + (s.scrollWidth > s.clientWidth + 1) +
      ' stageW=' + Math.round(s.scrollWidth) + '/' + Math.round(s.clientWidth) +
      ' gradeChipH=' + Math.round(d.querySelector('#gradeStrip .grade-chip').getBoundingClientRect().height) +
      ' stageChipH=' + Math.round(d.querySelector('#stageStrip .stage-chip').getBoundingClientRect().height);
  } catch(e){ document.title = 'ERR ' + e.message; }
}, 2600);
</script></body></html>
"""
p390 = os.path.join(HERE, '_v37_probe390.html')
io.open(p390, 'w', encoding='utf-8', newline='').write(PROBE390)
out = subprocess.run([CHROME, '--headless=new', '--no-sandbox', '--disable-gpu',
                      '--allow-file-access-from-files', '--virtual-time-budget=9000',
                      '--window-size=520,900', '--dump-dom', 'file://' + p390],
                     capture_output=True, text=True).stdout
m = re.search(r'<title>(.*?)</title>', out, re.S)
print('390:', m.group(1).strip() if m else 'NO TITLE')
