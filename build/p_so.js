/* ------------------------- 笔顺与描写（v27，T-023） -------------------------
   用户 2026-10-30：「在最开始的全班都可以学习的地方应该增加一个描写，就像练习那样的。
   而且应该有笔顺才对。笔顺是用灰色底图汉字上的动画变红色来先呈现怎么写，再让学生描写。」

   数据在 p_stroke.js（STROKE_PACK，每字一条 `轮廓|笔迹0|笔迹1|…`），来源
   hanzi-writer-data@2.0.1（派生自 Make Me a Hanzi，Arphic Public License），坐标 0-1024、y 向下。

   画法（三层，全在 canvas 上）：
     ① 灰底：所有笔画轮廓一次性填浅色 —— 这就是「照着描」的底字；
     ② 红色：已写完的笔画整笔填红；
     ③ 正在写的那一笔：把画布裁剪到「这一笔自己的轮廓」里，再沿笔迹画一条足够粗的线。
        裁剪保证红色不会糊到相邻笔画上，粗线保证这一笔的轮廓被整块填满。
        这比只画一条笔迹线更接近真实示范：孩子看到的是笔画慢慢长出来，而不是一根导线。

   为什么不用 CSS 文字做灰底：字体里的字形和笔顺数据里的字形不是一回事，
   灰字用字体、红字用轮廓，两套形状叠在一起会错位。
   ------------------------------------------------------------------------- */
var SO_GRAY = '#DCD4BE';    /* 灰底字：和练习里的 .wg-ghost 同一档灰度 */
var SO_RED = '#C0392B';     /* 笔顺红：和 --red 一致 */
var SO_BASE = 900;          /* 数据的基线：y=900 是字格底边（所以屏幕 y = 900 − y数据） */
var SO_CACHE = {};
var SO = {
  ch: '', lit: 0, frac: 0, playing: false, timer: null, dpr: 1,
  step: 0, seq: []
};
var SO_STROKE_MS = 300;    /* 每一笔走多久 */
var SO_GAP_MS = 120;       /* 两笔之间停一下，让孩子看清起笔位置 */
var SO_HOLD_MS = 700;      /* 整字红着停多久，再淡回灰底等孩子描 */
var SO_GEN = 0;            /* 每停/每播 +1：上一轮留下的定时器看到代数变了就自己作废 */

function soHas(ch){ return !!(ch && STROKE_PACK[ch]); }

/* 解一个字的笔顺：返回 { strokes:[[cmd,[args]]], meds:[[[x,y]…]] }，解过就缓存 */
function soParse(ch){
  if (!ch) return null;
  if (SO_CACHE[ch] !== undefined) return SO_CACHE[ch];
  var raw = STROKE_PACK[ch], body, parts, i, j, k, n, c, args, st, strokes = [],
      meds = [], pts, p;
  if (!raw){ SO_CACHE[ch] = null; return null; }
  parts = raw.split('|');
  body = parts[0];
  i = 0;
  while (i < body.length){
    c = body.charAt(i++);
    n = (c === 'Q') ? 4 : (c === 'C') ? 6 : (c === 'Z') ? 0 : 2;
    args = [];
    for (k = 0; k < n; k++){
      args.push(parseInt(body.substr(i, 2), 36) - 128);
      i += 2;
    }
    if (c === 'M'){ st = []; strokes.push(st); }
    if (st) st.push([c, args]);
  }
  for (i = 1; i < parts.length; i++){
    p = parts[i];
    pts = [];
    for (j = 0; j < p.length; j += 4){
      pts.push([parseInt(p.substr(j, 2), 36) - 128,
                parseInt(p.substr(j + 2, 2), 36) - 128]);
    }
    meds.push(pts);
  }
  SO_CACHE[ch] = { strokes: strokes, meds: meds };
  return SO_CACHE[ch];
}

/* 一条笔画 → Path2D。Path2D 不在时返回 null（jsdom 就没有），调用方要判空 */
function soPath(st){
  if (typeof Path2D === 'undefined') return null;
  var p = new Path2D(), i, c, a;
  for (i = 0; i < st.length; i++){
    c = st[i][0]; a = st[i][1];
    if (c === 'M') p.moveTo(a[0], a[1]);
    else if (c === 'L') p.lineTo(a[0], a[1]);
    else if (c === 'Q') p.quadraticCurveTo(a[0], a[1], a[2], a[3]);
    else if (c === 'C') p.bezierCurveTo(a[0], a[1], a[2], a[3], a[4], a[5]);
    else if (c === 'Z') p.closePath();
  }
  return p;
}
function soPaths(ch){
  var d = soParse(ch), out = [], i;
  if (!d) return out;
  if (d.paths) return d.paths;
  for (i = 0; i < d.strokes.length; i++) out.push(soPath(d.strokes[i]));
  d.paths = out;
  return out;
}

/* 沿笔迹取到第 frac（0~1）个点的位置，供「长出来」用 */
function soTrace(pts, frac){
  var seg = [], i, total = 0, want, acc = 0, d;
  if (!pts || !pts.length) return [];
  if (pts.length === 1 || frac >= 1) return pts;
  for (i = 1; i < pts.length; i++){
    d = Math.sqrt(Math.pow(pts[i][0] - pts[i - 1][0], 2) +
                  Math.pow(pts[i][1] - pts[i - 1][1], 2));
    seg.push(d);
    total += d;
  }
  if (!total) return [pts[0]];
  want = total * frac;
  var out = [pts[0]];
  for (i = 0; i < seg.length; i++){
    if (acc + seg[i] <= want){ out.push(pts[i + 1]); acc += seg[i]; }
    else {
      var r = (want - acc) / (seg[i] || 1);
      out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * r,
                pts[i][1] + (pts[i + 1][1] - pts[i][1]) * r]);
      break;
    }
  }
  return out;
}

/* 画到画布上：lit 笔已经写完，第 lit 笔走到 frac */
function soPaint(ctx, ch, lit, frac){
  var d = soParse(ch), paths = soPaths(ch), i, p, j, k, line, W = 1024;
  if (!ctx || !d) return 0;
  /* 清屏要退回单位矩阵：y 翻转过之后 (0,0,1024,1024) 覆盖不到画布最底下一条 */
  if (ctx.save && ctx.canvas){
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  } else {
    ctx.clearRect(0, 0, W, W);
  }
  /* ① 灰底 */
  ctx.fillStyle = SO_GRAY;
  for (i = 0; i < paths.length; i++){ if (paths[i]) ctx.fill(paths[i]); }
  /* ② 已写完的笔画填红 */
  ctx.fillStyle = SO_RED;
  for (i = 0; i < lit && i < paths.length; i++){ if (paths[i]) ctx.fill(paths[i]); }
  /* ③ 正在写的那一笔：裁到自己的轮廓里，再画一条会变长的粗线 */
  if (frac > 0 && lit < paths.length && paths[lit]){
    ctx.save();
    ctx.clip(paths[lit]);
    line = soTrace(d.meds[lit] || [], frac);
    if (line.length >= 1){
      ctx.strokeStyle = SO_RED;
      ctx.lineWidth = 300;                  /* 远大于笔画最粗处，裁过之后正好填满 */
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(line[0][0], line[0][1]);
      for (k = 1; k < line.length; k++) ctx.lineTo(line[k][0], line[k][1]);
      if (line.length === 1){
        ctx.lineTo(line[0][0] + 0.5, line[0][1] + 0.5);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  return d.strokes.length;
}
/* 把画布铺到容器大小（按 DPR 放大再缩回），坐标系换成 0-1024。
   **必须把 y 翻转**：hanzi-writer 的笔顺数据是 y 轴朝上（基线在 900，写到 900 就落到字格底部），
   而 canvas 的 y 轴朝下。不翻的话「上」会把长横画在顶上——整字上下颠倒，
   笔画顺序也跟着从下往上走。所以映射是 y屏幕 = 900 − y数据。
   踩过：一开始按 y 直接画，截图里「上」是倒的，其它字因为接近上下对称差点没看出来。 */
function soFit(cv){
  if (!cv || !cv.getBoundingClientRect || !cv.getContext) return null;
  var r = cv.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
  var dpr = window.devicePixelRatio || 1;
  if (!w || !h) return null;
  if (cv.width !== Math.round(w * dpr)) cv.width = Math.round(w * dpr);
  if (cv.height !== Math.round(h * dpr)) cv.height = Math.round(h * dpr);
  var ctx = cv.getContext('2d');
  if (!ctx || !ctx.setTransform) return null;
  ctx.setTransform(dpr * w / 1024, 0, 0, -dpr * h / 1024, 0, dpr * h * SO_BASE / 1024);
  return ctx;
}

/* ------------------------- 描写界面 -------------------------
   流程：打开就自动播一遍笔顺 →（可「再看一遍」）→ 直接在灰字上描写 →「写好了」。
   不判分：这里没有学生档案，也没有手写识别，写没写好由老师看一眼。 */
var TRACE = { c: null, box: null, state: 'demo', done: false };

function openTrace(c){
  if (!c || !c.w) return;
  TRACE.c = c;
  TRACE.state = 'demo';
  TRACE.done = false;
  $('traceChar').textContent = c.w;
  $('tracePy').textContent = c.p || '';
  $('traceMask').hidden = false;
  setHTML($('traceTip'), '看一遍笔顺，看看每一笔从哪里起');
  traceButtons('demo');
  /* 底字用轮廓画；没有笔顺数据的字退回字体文字，至少还能描 */
  var ghost = $('soGhost');
  if (ghost){
    ghost.textContent = soHas(c.w) ? '' : c.w;
    ghost.hidden = soHas(c.w);
  }
  setTimeout(function(){
    traceLayout();
    soPlay(c.w);
  }, 30);
}

function traceLayout(){
  var base = $('soBase'), ink = $('soInk'), grid = $('traceGrid');
  if (!grid) return;
  var r = grid.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
  if (!w || !h) return;
  [base, ink].forEach(function(cv){
    if (!cv) return;
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
  });
  var ctx = soFit(base);
  if (ctx) soPaint(ctx, TRACE.c && TRACE.c.w, SO.lit, SO.frac);
  /* 笔迹层用 WG 那套指针逻辑：把盒子搭成同样的形状就能直接复用 */
  if (!TRACE.box){
    TRACE.box = { cv: ink, ctx: null, strokes: [], cur: null, w: 0, h: 0, free: true };
    wgBindOne(TRACE.box);
  }
  if (TRACE.box){
    TRACE.box.w = w; TRACE.box.h = h;
    var dpr = window.devicePixelRatio || 1;
    ink.width = Math.round(w * dpr);
    ink.height = Math.round(h * dpr);
    TRACE.box.ctx = ink.getContext ? ink.getContext('2d') : null;
    if (TRACE.box.ctx && TRACE.box.ctx.setTransform){
      TRACE.box.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    wgRedraw(TRACE.box);
  }
}

function traceButtons(state){
  var replay = $('traceReplay'), done = $('traceDone'), again = $('traceAgain'),
      next = $('traceNext');
  if (!replay) return;
  replay.hidden = false;
  done.hidden = (state === 'done');
  again.hidden = (state !== 'done');
  if (next) next.hidden = (state !== 'done');
}

/* 播一遍笔顺：逐笔推进，每笔内部再分 6 步，看起来是「一笔一笔长出来」 */
function soPlay(ch){
  soStop();
  var d = soParse(ch), total, i;
  SO.ch = ch;
  SO.lit = 0;
  SO.frac = 0;
  SO.playing = true;
  var ctx = soFit($('soBase'));
  if (!ctx || !d){                     /* 没有画布或没有数据：静态灰字，直接进描写 */
    SO.playing = false;
    traceTipDone();
    return;
  }
  soPaint(ctx, ch, 0, 0);
  if (!d.strokes.length){ SO.playing = false; traceTipDone(); return; }
  total = d.strokes.length;
  var seq = [];
  for (i = 0; i < total; i++){
    for (var k = 1; k <= 6; k++) seq.push({ lit: i, frac: k / 6 });
  }
  SO.seq = seq;
  SO.step = 0;
  soTick();
}
function soTick(){
  var ctx = soFit($('soBase')), s;
  if (!SO.playing) return;
  if (SO.step >= SO.seq.length){
    SO.playing = false;
    SO.lit = 99;                        /* 全部写完了 */
    SO.frac = 0;
    soPaint(ctx, SO.ch, 99, 0);
    traceTipDone();
    /* 整字红一下再淡回灰底：红着的时候孩子看清「写完了是什么样」，
       淡回灰色才是用来描的底子 —— 提示语写的是「照着灰字描一遍」，
       底字要是红的就自相矛盾了（踩过：v27 第一版播完全字变红，孩子无从下笔）。 */
    var gen = SO_GEN;
    SO.timer = setTimeout(function(){
      if (gen !== SO_GEN) return;       /* 这期间「再看一遍」或换了字，作废 */
      SO.lit = 0;
      SO.frac = 0;
      var c2 = soFit($('soBase'));
      if (c2) soPaint(c2, SO.ch, 0, 0);
    }, SO_HOLD_MS);
    return;
  }
  s = SO.seq[SO.step++];
  SO.lit = s.lit;
  SO.frac = s.frac;
  soPaint(ctx, SO.ch, s.lit, s.frac);
  SO.timer = setTimeout(soTick, Math.round(SO_STROKE_MS / 6));
}
function soStop(){
  if (SO.timer){ clearTimeout(SO.timer); SO.timer = null; }
  SO.playing = false;
  SO_GEN++;
}
function traceTipDone(){
  if (!$('traceTip')) return;
  setHTML($('traceTip'), '笔顺看完了。现在照着灰字描一遍。');
  /* 只复用已有的那句「照着描一遍。」——新句子要同步改 SENTS / p_voice / SENT_FULL 三处，
     漏一处不是没声，而是退化成逐字念。 */
  say('照着描一遍。');
}

function traceClearInk(){
  if (!TRACE.box) return;
  TRACE.box.strokes = [];
  TRACE.box.cur = null;
  wgRedraw(TRACE.box);
}
function traceDoneTap(){
  if (TRACE.state === 'done') return;
  if (!TRACE.box || !TRACE.box.strokes.length){ sfxTap(); toast('先在方格里写一写'); return; }
  TRACE.state = 'done';
  sfxOk();
  setHTML($('traceTip'), '写好啦！看看和灰字是不是一样。');
  traceButtons('done');
}
function traceAgainTap(){
  TRACE.state = 'trace';
  traceClearInk();
  setHTML($('traceTip'), '擦掉了，慢慢再来一遍。');
  traceButtons('trace');
}
function traceNextTap(){
  var list = LEARN.list || [], i, at = -1, c = TRACE.c;
  for (i = 0; i < list.length; i++){ if (c && list[i].w === c.w){ at = i; break; } }
  if (at < 0 || at + 1 >= list.length){ toast('这一批字都写完啦'); return; }
  openTrace(list[at + 1]);
}
function closeTrace(){
  soStop();
  $('traceMask').hidden = true;
  TRACE.c = null;
  TRACE.state = 'demo';
  sayStop();
}
function soWire(){
  var close = $('traceClose'), replay = $('traceReplay'), done = $('traceDone'),
      again = $('traceAgain'), next = $('traceNext'), ent = $('sheetTrace');
  if (close) close.addEventListener('click', closeTrace);
  if (replay) replay.addEventListener('click', function(){
    if (TRACE.c){ soPlay(TRACE.c.w); setHTML($('traceTip'), '再看一遍笔顺。'); }
  });
  if (done) done.addEventListener('click', traceDoneTap);
  if (again) again.addEventListener('click', traceAgainTap);
  if (next) next.addEventListener('click', traceNextTap);
  if (ent) ent.addEventListener('click', function(){
    var c = CARD_CH;
    if (!c) return;
    openTrace(c);
  });
  /* 转屏/改窗口：重算尺寸，别让田字格拉花 */
  window.addEventListener('resize', function(){
    if ($('traceMask') && !$('traceMask').hidden) traceLayout();
  });
  window.addEventListener('orientationchange', function(){
    setTimeout(function(){
      if ($('traceMask') && !$('traceMask').hidden) traceLayout();
    }, 220);
  });
}
