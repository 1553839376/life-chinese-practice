# -*- coding: utf-8 -*-
"""在真浏览器里量首载：Edge headless + performance.timing

用法：
    python perf_probe.py                 # 测当前产物（语音包＝惰性 JSON）
    python perf_probe.py --variant js    # 对照：把语音包还原成内联 JS 对象

输出 DCL / 首帧（rAF）。LOAD 在 dump-dom 时通常还没结束（会是负数），只作参考。
"""
import io, os, re, subprocess, tempfile, statistics, sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
TMP = os.path.join(tempfile.gettempdir(), 'wb_perf')
os.makedirs(TMP, exist_ok=True)

PROBE = """
<script>
(function(){
  var raf = -1;
  requestAnimationFrame(function(){ raf = Math.round(performance.now()); });
  window.addEventListener('load', function(){
    var t = performance.timing;
    var dcl = t.domContentLoadedEventEnd - t.navigationStart;
    var lo = t.loadEventEnd ? (t.loadEventEnd - t.navigationStart) : -1;
    var vp = document.getElementById('voicePack');
    if (vp) vp.textContent = '';      /* 免得 dump-dom 输出 4MB */
    document.title = 'DCL=' + dcl + '|LOAD=' + lo + '|RAF=' +
      (raf < 0 ? Math.round(performance.now()) : raf);
  });
})();
</script>
"""

PAT = re.compile(r'<title>DCL=(-?\d+)\|LOAD=(-?\d+)\|RAF=(-?\d+)</title>')


def build_variant(html, variant):
    if variant != 'js':
        return html
    m = re.search(r'<script type="application/json" id="voicePack">([\s\S]*?)</script>', html)
    if not m:
        raise SystemExit('找不到 voicePack 数据块')
    return html.replace(m.group(0), '<script>var VOICE_PACK = ' + m.group(1) + ';</script>')


def measure(path, variant, times=3):
    html = io.open(path, encoding='utf-8').read()
    page = build_variant(html, variant).replace('</body>', PROBE + '</body>')
    tp = os.path.join(TMP, 'probe_%s.html' % variant)
    io.open(tp, 'w', encoding='utf-8', newline='').write(page)
    vals = []
    for _ in range(times):
        r = subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
                            '--user-data-dir=' + os.path.join(TMP, 'ud'),
                            '--window-size=1180,900', '--dump-dom',
                            'file:///' + tp.replace('\\', '/')],
                           capture_output=True)
        out = (r.stdout or b'').decode('utf-8', 'replace')
        m = PAT.search(out)
        if m:
            vals.append(tuple(int(x) for x in m.groups()))
    return vals


target = '生活语文练习台.html'
variant = 'json'
if '--variant' in sys.argv:
    variant = sys.argv[sys.argv.index('--variant') + 1]

vals = measure(target, variant)
if not vals:
    raise SystemExit('测量失败（没拿到 title）')
print('版本：%s（%d 次）' % ('惰性 JSON' if variant == 'json' else '内联 JS 对象', len(vals)))
print('样本', vals)
for idx, name in enumerate(['DCL', '首帧', 'LOAD']):
    col = sorted(v[idx] for v in vals if v[idx] >= 0)
    if not col:
        print('%-4s 无有效样本' % name)
        continue
    print('%-4s 中位数 %5d ms   最小 %5d ms' % (name, statistics.median(col), col[0]))
