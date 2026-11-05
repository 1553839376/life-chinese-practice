# 生成 _reel.html：产物 + 一段「摆帧」脚本，用于无头浏览器核对收线中间帧
# 第四版：线从**竿尖**出发（三次贝塞尔），整条线以竿尖为心等比缩到 kEnd，鱼位移 弦×(k-1)
# kEnd 直接从代码已经写好的目标 transform 里读，不在这里重复一份公式
import io

SRC = '生活语文练习台.html'
DST = '_reel.html'

DRIVER = r'''
<script>
/* 仅用于截图核对：headless 里 CSS transition 不随虚拟时间推进，所以直接摆「收线到 p」那一帧 */
(function(){
  function go(){
    var pool = (window.STATE && STATE.chars) ? STATE.chars.filter(function(c){ return c.w; }) : [];
    if (pool.length < 4){ document.title = 'NO_CHARS'; return; }
    startGame('fish', pool.slice(0, 4));
    setTimeout(function(){
      var field = document.getElementById('gameField');
      var all = field.querySelectorAll('.g-item'), i, j, far = null, best = -1, qi = 0;
      for (i = 0; i < all.length; i++){
        var w = all[i].getAttribute('data-w'), hit = -1;
        for (j = 0; j < GAME.queue.length; j++){ if (GAME.queue[j].w === w){ hit = j; break; } }
        var t = all[i].getBoundingClientRect().top;
        if (hit >= 0 && t > best){ best = t; far = all[i]; qi = hit; }
      }
      if (!far){ document.title = 'NO_ITEM'; return; }
      GAME.i = qi;
      far.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      setTimeout(function(){
        var p = parseFloat((location.hash.match(/p=([\d.]+)/) || [0, '0.1'])[1]);
        var path = document.querySelector('.reel-line'), f = document.querySelector('.fish.hit');
        if (!path || !f){ document.title = 'NO_EL'; return; }
        var nums = (path.getAttribute('d').match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
        var tipx = nums[0], tipy = nums[1];            /* d 的起点 = 竿尖 */
        var bx = nums[6], by = nums[7];                /* 终点 = 鱼心 */
        var ax = bx - tipx, ay = by - tipy;
        var total = path.getTotalLength();
        /* 目标 k 从代码自己写的 transform 里读（180ms 定时器已经写过一次） */
        var m = /scale\(([\d.]+)\)/.exec(path.style.transform || '');
        var kEnd = m ? parseFloat(m[1]) : 0.1;
        var k = 1 + (kEnd - 1) * p;                    /* 1 → kEnd */
        path.style.transition = 'none';
        path.style.strokeDasharray = total.toFixed(1) + ' ' + total.toFixed(1);
        path.style.strokeDashoffset = '0';
        void path.getBoundingClientRect();             /* 先让「取消过渡」生效并回流，再写 transform */
        path.style.transform = 'translate(' + tipx + 'px,' + tipy + 'px) scale(' + k + ') ' +
          'translate(' + (-tipx) + 'px,' + (-tipy) + 'px)';
        f.style.animation = 'none';
        f.style.transition = 'none';
        void f.offsetWidth;
        /* p=0 时干脆不碰鱼的 transform：只要碰了（哪怕 translate(0,0)），headless 就会把它
           提到合成层、按旧帧的像素画，看起来「线没搭上鱼」——踩过三次了 */
        if (p > 0){
          f.style.transform = 'translate(' + (ax * (k - 1)).toFixed(1) + 'px,' +
            (ay * (k - 1)).toFixed(1) + 'px) rotate(-14deg) scale(' + (1 - 0.66 * p).toFixed(3) + ')';
        }
        void path.getBoundingClientRect();
        /* 真量：线端（过完 transform）到鱼心（过完 transform）的屏幕距离 */
        var gap = -1;
        try {
          var mm = path.getCTM();
          var e = path.getPointAtLength(total).matrixTransform(mm);
          var svg = path.ownerSVGElement.getBoundingClientRect();
          var ex = svg.left + e.x, ey = svg.top + e.y;
          var fr = f.getBoundingClientRect();
          var fx = fr.left + fr.width / 2, fy = fr.top + fr.height / 2;
          gap = Math.sqrt((ex - fx) * (ex - fx) + (ey - fy) * (ey - fy));
          document.title = 'p=' + p + ' k=' + k.toFixed(3) + ' kEnd=' + kEnd.toFixed(3) +
            ' chord=' + Math.sqrt(ax * ax + ay * ay).toFixed(1) +
            ' arc=' + total.toFixed(1) + ' gap=' + gap.toFixed(1) +
            ' arcEnd=' + (ex | 0) + ',' + (ey | 0) + ' fishC=' + (fx | 0) + ',' + (fy | 0);
        } catch (err) {
          document.title = 'MEASURE_FAIL ' + err.message;
        }
        if (/dbg/.test(location.hash)){
          var lab = document.createElement('div');
          lab.style.cssText = 'position:fixed;left:6px;top:6px;z-index:999999;background:#000;color:#fff;font:13px monospace;padding:5px;white-space:pre';
          lab.textContent = 'p=' + p + ' k=' + k.toFixed(3) + '\nchord=' + Math.sqrt(ax * ax + ay * ay).toFixed(1) +
            '\nfishC=' + (fx | 0) + ',' + (fy | 0) + '\narcEnd=' + (ex | 0) + ',' + (ey | 0) + '\ngap=' + gap.toFixed(1) +
            '\nfishOpacity=' + getComputedStyle(f).opacity + ' vis=' + getComputedStyle(f).visibility +
            '\nclass=' + f.className + '\nstyle=' + (f.getAttribute('style') || '').slice(0, 200) +
            '\nrect=' + (f.getBoundingClientRect().width | 0) + 'x' + (f.getBoundingClientRect().height | 0) +
            '\nD=' + path.getAttribute('d') +
            '\nLEN=' + total.toFixed(1) + ' DASH=' + path.style.strokeDasharray + ' OFF=' + path.style.strokeDashoffset +
            '\nPTF=' + path.style.transform +
            '\nPB=' + JSON.stringify(path.getBoundingClientRect()) +
            '\nSTR=' + (document.querySelector('.rod-string') ? getComputedStyle(document.querySelector('.rod-string')).opacity : 'none');
            var sv0 = f.querySelector('.fish-svg'), ch0 = f.querySelector('.fish-ch');
            lab.textContent += '\nSVG=' + (sv0 ? JSON.stringify(sv0.getBoundingClientRect()) : '-') +
              '\nCH=' + (ch0 ? JSON.stringify(ch0.getBoundingClientRect()) : '-') +
              '\nsvgViewBox=' + (sv0 ? sv0.getAttribute('viewBox') : '-');
          document.body.appendChild(lab);
          [[fx, fy, 'blue'], [ex, ey, 'red']].forEach(function (q) {
            var e2 = document.createElement('i');
            e2.style.cssText = 'position:fixed;left:' + (q[0] - 5) + 'px;top:' + (q[1] - 5) + 'px;width:10px;height:10px;border-radius:50%;background:' + q[2] + ';z-index:999999';
            document.body.appendChild(e2);
          });
        }
        /* 再写一遍（幂等），逼浏览器在截图前重新提交一次合成 */
        setTimeout(function(){
          path.style.transform = path.style.transform;
          f.style.transform = f.style.transform;
          void f.offsetWidth;
        }, 180);
      }, 240);
    }, 120);
  }
  setTimeout(go, 60);
})();
</script>
'''

# 「只点击、不摆帧」的副本：核真实观感用这个。
# 摆帧副本拍不出真效果——.fish 带 drop-shadow 会被提到合成层，手动写 transform 后截图仍按旧帧画。
CLICK_ONLY = r'''
<script>
(function(){
  setTimeout(function(){
    var pool = STATE.chars.filter(function(c){ return c.w; });
    startGame('fish', pool.slice(0, 4));
    setTimeout(function(){
      var all = document.querySelectorAll('#gameField .g-item'), far = null, best = -1, qi = 0, i, j;
      for (i = 0; i < all.length; i++){
        var w = all[i].getAttribute('data-w'), hit = -1;
        for (j = 0; j < GAME.queue.length; j++){ if (GAME.queue[j].w === w){ hit = j; break; } }
        var t = all[i].getBoundingClientRect().top;
        if (hit >= 0 && t > best){ best = t; far = all[i]; qi = hit; }
      }
      if (!far) return;
      GAME.i = qi;
      far.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      document.title = 'clicked ' + far.getAttribute('data-w');
    }, 120);
  }, 60);
})();
</script>
'''

html = io.open(SRC, encoding='utf-8', newline='').read()
i = html.rfind('</body>')
assert i > 0
out = html[:i] + DRIVER + html[i:]
io.open(DST, 'w', encoding='utf-8', newline='').write(out)
print('wrote', DST, len(out))
io.open('_click_only.html', 'w', encoding='utf-8', newline='').write(html[:i] + CLICK_ONLY + html[i:])
print('wrote _click_only.html')
