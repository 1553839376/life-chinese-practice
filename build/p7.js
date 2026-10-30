/* =====================================================================
   认字乐园（新首页）+ 四款找字小游戏
   ---------------------------------------------------------------------
   为什么这么设计：
   1) 首页是「字」不是「人」——按册次浏览、可搜索，点一个字就能玩；
   2) 四款游戏本质都是「给目标字 → 在场上找出同一个字」，不依赖图示，
      所以「和、是、在」这类画不出来的字一样能玩，正好补上配图的缺口；
   3) 全程单指点击，不拖拽、不要求快速反应，符合特教触摸屏使用习惯；
   4) 玩游戏的得分不写进学习记录，避免污染「掌握程度」评估；
   5) 零外部依赖：动画纯 CSS，音效用 Web Audio 现场合成。
   ===================================================================== */

/* ============================ 小工具 ============================ */
var TONE_TBL = 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ';
var TONE_BASE = 'aaaaeeeeiiiioooouuuuüüüü';

/* 拼音去声调，让「hu」也能搜到「hǔ」 */
function noTone(s){
  var i, ch, k, out = '';
  s = String(s || '').toLowerCase().replace(/v/g, 'ü');
  for (i = 0; i < s.length; i++){
    ch = s.charAt(i);
    k = TONE_TBL.indexOf(ch);
    out += (k >= 0) ? TONE_BASE.charAt(k) : ch;
  }
  return out;
}
function mk(tag, cls, txt){
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined && txt !== null) e.textContent = txt;
  return e;
}
function firstWordOf(c){
  if (!c || !c.words) return '';
  var parts = String(c.words).split(/[、，,；;\/|\s]+/);
  return parts[0] || '';
}
function hasArt(c){
  if (!c) return false;
  if (c.img) return true;
  return !!(ART_PACK[c.w] || BUILTIN_ART[c.w]);
}

/* ============================ 乐园状态 ============================ */
var LEARN = {
  stage: null,     /* null = 还没初始化；'' = 全部册次 */
  q: '',
  list: []
};
var CARD_CH = null;

/* ============================ 册次 ============================ */
function stageShort(g){
  var m = /^([一二三四五六])年级(上|下)册(?:-(.))?$/.exec(g);
  if (!m) return g;
  return m[1] + m[2] + (m[3] ? '·' + m[3] : '');
}
function byStage(a, b){
  var ia = STAGES.indexOf(a), ib = STAGES.indexOf(b);
  if (ia < 0) ia = 900;
  if (ib < 0) ib = 900;
  return ia - ib;
}
function learnGroups(){
  var cnt = {}, order = [], i, c, g;
  for (i = 0; i < STATE.chars.length; i++){
    c = STATE.chars[i];
    if (!c.on || !c.w) continue;
    g = c.g || '未分组';
    if (!cnt[g]){ cnt[g] = 0; order.push(g); }
    cnt[g]++;
  }
  order.sort(byStage);
  return { order: order, cnt: cnt };
}

/* ============================ 列表筛选 ============================ */
function learnList(){
  var q = String(LEARN.q || '').trim();
  var lq = noTone(q);
  var out = [], i, c;
  for (i = 0; i < STATE.chars.length; i++){
    c = STATE.chars[i];
    if (!c.on || !c.w) continue;
    if (q){
      if (c.w.indexOf(q) < 0 &&
          noTone(c.p).indexOf(lq) < 0 &&
          String(c.words || '').indexOf(q) < 0) continue;
    } else if (LEARN.stage && c.g !== LEARN.stage) continue;
    out.push(c);
  }
  return out;
}

/* ============================ 乐园渲染 ============================ */
function renderStageChips(groups){
  var total = 0, i, html, on;
  for (i = 0; i < STATE.chars.length; i++){
    if (STATE.chars[i].on && STATE.chars[i].w) total++;
  }
  on = (LEARN.q || LEARN.stage === '') ? ' on' : '';
  html = '<button type="button" class="stage-chip' + on + '" data-g="">全部<b>' + total + '</b></button>';
  for (i = 0; i < groups.order.length; i++){
    on = (!LEARN.q && LEARN.stage === groups.order[i]) ? ' on' : '';
    html += '<button type="button" class="stage-chip' + on + '" data-g="' + esc(groups.order[i]) + '">' +
      esc(stageShort(groups.order[i])) + '<b>' + groups.cnt[groups.order[i]] + '</b></button>';
  }
  setHTML($('stageStrip'), html);
}

function cardHTML(c, i){
  return '<button type="button" class="ch-card" data-i="' + i + '">' +
    (hasArt(c) ? '<span class="ch-dot"></span>' : '') +
    '<span class="ch-big">' + esc(c.w) + '</span>' +
    '<span class="ch-py">' + esc(c.p || '') + '</span>' +
    '<span class="ch-wd">' + esc(firstWordOf(c)) + '</span>' +
    CLOSE('button');
}

function renderLearn(){
  var groups = learnGroups();
  if (LEARN.stage === null) LEARN.stage = '';
  renderStageChips(groups);

  var list = learnList();
  LEARN.list = list;
  var html = '', i, j, c, g;
  var byG, ord;

  if (!LEARN.q && LEARN.stage === ''){
    /* 全部册次：按册次分段，首页一屏就能看出各年级在学什么 */
    byG = {};
    ord = [];
    for (i = 0; i < list.length; i++){
      c = list[i];
      g = c.g || '未分组';
      if (!byG[g]){ byG[g] = []; ord.push(g); }
      byG[g].push(i);
    }
    ord.sort(byStage);
    for (i = 0; i < ord.length; i++){
      g = ord[i];
      html += '<div class="grp"><div class="grp-h">' + esc(g) +
        '<b>' + byG[g].length + '</b>' + CLOSE('div') + '<div class="char-grid">';
      for (j = 0; j < byG[g].length; j++) html += cardHTML(list[byG[g][j]], byG[g][j]);
      html += CLOSE('div') + CLOSE('div');
    }
  } else {
    html = '<div class="char-grid">';
    for (i = 0; i < list.length; i++) html += cardHTML(list[i], i);
    html += CLOSE('div');
  }
  setHTML($('charGrid'), html);

  $('learnEmpty').hidden = list.length > 0;
  $('learnClear').hidden = !LEARN.q;
  var label = LEARN.q ? ('搜到 ' + list.length + ' 个字') :
    (LEARN.stage ? (stageShort(LEARN.stage) + '·' + list.length + ' 个字') : ('全部 ' + list.length + ' 个字'));
  $('learnCount').textContent = label;
}

/* ============================ 学字卡 ============================ */
function openCard(c){
  if (!c) return;
  CARD_CH = c;
  var art = artOf(c);
  setHTML($('sheetArt'), art || '');
  /* 没图就把左边整列收掉（不能让它变成一张大词卡），字居中显示 */
  var hasArt = !!art;
  if ($('sheetLeft')) $('sheetLeft').hidden = !hasArt;
  var sheetEl = document.querySelector('.sheet');
  if (sheetEl){
    if (hasArt) sheetEl.classList.remove('no-art');
    else sheetEl.classList.add('no-art');
  }
  var w = wordOf(c);
  setHTML($('sheetWord'), w ? wordSmallHTML(c) : '');
  $('sheetChar').textContent = c.w;
  $('sheetChar').hidden = false;
  $('sheetPy').textContent = c.p || '';
  $('sheetRead').textContent = '只看拼音';
  var eb = document.querySelector('.sheet-eyebrow');
  if (eb) eb.textContent = '学这个字 · ' + (c.g || '未分组');
  $('cardMask').hidden = false;
  /* 卡片先出来让孩子看一眼，停一下再开口；字念完再停一秒才念组词。
     用 CARD_CH 做凭据：中途关掉或换了别的字，这次朗读就作废。 */
  var paper = c;
  setTimeout(function(){
    if (CARD_CH !== paper || $('cardMask').hidden) return;
    var wd = wordOf(paper);
    if (wd) saySeq([{ t: paper.w, gap: PACE.afterChar }, { t: wd }]);
    else saySeq([{ t: paper.w }]);
  }, PACE.ready * 1000);
}
function closeCard(){
  $('cardMask').hidden = true;
  CARD_CH = null;
  sayStop();
}
function togglePinyinOnly(){
  var el = $('sheetChar');
  el.hidden = !el.hidden;
  $('sheetRead').textContent = el.hidden ? '看回汉字' : '只看拼音';
}

/* ============================ 音效 ============================
   tone / sfxOk / sfxNo / sfxWin 都在 p8.js（和练习台共用一套），
   这里只留游戏自己的状态。
   ============================================================== */
var GAME = {
  kind: '', queue: [], origin: null, i: 0,
  score: 0, done: 0, miss: 0, combo: 0,
  caught: 0, seq: 0,
  locked: true, timer: null
};

/* ============================ 游戏启动 ============================ */
var GAME_NAMES = { bubble: '戳泡泡', fish: '钓鱼', fruit: '摘果子', feed: '喂小动物' };
var GAME_KEYS = ['bubble', 'fish', 'fruit', 'feed'];

function startGame(kind, chars){
  if (!chars || !chars.length){ toast('先挑一个字再玩'); return; }
  if (!GAME_NAMES[kind]) kind = GAME_KEYS[Math.floor(Math.random() * GAME_KEYS.length)];

  var base = shuffleArr(chars), i, total;
  total = (chars.length === 1) ? 4 : Math.min(8, Math.max(6, chars.length));

  GAME.kind = kind;
  GAME.origin = { kind: kind, chars: chars.slice(0) };
  GAME.queue = [];
  for (i = 0; i < total; i++) GAME.queue.push(base[i % base.length]);
  GAME.i = 0;
  GAME.score = 0;
  GAME.done = 0;
  GAME.miss = 0;
  GAME.combo = 0;
  GAME.caught = 0;
  GAME.animal = null;
  GAME.locked = true;

  closeCard();
  avUnlock();
  sayStop();
  $('gameName').textContent = GAME_NAMES[kind];
  $('gameScore').textContent = '0';
  $('gameMute').textContent = AV.sfx ? '音效开' : '音效关';
  showScreen('game');
  gameQuestion();
}
function clearGameTimer(){
  if (GAME.timer){ clearTimeout(GAME.timer); GAME.timer = null; }
}
function quitGame(back){
  clearGameTimer();
  sayStop();
  GAME.queue = [];
  GAME.locked = true;
  GAME.kind = '';
  if (back){
    renderLearn();
    showScreen('learn');
  }
}

/* ============================ 出题 ============================ */
function distractorPool(target){
  var same = [], other = [], i, c;
  for (i = 0; i < STATE.chars.length; i++){
    c = STATE.chars[i];
    if (!c.on || !c.w || c.w === target.w) continue;
    if (c.g === target.g) same.push(c); else other.push(c);
  }
  if (same.length >= 3) return same;
  return same.concat(other);
}
function gameOpts(t){
  var pool = distractorPool(t), picks = shuffleArr(pool).slice(0, 3), out = [], i;
  out.push(t);
  for (i = 0; i < picks.length; i++) out.push(picks[i]);
  /* 字库里字太少时，用重复的兜底项撑满四个位置 */
  while (out.length < 4 && pool.length){
    out.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return shuffleArr(out);
}
function gameQuestion(){
  clearGameTimer();
  var q = GAME.queue[GAME.i];
  if (!q){ gameOver(); return; }
  GAME.locked = false;
  GAME.miss = 0;
  $('gameProg').textContent = (GAME.i + 1) + ' / ' + GAME.queue.length;
  $('gameScore').textContent = String(GAME.score);
  $('gameAskWord').textContent = q.w;
  $('gameAskPy').textContent = q.p || '';

  var opts = gameOpts(q);
  var field = $('gameField');
  field.className = 'game-field g-' + GAME.kind;
  field.setAttribute('data-kind', GAME.kind);
  if (GAME.kind === 'bubble') setHTML(field, bubbleScene(opts));
  else if (GAME.kind === 'fish') setHTML(field, fishScene(opts));
  else if (GAME.kind === 'fruit') setHTML(field, fruitScene(opts));
  else setHTML(field, feedScene(q, opts));
  /* 先让场景动起来，停一下再读题。
     定时器必须挂在 GAME.timer 上：否则退出游戏、或立刻换成另一种玩法时，
     上一局遗留的定时器会把新一局的字再读一遍（测试里表现为偶发多播一次）。 */
  var gi = GAME.i;
  GAME.timer = setTimeout(function(){
    GAME.timer = null;
    if (GAME.i !== gi || GAME.locked) return;
    readAsk();
  }, PACE.ready * 1000);
}
/* 每种玩法读法不同，但都是「先读字，再说要做什么」——不认字也能听懂 */
/* 游戏读题也拆成「先说做什么 → 停一下 → 再念这个字」，
   不再一口气念两遍字然后再叫你找出来。 */
function gameSay(kind, q){
  var w = (q && q.w) || '', act = '找出这个字。';
  if (kind === 'bubble') act = '把这个字戳掉。';
  else if (kind === 'fish') act = '把这个字钓上来。';
  else if (kind === 'fruit') act = '把这个字摘下来。';
  else if (kind === 'feed') act = '小动物要吃这个字，喂给它。';
  return [{ t: act, gap: PACE.afterAsk }, { t: w }];
}
function gameSentence(kind, q){
  var list = gameSay(kind, q), i, out = '';
  for (i = 0; list && i < list.length; i++) out += list[i].t;
  return out;
}
function readAsk(){
  if (GAME.locked) return;
  var q = GAME.queue[GAME.i];
  if (!q) return;
  var ok = saySeq(gameSay(GAME.kind, q));
  readHint($('gameAskPy'), ok, q.p || q.w);
}

/* ============================ 战利品与场景零件 ============================
   孩子每答对一个，都要看得见「我抓到了」——容器里的数量 +1、物件飞进去、
   飘一个 +10。这些零件四个场景共用。
   ======================================================================== */
function lootSVG(kind){
  if (kind === 'fish') return '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M9 7V5.6A3 3 0 0 1 12 2.6a3 3 0 0 1 3 3V7" stroke="#9A6632" stroke-width="2" fill="none"/>' +
    '<path d="M3.2 7.4h17.6l-1.9 11.2a3 3 0 0 1-3 2.5H8.1a3 3 0 0 1-3-2.5z" fill="#C98A4B"/>' +
    '<path d="M6 11h12M6.8 15.4h10.4" stroke="#8E5F2C" stroke-width="1.8" opacity=".55"/>' +
    CLOSE('svg');
  if (kind === 'fruit') return '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M2.4 8.4h19.2l-1.6 10.2a3 3 0 0 1-3 2.6H7a3 3 0 0 1-3-2.6z" fill="#D9A45E"/>' +
    '<path d="M2.4 8.4h19.2" stroke="#A9762F" stroke-width="2" stroke-linecap="round"/>' +
    '<circle cx="9" cy="14.6" r="2.3" fill="#E8623F"/><circle cx="15.6" cy="14.6" r="2.3" fill="#E8623F"/>' +
    CLOSE('svg');
  if (kind === 'feed') return '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M12 21.2S3.6 16 3.6 10.6A4.7 4.7 0 0 1 12 7.4a4.7 4.7 0 0 1 8.4 3.2c0 5.4-8.4 10.6-8.4 10.6z" fill="#E8668F"/>' +
    CLOSE('svg');
  return '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="8.2" fill="none" stroke="#7FB6DA" stroke-width="2.4"/>' +
    '<path d="M7.6 14.4a4.8 4.8 0 0 1 2.2-6.6" stroke="#B7DCF3" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    CLOSE('svg');
}
function lootHTML(kind, n){
  return '<div class="game-loot" id="gameLoot">' + lootSVG(kind) +
    '<b>' + n + CLOSE('b') + CLOSE('div');
}
/* 鱼篓 / 果篮（放在场景右下，钓到、摘到就往里放）。
   n 是这一局已经抓到的数量：篮口按数量摆出果子/鱼，孩子一眼看得出自己抓了几个。 */
function basketSVG(kind, n){
  var uid = 'bk' + (++GAME.seq);
  var open = '<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#E6BC81"/><stop offset="1" stop-color="#B07E3C"/>' +
    CLOSE('linearGradient') + CLOSE('defs');
  var extra = '', i, k = Math.min(n || 0, 3);
  for (i = 0; i < k; i++){
    extra += (kind === 'fish')
      ? '<ellipse cx="' + (25 + i * 14) + '" cy="25" rx="9" ry="5" fill="#F0B45C"/>'
      : '<circle cx="' + (26 + i * 14) + '" cy="24" r="6.5" fill="' + (i % 2 ? '#F0A63C' : '#E8623F') + '"/>';
  }
  if (kind === 'fish'){
    return '<svg class="fish-basket" viewBox="0 0 80 80" aria-hidden="true">' + open +
      '<path d="M11 26h58l-6.4 41a8 8 0 0 1-8 7.2H25.4a8 8 0 0 1-8-7.2z" fill="url(#' + uid + ')"/>' +
      '<ellipse cx="40" cy="26" rx="29" ry="7.4" fill="#F2D8AE"/>' +
      '<ellipse cx="40" cy="26" rx="23" ry="5" fill="#C79A5D"/>' +
      extra +
      '<path d="M20 40h40M22 52h36M24 63h32" stroke="#8E5F2C" stroke-width="3" opacity=".38"/>' +
      '<path d="M17 26Q22 7 40 7t23 19" stroke="#9A6A32" stroke-width="3.4" fill="none"/>' +
      CLOSE('svg');
  }
  return '<svg class="basket" viewBox="0 0 80 80" aria-hidden="true">' + open +
    '<path d="M10 28h60l-6.6 39a8 8 0 0 1-8 7H24.6a8 8 0 0 1-8-7z" fill="url(#' + uid + ')"/>' +
    '<ellipse cx="40" cy="28" rx="30" ry="7.6" fill="#EED2A4"/>' +
    '<ellipse cx="40" cy="28" rx="24" ry="5.2" fill="#BF8A4B" opacity=".5"/>' +
    extra +
    '<path d="M19 42h42M21 54h38M23 65h34" stroke="#8E5F2C" stroke-width="3" opacity=".36"/>' +
    CLOSE('svg');
}
function heartSVG(){
  return '<svg class="feed-heart" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M12 21.2S3.6 16 3.6 10.6A4.7 4.7 0 0 1 12 7.4a4.7 4.7 0 0 1 8.4 3.2c0 5.4-8.4 10.6-8.4 10.6z" fill="#F0607F" stroke="#D8466A" stroke-width="1.4"/>' +
    CLOSE('svg');
}

/* ============================ 四款场景 ============================ */
function bubbleScene(opts){
  var html = '<div class="bub-wrap">', i;
  for (i = 0; i < opts.length; i++){
    html += '<div class="g-cell"><button type="button" class="g-item bubble" data-w="' +
      esc(opts[i].w) + '" style="animation-delay:' + (i * 0.42).toFixed(2) + 's">' +
      esc(opts[i].w) + CLOSE('button') + CLOSE('div');
  }
  return html + CLOSE('div') + lootHTML('bubble', GAME.caught);
}
/* 鱼：头在右、尾在左。渐变鱼身 + 腹白 + 鳃线 + 鳞光 + 眼睛高光 + 侧鳍。
   v8.1 修：原先尾鳍画在 x=132~176，而眼睛在 x=116、嘴在 x=138，
   等于把尾巴接到了嘴上。现按「尾鳍—背鳍—身体—头」的顺序重排坐标。 */
function fishSVG(i){
  var pal = [
    { a: '#FFEFC6', b: '#F2B454', c: '#D2831F', fin: '#F5AE52' },
    { a: '#E6F6FF', b: '#8ECBEA', c: '#5798BD', fin: '#7FC2E6' },
    { a: '#FFE9E4', b: '#F2A79C', c: '#CE7062', fin: '#F09A8E' },
    { a: '#EDFADB', b: '#A8D480', c: '#71A64A', fin: '#95C86C' }
  ];
  var p = pal[i % pal.length];
  var uid = 'fs' + (++GAME.seq) + 'x' + i;
  return '<svg class="fish-svg" viewBox="0 0 200 116" aria-hidden="true">' +
    '<defs>' +
      '<linearGradient id="' + uid + 'b" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + p.a + '"/>' +
        '<stop offset=".56" stop-color="' + p.b + '"/>' +
        '<stop offset="1" stop-color="' + p.c + '"/>' +
      CLOSE('linearGradient') +
      '<linearGradient id="' + uid + 'f" x1="1" y1=".2" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + p.fin + '"/>' +
        '<stop offset="1" stop-color="' + p.c + '"/>' +
      CLOSE('linearGradient') +
    CLOSE('defs') +
    /* 尾鳍：根部接在身体左端(58,58)，两叶朝左张开，叉口不要太深。
       包一层 g 专门做摆尾，鱼才不会像一张贴纸。 */
    '<g class="fish-tail" style="animation-delay:-' + (i * 0.22).toFixed(2) + 's">' +
      '<path d="M58 58 L14 24 Q36 58 14 92 Z" fill="url(#' + uid + 'f)"/>' +
    CLOSE('g') +
    /* 背鳍 */
    '<path d="M84 28 Q106 2 130 32 Z" fill="' + p.fin + '"/>' +
    /* 身体 */
    '<ellipse cx="106" cy="58" rx="54" ry="36" fill="url(#' + uid + 'b)"/>' +
    /* 腹白 */
    '<ellipse cx="102" cy="76" rx="40" ry="13" fill="#FFFFFF" opacity=".36"/>' +
    /* 鳃线：在头与身体交界处，向右(头侧)鼓 */
    '<path d="M120 32 Q132 58 120 84" stroke="' + p.c + '" stroke-width="3" fill="none" opacity=".42"/>' +
    /* 鳞光 */
    '<path d="M84 50 q10 8 20 0 M96 60 q10 8 20 0" stroke="#FFFFFF" stroke-width="2.6" fill="none" opacity=".5"/>' +
    /* 眼睛（头在右） */
    '<circle cx="142" cy="46" r="7.6" fill="#FFFFFF"/>' +
    '<circle cx="143.6" cy="46" r="4.3" fill="#26363F"/>' +
    '<circle cx="145" cy="44.2" r="1.5" fill="#FFFFFF"/>' +
    /* 嘴：在身体右前缘 */
    '<path d="M155 64 q7 4 0 9" stroke="' + p.c + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    /* 侧鳍：跟着摆，划水的节奏比尾巴慢一点 */
    '<g class="fish-fin" style="animation-delay:-' + (i * 0.31).toFixed(2) + 's">' +
      '<path d="M132 72 q14 6 7 17 q-12 -3 -14 -14 Z" fill="' + p.fin + '" opacity=".92"/>' +
    CLOSE('g') +
    CLOSE('svg');
}
function fishScene(opts){
  var html = '<div class="fish-wrap">';
  var i, top, left;
  /* 水下光柱 + 上浮气泡，让背景不是一块死板的蓝 */
  html += '<span class="sea-light"></span><span class="sea-light b"></span>';
  for (i = 0; i < 7; i++){
    html += '<span class="sea-bub" style="left:' + (5 + i * 13) + '%;animation-duration:' +
      (5.4 + (i % 3) * 0.9).toFixed(1) + 's;animation-delay:' + (i * 0.8).toFixed(1) + 's"></span>';
  }
  /* 左上角的鱼竿，纯装饰，给孩子「我在钓鱼」的感觉 */
  html += '<svg class="rod" viewBox="0 0 150 110" aria-hidden="true">' +
    '<path d="M2 5 Q52 24 112 29" stroke="#8A6236" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M112 29 Q122 58 116 86" stroke="#F4F0E4" stroke-width="2" fill="none" opacity=".92"/>' +
    '<circle cx="116" cy="88" r="4.2" fill="#E8A317"/>' +
    CLOSE('svg');
  for (i = 0; i < 4 && i < opts.length; i++){
    top = 4 + i * 23.5;
    left = (i % 2 === 0) ? 3 + Math.random() * 6 : 47 + Math.random() * 8;
    html += '<button type="button" class="g-item fish" data-w="' + esc(opts[i].w) +
      '" style="top:' + top.toFixed(1) + '%;left:' + left.toFixed(1) + '%;animation-delay:' +
      (i * 0.45).toFixed(2) + 's">' + fishSVG(i) +
      '<span class="fish-ch">' + esc(opts[i].w) + CLOSE('span') + CLOSE('button');
  }
  for (i = 0; i < 5; i++){
    html += '<span class="seaweed" style="left:' + (8 + i * 19) + '%;animation-delay:' +
      (i * 0.35).toFixed(2) + 's;height:' + (50 + (i % 3) * 14) + 'px"></span>';
  }
  html += basketSVG('fish', GAME.caught);
  return html + CLOSE('div') + lootHTML('fish', GAME.caught);
}
/* 果子：径向渐变 + 高光 + 梗和叶，四种果色轮换 */
function fruitSVG(i){
  var pal = [
    { a: '#FFE9B4', b: '#F5A94E', c: '#CE7418' },
    { a: '#FFDDD6', b: '#EF6F5C', c: '#BF3F2A' },
    { a: '#EBF8CE', b: '#A9CE6A', c: '#75A03E' },
    { a: '#FFE0EE', b: '#F18CB4', c: '#C2587F' }
  ];
  var p = pal[i % pal.length];
  var uid = 'ft' + (++GAME.seq) + 'x' + i;
  return '<svg class="fruit-svg" viewBox="0 0 120 120" aria-hidden="true">' +
    '<defs><radialGradient id="' + uid + '" cx="34%" cy="27%" r="74%">' +
      '<stop offset="0" stop-color="' + p.a + '"/>' +
      '<stop offset=".56" stop-color="' + p.b + '"/>' +
      '<stop offset="1" stop-color="' + p.c + '"/>' +
    CLOSE('radialGradient') + CLOSE('defs') +
    '<path d="M60 27 q-4 -13 -11 -17" stroke="#7A5230" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M62 21 q16 -13 27 -4 q-11 13 -27 4z" fill="#5FA24E"/>' +
    '<circle cx="60" cy="68" r="41" fill="url(#' + uid + ')"/>' +
    '<ellipse cx="44" cy="50" rx="15" ry="9.5" fill="#FFFFFF" opacity=".42" transform="rotate(-28 44 50)"/>' +
    CLOSE('svg');
}
/* 整棵树画在一张 SVG 里：树干与树冠共用坐标系，顶端插进树冠内部，
   连接处被叶子盖住，天然没有接缝（v8.1 修：原先是一根 38px 直棍顶在树冠最低点上）。
   树冠由 9 团叶簇取并集后统一打光，轮廓有起伏，不再是一整块绿墙。 */
function treeSVG(){
  return '<svg class="tree-art" viewBox="0 0 400 250" preserveAspectRatio="none" aria-hidden="true">' +
    '<defs>' +
      '<clipPath id="crownClip">' +
        '<circle cx="200" cy="74" r="64"/><circle cx="110" cy="88" r="52"/>' +
        '<circle cx="290" cy="86" r="54"/><circle cx="146" cy="46" r="42"/>' +
        '<circle cx="256" cy="42" r="40"/><circle cx="128" cy="104" r="36"/>' +
        '<circle cx="272" cy="102" r="34"/><circle cx="62" cy="84" r="36"/>' +
        '<circle cx="338" cy="82" r="36"/>' +
      CLOSE('clipPath') +
      '<radialGradient id="crownG" cx="34%" cy="16%" r="94%">' +
        '<stop offset="0" stop-color="#D2F1B4"/>' +
        '<stop offset=".46" stop-color="#94CF71"/>' +
        '<stop offset="1" stop-color="#589741"/>' +
      CLOSE('radialGradient') +
      '<linearGradient id="crownS" x1="0" y1="0" x2=".22" y2="1">' +
        '<stop offset=".38" stop-color="#2C6533" stop-opacity="0"/>' +
        '<stop offset="1" stop-color="#2C6533" stop-opacity=".34"/>' +
      CLOSE('linearGradient') +
      '<linearGradient id="trunkG" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0" stop-color="#6B4524"/><stop offset=".28" stop-color="#BB8C59"/>' +
        '<stop offset=".58" stop-color="#9E7040"/><stop offset="1" stop-color="#633D1D"/>' +
      CLOSE('linearGradient') +
    CLOSE('defs') +
    /* 树干：顶端 y=124 已在树冠内，底端 y=250 到画面底部（上细下粗，带一点根部的扩张） */
    '<path d="M189 124 C187 160 184 210 181 250 L219 250 C216 210 213 160 211 124 Z" fill="url(#trunkG)"/>' +
    '<path d="M195 152 C194 186 192 220 191 250" stroke="#583619" stroke-width="2" fill="none" opacity=".24"/>' +
    '<g class="tree-crown" id="treeCrown">' +
      '<g clip-path="url(#crownClip)">' +
        '<rect x="0" y="0" width="400" height="250" fill="url(#crownG)"/>' +
        '<rect x="0" y="0" width="400" height="250" fill="url(#crownS)"/>' +
      CLOSE('g') +
    CLOSE('g') +
    CLOSE('svg');
}
function fruitScene(opts){
  var html = treeSVG() +
    '<div class="grass"></div><div class="fruit-wrap">';
  var i;
  for (i = 0; i < opts.length; i++){
    html += '<div class="g-cell"><button type="button" class="g-item fruit" data-w="' +
      esc(opts[i].w) + '" style="animation-delay:' + (i * 0.4).toFixed(2) + 's">' +
      fruitSVG(i) + '<span class="fruit-ch">' + esc(opts[i].w) +
      CLOSE('span') + CLOSE('button') + CLOSE('div');
  }
  html += CLOSE('div') + basketSVG('fruit', GAME.caught);
  return html + lootHTML('fruit', GAME.caught);
}
var FEED_ANIMALS = ['猫', '狗', '兔', '羊', '牛', '鸡', '鸭', '鸟', '熊', '猪', '鼠'];
var BEAR_SVG = '<svg viewBox="0 0 120 120" aria-hidden="true">' +
  '<circle cx="34" cy="26" r="14" fill="#C89B6B"/><circle cx="86" cy="26" r="14" fill="#C89B6B"/>' +
  '<circle cx="34" cy="26" r="7" fill="#E8C7A0"/><circle cx="86" cy="26" r="7" fill="#E8C7A0"/>' +
  '<circle cx="60" cy="64" r="42" fill="#D6A876"/>' +
  '<ellipse cx="60" cy="80" rx="23" ry="17" fill="#F0D6B4"/>' +
  '<circle cx="46" cy="54" r="5" fill="#3E2A18"/><circle cx="74" cy="54" r="5" fill="#3E2A18"/>' +
  '<ellipse cx="60" cy="71" rx="8" ry="6" fill="#3E2A18"/>' +
  '<path d="M60 77 v5 M52 85 q8 6 16 0" stroke="#3E2A18" stroke-width="3" fill="none" stroke-linecap="round"/>' +
  CLOSE('svg');
/* 一局固定一只动物：每换一题就换动物会让孩子以为换了个游戏 */
function animalSVG(){
  if (!GAME.animal){
    var list = [], i;
    for (i = 0; i < FEED_ANIMALS.length; i++){
      if (ART_PACK[FEED_ANIMALS[i]]) list.push(FEED_ANIMALS[i]);
    }
    GAME.animal = list.length ? ART_PACK[list[Math.floor(Math.random() * list.length)]] : '';
  }
  if (!GAME.animal) return BEAR_SVG;
  return '<svg viewBox="0 0 120 120" aria-hidden="true">' + GAME.animal + CLOSE('svg');
}
function feedScene(q, opts){
  var html = '<div class="feed-row">' +
    '<div class="feed-animal" id="feedAnimal">' + animalSVG() +
    '<div class="feed-say">喂我「' + esc(q.w) + '」</div>' + CLOSE('div') +
    '<div class="feed-plates">';
  var i;
  for (i = 0; i < opts.length; i++){
    html += '<button type="button" class="g-item plate" data-w="' + esc(opts[i].w) + '">' +
      '<span class="plate-ch">' + esc(opts[i].w) + CLOSE('span') + CLOSE('button');
  }
  return html + CLOSE('div') + CLOSE('div') + lootHTML('feed', GAME.caught);
}

/* ============================ 作答 ============================ */
function gamePick(el){
  if (GAME.locked) return;
  var q = GAME.queue[GAME.i];
  if (!q || !el) return;
  if (el.getAttribute('data-w') === q.w) gameRight(el);
  else gameWrong(el);
}
/* 答对以后必须"看得见"：飘分 → 东西飞进容器 → 容器里的数字 +1。
   只用 DOM 元素 + CSS 关键帧，不引入任何外部库。 */
function gameFx(el, kind){
  var field = $('gameField');
  if (!field || !el) return;
  var fr = field.getBoundingClientRect();
  var er = el.getBoundingClientRect();
  var cx = er.left - fr.left + er.width / 2;
  var cy = er.top - fr.top + er.height / 2;
  var i, node;

  /* 飘分 */
  var tip = mk('div', 'fx-score', '+10');
  tip.style.left = cx + 'px';
  tip.style.top = cy + 'px';
  field.appendChild(tip);
  setTimeout(function(){ if (tip.parentNode) tip.parentNode.removeChild(tip); }, 960);

  /* 喂食：食物上的字飞进动物嘴里 */
  if (kind === 'feed'){
    var mouth = $('feedAnimal');
    if (mouth){
      var mr = mouth.getBoundingClientRect();
      var fly = mk('div', 'fx-fly', String(el.getAttribute('data-w') || ''));
      fly.style.left = cx + 'px';
      fly.style.top = cy + 'px';
      fly.style.setProperty('--dx', (mr.left - fr.left + mr.width / 2 - cx) + 'px');
      fly.style.setProperty('--dy', (mr.top - fr.top + mr.height * 0.62 - cy) + 'px');
      field.appendChild(fly);
      setTimeout(function(){ if (fly.parentNode) fly.parentNode.removeChild(fly); }, 640);
      /* 吃完冒一颗爱心 */
      var wrap = mk('div', '');
      wrap.innerHTML = heartSVG();
      var hs = wrap.firstChild;
      if (hs){
        hs.style.left = (mr.left - fr.left + mr.width / 2) + 'px';
        hs.style.top = (mr.top - fr.top + mr.height * 0.26) + 'px';
        field.appendChild(hs);
        setTimeout(function(){ if (hs.parentNode) hs.parentNode.removeChild(hs); }, 1000);
      }
    }
  }

  /* 摘果子：果子落向篮子，字跟着飞进去 */
  if (kind === 'fruit'){
    var box = field.querySelector('.basket');
    if (box){
      var br = box.getBoundingClientRect();
      var fly2 = mk('div', 'fx-fly', String(el.getAttribute('data-w') || ''));
      fly2.style.left = cx + 'px';
      fly2.style.top = cy + 'px';
      fly2.style.setProperty('--dx', (br.left - fr.left + br.width / 2 - cx) + 'px');
      fly2.style.setProperty('--dy', (br.top - fr.top + br.height * 0.45 - cy) + 'px');
      field.appendChild(fly2);
      setTimeout(function(){ if (fly2.parentNode) fly2.parentNode.removeChild(fly2); }, 640);
    }
  }

  /* 钓鱼溅水花 / 泡泡炸成水珠 */
  if (kind === 'fish' || kind === 'bubble'){
    var cls = (kind === 'fish') ? 'catch-splash' : 'bub-bit';
    for (i = 0; i < 6; i++){
      var ang = (Math.PI * 2 / 6) * i + Math.random() * 0.6;
      var dist = 30 + Math.random() * 44;
      node = mk('span', cls);
      node.style.left = cx + 'px';
      node.style.top = cy + 'px';
      node.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      node.style.setProperty('--dy', (Math.sin(ang) * dist - 16) + 'px');
      node.style.animationDelay = (i * 0.02) + 's';
      field.appendChild(node);
      (function(n){
        setTimeout(function(){ if (n.parentNode) n.parentNode.removeChild(n); }, 700);
      })(node);
    }
  }

  /* 容器里的数字 +1（鱼篓 / 果篮 / 爱心） */
  GAME.caught++;
  var loot = $('gameLoot');
  if (loot){
    var b = loot.querySelector('b');
    if (b) b.textContent = String(GAME.caught);
    loot.classList.remove('bump');
    void loot.offsetWidth;
    loot.classList.add('bump');
  }
  var basket = field.querySelector('.fish-basket') || field.querySelector('.basket');
  if (basket && basket.classList){
    basket.classList.remove('bump');
    void basket.offsetWidth;
    basket.classList.add('bump');
    /* 立刻往篓/篮里放一颗，别等下一关重渲染才看见 */
    var idx = GAME.caught - 1;
    if (idx >= 0 && idx < 3 && basket.namespaceURI === 'http://www.w3.org/2000/svg'){
      try {
        var ns = 'http://www.w3.org/2000/svg';
        var node2 = document.createElementNS(ns, kind === 'fish' ? 'ellipse' : 'circle');
        if (kind === 'fish'){
          node2.setAttribute('cx', 25 + idx * 14);
          node2.setAttribute('cy', 25);
          node2.setAttribute('rx', 9);
          node2.setAttribute('ry', 5);
          node2.setAttribute('fill', '#F0B45C');
        } else {
          node2.setAttribute('cx', 26 + idx * 14);
          node2.setAttribute('cy', 24);
          node2.setAttribute('r', 6.5);
          node2.setAttribute('fill', idx % 2 ? '#F0A63C' : '#E8623F');
        }
        basket.appendChild(node2);
      } catch (e) {}
    }
  }
}
function gameRight(el){
  GAME.locked = true;
  GAME.combo++;
  GAME.done++;
  GAME.score += 10 + Math.min(GAME.combo - 1, 5) * 2;
  $('gameScore').textContent = String(GAME.score);
  var kind = GAME.kind;
  if (el.classList) el.classList.add('hit');
  if (kind === 'fruit'){
    var crown = $('treeCrown');
    if (crown && crown.classList){
      crown.classList.remove('shake');
      /* SVG 元素没有 offsetWidth，用 getBoundingClientRect 强制回流以重启动画 */
      if (crown.getBoundingClientRect) crown.getBoundingClientRect();
      crown.classList.add('shake');
    }
  }
  if (kind === 'feed'){
    var a = $('feedAnimal');
    if (a && a.classList){
      a.classList.remove('happy');
      void a.offsetWidth;
      a.classList.add('happy');
    }
  }
  gameFx(el, kind);
  sfxOk();
  /* 连对三次起给一个音高递增的小奖励音，越玩越顺 */
  if (GAME.combo >= 3){
    setTimeout(function(){ sfxStreak(GAME.combo); }, 300);
  }
  clearGameTimer();
  GAME.timer = setTimeout(function(){
    GAME.timer = null;
    GAME.i++;
    gameQuestion();
  }, 880);
}
function gameWrong(el){
  GAME.miss++;
  GAME.combo = 0;
  if (el.classList) el.classList.add('miss');
  sfxNo();
  if (GAME.miss >= 2) glowRight();
}
function findRightEl(){
  var q = GAME.queue[GAME.i];
  if (!q) return null;
  var all = document.querySelectorAll('#gameField .g-item'), i;
  for (i = 0; i < all.length; i++){
    if (all[i].getAttribute('data-w') === q.w) return all[i];
  }
  return null;
}
function glowRight(){
  var el = findRightEl();
  if (!el || !el.classList) return;
  el.classList.remove('glow');
  void el.offsetWidth;   /* 强制重排，让动画能重复触发 */
  el.classList.add('glow');
  setTimeout(function(){ el.classList.remove('glow'); }, 2200);
}
function gameHint(){
  if (GAME.locked) return;
  glowRight();
  readAsk();
  toast('看这个发光的');
}

/* ============================ 结束 ============================ */
function gameOver(){
  GAME.locked = true;
  clearGameTimer();
  var total = GAME.queue.length, done = GAME.done, i, txt = '';
  var stars = (done >= total) ? 3 : (done >= Math.ceil(total * 0.7) ? 2 : (done > 0 ? 1 : 0));
  for (i = 0; i < 3; i++) txt += (i < stars) ? '★' : '☆';

  var field = $('gameField');
  var box = mk('div', 'game-over');
  box.id = 'gameOverBox';
  box.appendChild(mk('div', 'go-title', done >= total ? '全部找到啦！' : '这一轮结束'));
  box.appendChild(mk('div', 'go-stars', txt));
  box.appendChild(mk('div', 'go-sub', '找到 ' + done + ' / ' + total + ' 个，得了 ' + GAME.score + ' 分'));

  var btns = mk('div', 'go-btns');
  var b1 = mk('button', 'primary', '再玩一次');
  var b2 = mk('button', 'secondary', '换个玩法');
  var b3 = mk('button', 'secondary', '回乐园');
  b1.type = 'button'; b2.type = 'button'; b3.type = 'button';
  b1.addEventListener('click', function(){
    var o = GAME.origin;
    if (o) startGame(o.kind, o.chars);
  });
  b2.addEventListener('click', function(){
    var o = GAME.origin, next = GAME_KEYS[0], k;
    if (o){
      for (k = 0; k < GAME_KEYS.length; k++){
        if (GAME_KEYS[k] !== o.kind){ next = GAME_KEYS[k]; break; }
      }
      startGame(next, o.chars);
    }
  });
  b3.addEventListener('click', function(){ quitGame(true); });
  btns.appendChild(b1); btns.appendChild(b2); btns.appendChild(b3);
  box.appendChild(btns);
  field.appendChild(box);
  sfxWin();
}

/* ============================ 事件 ============================ */
function gotoNav(to){
  sayStop();
  if (to === 'pick'){ leaveStudent(true); return; }
  renderLearn();
  showScreen('learn');
}
function playAll(){
  var src = LEARN.list, i, g0, one = [];
  if (!src || !src.length){ toast('这一册还没有可以玩的字'); return; }
  /* 「全部」模式下别跨年级混抽，按第一个册次来，难度才不会跳 */
  if (!LEARN.q && LEARN.stage === ''){
    g0 = learnGroups().order[0];
    for (i = 0; i < src.length; i++){ if (src[i].g === g0) one.push(src[i]); }
    if (one.length){ src = one; }
  }
  startGame('random', shuffleArr(src).slice(0, 8));
  toast('从「' + ((src[0] && src[0].g) || '当前字表') + '」抽了 8 个字');
}
function toggleMute(){
  AV.sfx = !AV.sfx;
  avSave();
  $('gameMute').textContent = AV.sfx ? '音效开' : '音效关';
  if (AV.sfx) sfxTap();
}

function wireLearn(){
  var si = $('learnSearch');
  var deb = null;
  si.addEventListener('input', function(){
    if (deb) clearTimeout(deb);
    deb = setTimeout(function(){
      deb = null;
      LEARN.q = si.value;
      renderLearn();
    }, 180);
  });
  si.addEventListener('keydown', function(ev){
    if (ev.key === 'Enter'){
      LEARN.q = si.value;
      renderLearn();
      readAsk();
    }
  });
  $('learnClear').addEventListener('click', function(){
    si.value = '';
    LEARN.q = '';
    renderLearn();
    si.focus();
  });
  $('btnPlayAll').addEventListener('click', playAll);
  $('gameQuit').addEventListener('click', function(){ quitGame(true); });
  $('gameHint').addEventListener('click', gameHint);
  $('gameSpk').addEventListener('click', readAsk);
  $('gameMute').addEventListener('click', toggleMute);
  $('sheetClose').addEventListener('click', closeCard);
  $('sheetSpeak').addEventListener('click', function(){
    /* 和自动朗读一致：字 → 停一下 → 组词，避免手动点听和自动听节奏不一样 */
    if (!CARD_CH) return;
    avUnlock();
    var wd = wordOf(CARD_CH);
    if (wd) saySeq([{ t: CARD_CH.w, gap: PACE.afterChar }, { t: wd }]);
    else saySeq([{ t: CARD_CH.w }]);
  });
  $('sheetRead').addEventListener('click', togglePinyinOnly);
  soWire();                        /* v27：学字卡里的「描写这个字」与笔顺面板 */
  $('cardMask').addEventListener('click', function(ev){
    if (ev.target === $('cardMask')) closeCard();
  });
  document.addEventListener('keydown', function(ev){
    if (ev.key !== 'Escape') return;
    /* 描写面板压在学字卡上面，Esc 要一层一层退 */
    if ($('traceMask') && !$('traceMask').hidden){ closeTrace(); return; }
    if (!$('cardMask').hidden){ closeCard(); return; }
    if (STATE.phase === 'game') quitGame(true);
  });

  document.addEventListener('click', function(ev){
    var t = ev.target;
    if (!t || !t.closest) return;
    var el = t.closest('[data-nav]');
    if (el){ gotoNav(el.getAttribute('data-nav')); return; }
    el = t.closest('.stage-chip');
    if (el){
      LEARN.stage = el.getAttribute('data-g');
      LEARN.q = '';
      $('learnSearch').value = '';
      renderLearn();
      return;
    }
    el = t.closest('.ch-card');
    if (el){
      var i = parseInt(el.getAttribute('data-i'), 10);
      if (!isNaN(i)) openCard(LEARN.list[i]);
      return;
    }
    el = t.closest('[data-gk]');
    if (el){
      if (!CARD_CH){ toast('先选一个字'); return; }
      startGame(el.getAttribute('data-gk'), [CARD_CH]);
      return;
    }
    el = t.closest('#gameField .g-item');
    if (el){ gamePick(el); return; }
  });
}
