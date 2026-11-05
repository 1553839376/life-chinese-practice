# 生成 _reel.html：产物 + 一段「摆帧」脚本，用于无头浏览器核对收线中间帧
# 收线第三版：整条弧以钩子为心等比缩到 k，鱼位移 弦×(k-1)
import io, sys

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
        var p = parseFloat((location.hash.match(/p=([\d.]+)/) || [0, '0.05'])[1]);
        var path = document.querySelector('.reel-line'), f = document.querySelector('.fish.hit');
        if (!path || !f){ document.title = 'NO_EL'; return; }
        var nums = (path.getAttribute('d').match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
        var tipx = nums[0], tipy = nums[1];              /* d 的起点就是钩子 */
        var bx = nums[4], by = nums[5];                  /* 终点 = 鱼心 */
        var ax = bx - tipx, ay = by - tipy;
        var total = path.getTotalLength();
        var k = 1 - 0.98 * p;                            /* 1 → 0.02，与 REEL_END 一致 */
        path.style.transition = 'none';
        path.style.strokeDasharray = total.toFixed(1) + ' ' + total.toFixed(1);
        path.style.strokeDashoffset = '0';
        void path.getBoundingClientRect();
        path.style.transform = 'translate(' + tipx + 'px,' + tipy + 'px) scale(' + k + ') ' +
          'translate(' + (-tipx) + 'px,' + (-tipy) + 'px)';
        f.style.animation = 'none';
        f.style.transition = 'none';
        void f.offsetWidth;   /* 先让「取消过渡」生效并回流，再写位移；否则鱼会停在过渡中途（截图和线错开） */
        f.style.transform = 'translate(' + (ax * (k - 1)).toFixed(1) + 'px,' +
          (ay * (k - 1)).toFixed(1) + 'px) rotate(-14deg) scale(' + (1 - 0.66 * p).toFixed(3) + ')';
        void path.getBoundingClientRect();
        /* 真量：弧的终点（过完 transform）到鱼心（过完 transform）的屏幕距离 */
        var gap = -1;
        try {
          var m = path.getCTM();
          var e = path.getPointAtLength(total).matrixTransform(m);
          var svg = path.ownerSVGElement.getBoundingClientRect();
          var ex = svg.left + e.x, ey = svg.top + e.y;
          var fr = f.getBoundingClientRect();
          var fx = fr.left + fr.width / 2, fy = fr.top + fr.height / 2;
          gap = Math.sqrt((ex - fx) * (ex - fx) + (ey - fy) * (ey - fy));
        } catch (err) {}
        document.title = 'p=' + p + ' k=' + k.toFixed(2) + ' chord=' + Math.sqrt(ax * ax + ay * ay).toFixed(1) +
          ' arc=' + total.toFixed(1) + ' gap=' + gap.toFixed(1) +
          ' arcEnd=' + (ex|0) + ',' + (ey|0) + ' fishC=' + (fx|0) + ',' + (fy|0);

        var sv = f.querySelector('.fish-svg'), ch = f.querySelector('.fish-ch');
        var rb = f.getBoundingClientRect(), svr = sv ? sv.getBoundingClientRect() : null,
            chr = ch ? ch.getBoundingClientRect() : null;
        document.title += ' | fishBox=' + (rb.left|0) + ',' + (rb.top|0) + ',' + (rb.width|0) + ',' + (rb.height|0) +
          ' svgBox=' + (svr ? (svr.left|0) + ',' + (svr.top|0) + ',' + (svr.width|0) + ',' + (svr.height|0) : '-') +
          ' chBox=' + (chr ? (chr.left|0) + ',' + (chr.top|0) + ',' + (chr.width|0) + ',' + (chr.height|0) : '-') +
          ' origin=' + getComputedStyle(f).transformOrigin;
        setTimeout(function(){
          f.style.transform = f.style.transform;
          path.style.transform = path.style.transform;
          void f.offsetWidth;
        }, 180);
      }, 240);
    }, 120);
  }
  setTimeout(go, 60);
})();
</script>
'''

html = io.open(SRC, encoding='utf-8', newline='').read()
i = html.rfind('</body>')
assert i > 0
out = html[:i] + DRIVER + html[i:]
io.open(DST, 'w', encoding='utf-8', newline='').write(out)
print('wrote', DST, len(out))
