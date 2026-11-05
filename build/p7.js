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
  stage: null,     /* null = 还没初始化；'' = 该年级全部册次（或全部册次） */
  grade: null,     /* v37：null/'' = 全部年级；'一'..'六' = 只看这个年级。两级的第一级 */
  q: '',
  list: [],
  mode: 'read'     /* v36：'read' = 认字（点字卡进学字卡）；'play' = 游戏乐园（先选玩法再挑字） */
};
var CARD_CH = null;
/* v35：先选游戏再选字（T-030）。on = 正在挑字；kind = 已选的玩法；list = 挑中的字（按 w 去重） */
var PICK = { on: false, kind: '', list: [] };

/* ============================ 册次 ============================ */
/* v37：22 个册次原来是横着一长条、要拉三四屏（六年级 230 个字全压在最后），
   《生活语文生字》的老师常教高年级，每天都要拉到最底。改成两级：
   先点年级（一～六，一行 7 个胶囊放得下），再点这个年级的册次（最多 4 个，一屏内）。 */
var GRADES = ['一', '二', '三', '四', '五', '六'];
function gradeOf(g){
  var m = /^([一二三四五六])年级/.exec(String(g || ''));
  return m ? m[1] : '';
}
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
    } else if (LEARN.stage){
      if (c.g !== LEARN.stage) continue;
    } else if (LEARN.grade){
      /* v37：只选了年级，就把这个年级的 2~4 个册次全算上（六年级 230 个字） */
      if (gradeOf(c.g) !== LEARN.grade) continue;
    }
    out.push(c);
  }
  return out;
}

/* ============================ 乐园渲染 ============================ */
/* 第一级：年级（全部 + 一～六）。七个胶囊一行放得下，不用滚。 */
function renderGradeChips(groups){
  var cnt = {}, i, g, html, on;
  for (i = 0; i < groups.order.length; i++){
    g = gradeOf(groups.order[i]);
    if (!g) continue;
    cnt[g] = (cnt[g] || 0) + groups.cnt[groups.order[i]];
  }
  /* 字表换过（导入备份 / 词库兜底）后，原来选的年级可能已经不存在了：
     退回「全部」，别停在一个空年级上——第二级会列出「全年级 0」，字格也空着。 */
  if (LEARN.grade && !cnt[LEARN.grade]){ LEARN.grade = ''; LEARN.stage = ''; }
  /* 搜索是跨册次的临时态：这时候「全部」亮着，年级和册次都不亮，
     册次行也收起——否则会出现「亮着『一年级』但列出 700 个字里搜到的字」。 */
  on = (LEARN.q || !LEARN.grade) ? ' on' : '';
  html = '<button type="button" class="grade-chip' + on + '" data-grade="">全部</button>';
  for (i = 0; i < GRADES.length; i++){
    g = GRADES[i];
    if (!cnt[g]) continue;   /* 这个年级一个字都没有就不出现，免得点进去是空的 */
    on = (!LEARN.q && LEARN.grade === g) ? ' on' : '';
    html += '<button type="button" class="grade-chip' + on + '" data-grade="' + g + '">' + g + '</button>';
  }
  setHTML($('gradeStrip'), html);
}

/* 第二级：这个年级的册次（最多 4 个 + 一句「全年级」）。没选年级时整条收起。 */
function renderStageChips(groups){
  var box = $('stageStrip');
  if (!box) return;
  if (LEARN.q || !LEARN.grade){ box.hidden = true; setHTML(box, ''); return; }
  box.hidden = false;
  var tot = 0, i, g, html, on;
  for (i = 0; i < groups.order.length; i++){
    if (gradeOf(groups.order[i]) === LEARN.grade) tot += groups.cnt[groups.order[i]];
  }
  on = (LEARN.stage === '') ? ' on' : '';
  html = '<button type="button" class="stage-chip' + on + '" data-g="">全年级<b>' + tot + '</b></button>';
  for (i = 0; i < groups.order.length; i++){
    g = groups.order[i];
    if (gradeOf(g) !== LEARN.grade) continue;
    on = (LEARN.stage === g) ? ' on' : '';
    html += '<button type="button" class="stage-chip' + on + '" data-g="' + esc(g) + '">' +
      esc(stageShort(g)) + '<b>' + groups.cnt[g] + '</b></button>';
  }
  setHTML(box, html);
}

function cardHTML(c, i){
  /* v35：选字态下每张卡多一个圆圈勾选框，已选的加 .sel（边框和字都变绿） */
  var sel = PICK.on && pickIdx(c) >= 0;
  return '<button type="button" class="ch-card' + (sel ? ' sel' : '') + '" data-i="' + i + '"' +
    (PICK.on ? ' aria-pressed="' + (sel ? 'true' : 'false') + '"' : '') + '>' +
    (PICK.on ? '<span class="ch-ck" aria-hidden="true"></span>' : '') +
    (hasArt(c) ? '<span class="ch-dot"></span>' : '') +
    '<span class="ch-big">' + esc(c.w) + '</span>' +
    '<span class="ch-py">' + esc(c.p || '') + '</span>' +
    '<span class="ch-wd">' + esc(firstWordOf(c)) + '</span>' +
    CLOSE('button');
}

function renderLearn(){
  var groups = learnGroups();
  if (LEARN.stage === null) LEARN.stage = '';
  if (LEARN.grade === null) LEARN.grade = '';
  renderGradeChips(groups);
  renderStageChips(groups);

  /* v36：两种模式共用这一屏的搜索、册次和字格。
     play 模式还没选玩法时，先把下面整块收起来——第一屏只有玩法卡，
     也免得「点了字卡却弹出学字卡」这种走错门的感觉。 */
  var playIdle = (LEARN.mode === 'play' && !PICK.on);
  var t = $('learnTitle'), sub = $('learnSub');
  if (t) t.textContent = LEARN.mode === 'play'
    ? (PICK.on ? '挑几个字' : '挑一个玩法') : '一起认字';
  if (sub) sub.textContent = LEARN.mode === 'play'
    ? (PICK.on ? '点字卡选上，勾好就点右下角的「开始练习」。'
               : '先选一个玩法，再挑要练的字。可以一次挑好几个，也能跨册次。')
    : '搜一个字，或者选一个册次，挑一个字来玩';
  if ($('gamePick')) $('gamePick').hidden = !playIdle;
  if ($('gameNow')) $('gameNow').hidden = !(LEARN.mode === 'play' && PICK.on);
  if ($('learnBody')) $('learnBody').hidden = playIdle;

  if ($('gnName')) $('gnName').textContent = pickLabel(PICK.kind);

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
  /* v36：原来这行是「全部 700 个字 + 两个按钮」，按钮搬走后只剩一句统计，
     又和上面册次条里的「全部 700」重复。只在搜索时留一句「搜到 N 个字」，
     其余时候不占位置。 */
  $('learnCount').hidden = !LEARN.q;
  $('learnCount').textContent = LEARN.q ? ('搜到 ' + list.length + ' 个字') : '';
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
/* v28：原来有「只看拼音」按钮，老师反馈用不上、孩子也不需要，去掉；
   想只听不看字就直接点喇叭。 */

/* ============================ 音效 ============================
   tone / sfxOk / sfxNo / sfxWin 都在 p8.js（和练习台共用一套），
   这里只留游戏自己的状态。
   ============================================================== */
var GAME = {
  kind: '', queue: [], origin: null, i: 0,
  score: 0, done: 0, miss: 0, combo: 0,
  /* oneTry = 一次就点对的题数，retried = 点错过才找到的题数。
     v39 起正确率按 oneTry / 总题数算 —— 错一遍再对不能还是 100%。 */
  oneTry: 0, retried: 0,
  caught: 0, seq: 0,
  locked: true, timer: null
};

/* ============================ 游戏启动 ============================ */
var GAME_NAMES = { bubble: '戳泡泡', fish: '钓鱼', fruit: '摘果子', feed: '喂小动物', dict: '听写' };
/* 「随便玩」「换个玩法」只在四款场景游戏里转：听写不是场景，不参与随机 */
var GAME_KEYS = ['bubble', 'fish', 'fruit', 'feed'];
/* 听写的临时状态（不进 GAME 是因为它跟「这一题」绑，和计分不是一回事）。
   看一眼限 3 秒、每题一次；checked 表示已经点过「写好了」、正等着人核对。 */
var GDICT = { peeked: false, checked: false, timer: null };

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
  GAME.oneTry = 0;
  GAME.retried = 0;
  GAME.caught = 0;
  GAME.animal = null;
  GAME.locked = true;

  closeCard();
  avUnlock();
  sayStop();
  GDICT.peeked = false;
  GDICT.checked = false;
  if (GDICT.timer){ clearTimeout(GDICT.timer); GDICT.timer = null; }
  /* 听写这一屏的「答案」就是那个字：标头上的字与拼音、以及会点亮答案的「提示」
     都得收起来，不然等于把答案印在题目上（用 class 切，别逐题改 display）。 */
  var sc = $('scrGame');
  if (sc && sc.classList) sc.classList.toggle('is-dict', kind === 'dict');
  $('gameAskLabel').textContent = (kind === 'dict') ? '听一听，写下来' : '找到这个字';
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
  if (GDICT.timer){ clearTimeout(GDICT.timer); GDICT.timer = null; }
  GDICT.peeked = false;
  GDICT.checked = false;
  var sc = $('scrGame');
  if (sc && sc.classList) sc.classList.remove('is-dict');
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
  GDICT.peeked = false;
  GDICT.checked = false;
  if (GDICT.timer){ clearTimeout(GDICT.timer); GDICT.timer = null; }
  $('gameProg').textContent = (GAME.i + 1) + ' / ' + GAME.queue.length;
  $('gameScore').textContent = String(GAME.score);
  $('gameAskWord').textContent = q.w;
  $('gameAskPy').textContent = q.p || '';

  var field = $('gameField');
  field.className = 'game-field g-' + GAME.kind;
  field.setAttribute('data-kind', GAME.kind);
  if (GAME.kind === 'dict'){
    setHTML(field, dictScene());
    wgInit(field, 'gDictRow', dictFit());
  } else {
    var opts = gameOpts(q);
    if (GAME.kind === 'bubble') setHTML(field, bubbleScene(opts));
    else if (GAME.kind === 'fish') setHTML(field, fishScene(opts));
    else if (GAME.kind === 'fruit') setHTML(field, fruitScene(opts));
    else setHTML(field, feedScene(q, opts));
  }
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
  /* 听写：只报「写下来」+ 那个字。整句「听一听，写下来。」有整句录音（q_dict），
     不用另录；写不出来自己也点「看一眼」，不靠读题念答案。 */
  if (kind === 'dict') return [{ t: '听一听，写下来。', gap: PACE.afterAsk }, { t: w }];
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
  /* 听写屏上那个位置是空的（字和拼音都收起来了），readHint 会把答案又摆出来 */
  if (GAME.kind === 'dict') return;
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
/* 钩子在 .rod 里的相对位置（viewBox 150×110，钩子画在 116,88）。
   用比例而不是死像素：竿子尺寸以后调了，线还能搭在钩上。 */
var ROD_HOOK = { x: 116 / 150, y: 88 / 110 };
/* 钓鱼点对以后：线从竿尖甩出去搭到鱼身上，鱼顺着这条线被提到竿尖，再收进鱼篓。
   老师 2026-11-05：「能不能在学生点对之后，这个钓竿的线拉到鱼上把学生钓上来呢」。
   几何：线锚在竿尖，长度 = 竿尖到鱼心的距离；收线靠 scaleY，鱼同时沿同一条线
   平移到竿尖，两边共用一条缓动，所以线头始终贴着鱼，不用逐帧算。
   全程只动 transform / 不动 width/height/top/left，也不挂 rAF。 */
function fishReel(el, fr){
  var field = $('gameField');
  if (!field || !el) return;
  var i, node;
  /* 先停掉游泳动画：CSS 关键帧的 transform 优先级高于 inline transform，不停掉下面
     设的位移根本不生效。停完再量——游泳会让鱼左右浮 ±20px，把浮动偏移算进端点，
     线就会搭在鱼旁边。 */
  el.style.animation = 'none';
  void el.offsetWidth;   /* 先把「停掉浮动」落实到布局，再量；否则量到的还是浮动中的位置，线会差出一截 */
  var er = el.getBoundingClientRect();
  var bx = er.left - fr.left + er.width / 2;
  var by = er.top - fr.top + er.height / 2;
  /* 竿尖：有 .rod 就按它的实际盒子换算，拿不到就退回样式里的默认值（left/top -6px、150×110） */
  var tip = { x: -6 + 150 * ROD_HOOK.x, y: -6 + 110 * ROD_HOOK.y };
  var rod = field.querySelector('.rod');
  if (rod && rod.getBoundingClientRect){
    var rr = rod.getBoundingClientRect();
    if (rr.width && rr.height){
      tip = { x: rr.left - fr.left + rr.width * ROD_HOOK.x,
              y: rr.top - fr.top + rr.height * ROD_HOOK.y };
    }
  }
  /* ax/ay = 竿尖 → 鱼心（线的方向）；收线时鱼要往反方向走，所以下面用 -ax/-ay。
     这两个方向别写混：写成「鱼 → 竿尖」的话线会朝反方向甩出去，
     而竿子上本来就画着一条 57px 的装饰线，贴着鱼看很像"连上了"，很容易误判（第一版就栽在这）。 */
  var ax = bx - tip.x, ay = by - tip.y;
  var len = Math.max(24, Math.sqrt(ax * ax + ay * ay));
  /* 线是一根从竿尖往下长的 div，默认朝 +y（正下方、屏幕角 90°）。CSS 的正角度是顺时针，
     所以 rotate 的角度 = 方向角 - 90°。 */
  var deg = Math.atan2(ay, ax) * 180 / Math.PI - 90;
  var line = mk('div', 'reel-line');
  line.style.left = tip.x + 'px';
  line.style.top = tip.y + 'px';
  line.style.height = len + 'px';
  line.style.transform = 'rotate(' + deg.toFixed(2) + 'deg) scaleY(.02)';
  field.appendChild(line);
  void line.offsetWidth;   /* 强制回流，否则起始值和目标值被合成一帧、线不会甩出去 */
  line.style.transform = 'rotate(' + deg.toFixed(2) + 'deg) scaleY(1)';

  /* 180ms：钩住了 —— 原地炸一朵水花，然后鱼和线一起收短，鱼被拉到竿尖 */
  setTimeout(function(){
    if (line.classList) line.classList.add('pull');
    line.style.transform = 'rotate(' + deg.toFixed(2) + 'deg) scaleY(' + (6 / len).toFixed(4) + ')';
    for (i = 0; i < 6; i++){
      var ang = (Math.PI * 2 / 6) * i + Math.random() * 0.6;
      var dist = 26 + Math.random() * 40;
      node = mk('span', 'catch-splash');
      node.style.left = bx + 'px';
      node.style.top = by + 'px';
      node.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      node.style.setProperty('--dy', (Math.sin(ang) * dist - 18) + 'px');
      node.style.animationDelay = (i * 0.02) + 's';
      field.appendChild(node);
      (function(n){
        setTimeout(function(){ if (n.parentNode) n.parentNode.removeChild(n); }, 700);
      })(node);
    }
    el.style.transition = 'transform .54s cubic-bezier(.45,.05,.55,.95)';
    el.style.transform = 'translate(' + (-ax).toFixed(1) + 'px,' + (-ay).toFixed(1) + 'px) rotate(-14deg) scale(.34)';
  }, 180);

  /* 760ms：到竿尖了，化掉（鱼篓里那颗在 gameFx 里已经加过，别重复加）。
     卡在 880ms 之内——gameAward() 到时候会推下一题、整块重渲染。 */
  setTimeout(function(){
    if (line.parentNode) line.parentNode.removeChild(line);
    el.style.transition = 'opacity .14s linear';
    el.style.opacity = '0';
  }, 760);
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

/* ---------------------------- 听写（v40） ----------------------------
   练习页的「汉字听写」是 .wg-box + canvas + .hw-acts 那套，这里原样复用，
   只是不写学习记录（游戏乐园刻意不污染测评成绩），也没有老师辅助栏。
   判分同样不靠识别：亮出答案、人对着看，写对了自己点「写对了」。 */
function dictFit(){
  /* 游戏场子比练习页矮：场高 clamp(320px, 100vh-250, 620px)。
     格子以外还要放下「一句说明 + 四个按钮（窄屏是 2×2）」实测 179px，
     所以按 h-190 留余量；量不到高度（jsdom）时退回 300。 */
  var f = $('gameField'), h = f ? (f.clientHeight || 0) : 0, cap = h ? (h - 190) : 300;
  if (cap > 300) cap = 300;
  if (cap < 120) cap = 120;
  return cap;
}
function dictFootHTML(){
  return '<p class="hw-tip">想不起来就点「看一眼」，3 秒后自己合上</p>' +
    '<div class="hw-acts four">' +
      '<button type="button" class="hw-btn" data-dact="say">再听一遍</button>' +
      '<button type="button" class="hw-btn peek" data-dact="peek"' +
        (GDICT.peeked ? ' disabled' : '') + '>' +
        (GDICT.peeked ? '看过了' : '看一眼') + CLOSE('button') +
      '<button type="button" class="hw-btn" data-dact="clear">' + ICO_ERASE + '擦掉' + CLOSE('button') +
      '<button type="button" class="hw-btn main" data-dact="done">写好了' + CLOSE('button') +
    CLOSE('div');
}
function dictScene(){
  return '<div class="wg-row" id="gDictRow">' + wgBoxHTML(0, '') + CLOSE('div') +
    '<div id="gDictFoot">' + dictFootHTML() + CLOSE('div');
}
/* 亮答案（看一眼 / 写好了 都用它）。不能借练习页的 wgReveal —— 那个读 STATE.quiz，
   游戏里 STATE.quiz 是 null，共用只会静默什么都不做。 */
function dictReveal(peek){
  var q = GAME.queue[GAME.i], b = WG.boxes[0], el;
  if (!q || !b) return;
  el = b.el.querySelector('.wg-ans');
  if (el) el.textContent = q.w;
  if (b.el.classList){
    b.el.classList.add('reveal');
    if (peek) b.el.classList.add('peek');
  }
}
function dictHideAns(){
  var b = WG.boxes[0], el;
  if (!b) return;
  el = b.el.querySelector('.wg-ans');
  if (el) el.textContent = '';
  if (b.el.classList){ b.el.classList.remove('reveal'); b.el.classList.remove('peek'); }
}
function dictPeek(){
  if (GDICT.peeked || GDICT.checked || GAME.locked) return;
  GDICT.peeked = true;
  dictReveal(true);
  sfxTap();
  setHTML($('gDictFoot'), dictFootHTML());     /* 按钮当场变成「看过了」 */
  GDICT.timer = setTimeout(function(){
    GDICT.timer = null;
    if (!GDICT.checked) dictHideAns();         /* 3 秒到就自己合上，没核对就收走 */
  }, 3000);
}
function dictDone(){
  if (GAME.locked || GDICT.checked) return;
  if (!wgHasInk()){ sfxTap(); toast('先在方格里写一写'); return; }
  GDICT.checked = true;
  if (GDICT.timer){ clearTimeout(GDICT.timer); GDICT.timer = null; }
  dictReveal(false);
  setHTML($('gDictFoot'),
    '<p class="hw-tip">对照一下，写对了吗</p>' +
    '<div class="hw-acts">' +
      '<button type="button" class="hw-btn main" data-dact="ok">写对了' + CLOSE('button') +
      '<button type="button" class="hw-btn" data-dact="miss">没写好，重写' + CLOSE('button') +
    CLOSE('div'));
  sfxPop();
  toast('对照一下，写对了吗');
}
function dictOk(){
  if (!GDICT.checked || GAME.locked) return;
  GAME.locked = true;
  gameAward();
}
function dictMiss(){
  if (!GDICT.checked) return;
  /* 重写＝这一题没一次写对：只记 miss，不判死也不结束题目。
     GAME.miss 会被 gameAward 读成「这题重写过」，正确率照 v39 的口径降下来。 */
  GAME.miss++;
  GAME.combo = 0;
  sfxNo();
  GDICT.checked = false;
  wgClear();
  dictHideAns();
  setHTML($('gDictFoot'), dictFootHTML());
  toast('再写一次，慢慢来');
  setTimeout(function(){
    if (!GAME.locked && GAME.queue[GAME.i]) readAsk();
  }, 520);
}
function dictClear(){
  if (GAME.locked) return;
  wgClear();
  sfxTap();
}
function dictAct(act){
  if (act === 'say'){ readAsk(); return; }
  if (act === 'peek'){ dictPeek(); return; }
  if (act === 'clear'){ dictClear(); return; }
  if (act === 'done'){ dictDone(); return; }
  if (act === 'ok'){ dictOk(); return; }
  if (act === 'miss'){ dictMiss(); return; }
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

  /* 钓鱼：线甩出去、把鱼提到竿尖（水花在「钩住」那一刻才炸，落在 fishReel 里） */
  if (kind === 'fish') fishReel(el, fr);

  /* 泡泡炸成水珠 */
  if (kind === 'bubble'){
    var cls = 'bub-bit';
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
/* 计分只有这一处，四款游戏和听写都走它。
   一次就对才算「对」：这一题错过（GAME.miss > 0）再对，只算找到、不算答对。
   老师 2026-11-04：「点错了后来再点对，最后还是显示 100% 正确率，有点不对吧」。
   GAME.miss 在 gameQuestion() 里每题清零，所以它天然就是「这一题错了几次」。 */
function gameAward(){
  GAME.combo++;
  GAME.done++;
  if (GAME.miss > 0) GAME.retried++; else GAME.oneTry++;
  GAME.score += 10 + Math.min(GAME.combo - 1, 5) * 2;
  $('gameScore').textContent = String(GAME.score);
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
function gameRight(el){
  GAME.locked = true;
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
  gameAward();
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
  /* 正确率 = 一次就点对的题数 / 总题数，口径与班级练习的结算页一致。
     v38 之前这里只看 GAME.done（答对就 +1），点错一遍再点对也是满星满分，
     老师看的是「全部找到啦 + 三颗星 + 100%」，等于作弊的满分。 */
  var one = GAME.oneTry;
  var rate = total ? Math.round(one * 100 / total) : 0;
  var stars = (rate >= 90) ? 3 : (rate >= 70 ? 2 : (rate >= 40 ? 1 : 0));
  for (i = 0; i < 3; i++) txt += (i < stars) ? '★' : '☆';

  /* 听写说「写对」，四款场景游戏说「找到」——同一件事，孩子听的话不一样 */
  var isDict = (GAME.kind === 'dict');
  var note = (isDict ? '写了 ' : '找到 ') + done + ' / ' + total + ' 个';
  if (GAME.retried && done >= total) note += isDict ? '，有 ' + GAME.retried + ' 个是重写过的'
                                                   : '，有 ' + GAME.retried + ' 个是试了才找到的';
  else if (!GAME.retried && done >= total) note += isDict ? '，全是一次就写对的' : '，全是一次就找到的';

  var field = $('gameField');
  var box = mk('div', 'game-over');
  box.id = 'gameOverBox';
  box.appendChild(mk('div', 'go-title',
    rate >= 100 ? (isDict ? '全部一次就写对啦！' : '全部一次就找到啦！') : '这一轮结束'));
  box.appendChild(mk('div', 'go-stars', txt));
  box.appendChild(mk('div', 'go-sub', '正确率 ' + rate + '% · 得了 ' + GAME.score + ' 分'));
  box.appendChild(mk('div', 'go-note', note));

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
  learnMode(to === 'games' ? 'play' : 'read');
}
/* v36：认字 / 游戏乐园是同一屏的两个模式，不新建一屏——
   字格、搜索、册次筛选、勾选圆圈全部复用；另做一屏迟早两处走偏。 */
function learnMode(m){
  if (PICK.on) pickCancel();          /* 换模式先把选字态收干净 */
  LEARN.mode = m;
  renderLearn();
  showScreen('learn');
}
/* 「随便玩」：不挑字，从当前册次随机抽 8 个、玩法也随机。
   原来这是乐园顶部那个「全班一起玩」按钮，v36 挪成游戏乐园里的第五张卡——
   按钮点完根本不知道进的是哪款游戏，卡上至少写着「不用挑字，随机来一局」。 */
function stagePool(){
  var out = [], i, c, first, one = [];
  for (i = 0; i < STATE.chars.length; i++){
    c = STATE.chars[i];
    if (!c.on || !c.w) continue;
    if (LEARN.stage){
      if (c.g !== LEARN.stage) continue;
    } else if (LEARN.grade && gradeOf(c.g) !== LEARN.grade) continue;
    out.push(c);
  }
  /* 「全部」模式下别跨年级混抽，只取排在最前的那个册次，难度才不会跳。
     v37：选了年级时「最前」要在本年级里找，不能拿全库的第一个册次（一上）。 */
  if (!LEARN.stage && out.length){
    first = out[0].g;
    for (i = 0; i < out.length; i++){ if (byStage(out[i].g, first) < 0) first = out[i].g; }
    for (i = 0; i < out.length; i++){ if (out[i].g === first) one.push(out[i]); }
    if (one.length) out = one;
  }
  return out;
}
function playAny(){
  var src = stagePool();
  if (!src.length){ toast('这一册还没有可以玩的字'); return; }
  startGame('random', shuffleArr(src).slice(0, 8));
  toast('从「' + ((src[0] && src[0].g) || '当前字表') + '」抽了 8 个字');
}
/* ==================== 游戏乐园：先选玩法、再挑一批字（v35 / T-030，v36 改成独立入口） ====================
   同事的意见：「能否先选择游戏再去选练哪个字……这个字可以选很多个字，
   让学生针对性做这些字的练习」。
   原来只有一条路：点一个字 → 学字卡里挑玩法 → **一次玩一个字**，练 6 个要点 6 遍。
   现在顶部有「游戏乐园」：选玩法 → 字格进入「多选」态（册次筛选、搜索照旧能用，
   跨册次挑也认）→ 底部条「开始练习」。**选字态复用同一张字格**，不另做一份字表：
   老师已经会用册次和搜索筛，再教一套只会更乱。
   ======================================================================== */
function pickLabel(kind){
  return kind === 'any' ? '随便玩' : (GAME_NAMES[kind] || '游戏');
}
function pickIdx(c){
  var i;
  for (i = 0; i < PICK.list.length; i++) if (PICK.list[i].w === c.w) return i;
  return -1;
}
/* 只收拾状态、不画界面：startGame 会接管屏幕，多画一次反而闪 */
function pickEnd(){
  PICK.on = false;
  PICK.kind = '';
  PICK.list = [];
  document.body.classList.remove('picking');
  if ($('pickBar')) $('pickBar').hidden = true;
  if ($('gameNow')) $('gameNow').hidden = true;
  if ($('gamePick')) $('gamePick').hidden = (LEARN.mode !== 'play');
  if ($('learnBody')) $('learnBody').hidden = false;
}
function pickBegin(kind){
  if (!GAME_NAMES[kind]) return;
  PICK.on = true;
  PICK.kind = kind;
  PICK.list = [];
  document.body.classList.add('picking');
  $('pickBar').hidden = false;
  renderLearn();          /* 顺带收起玩法卡、顶部换成「钓鱼 · 换一个玩法」 */
  renderPickBar();
  /* 换模式回到字表顶上：勾选框长在字卡上，得让人看见它 */
  window.scrollTo(0, 0);
}
function pickCancel(){
  pickEnd();
  renderLearn();          /* 退回玩法卡那一步 */
}
function renderPickBar(){
  var n = PICK.list.length, nm = pickLabel(PICK.kind);
  if ($('pickNum')) $('pickNum').textContent = n ? (nm + ' · 已选 ' + n + ' 个字') : (nm + ' · 还没选字');
  if ($('pickHint')) $('pickHint').textContent = n
    ? '再点一下能取消，换册次还能接着挑'
    : '点字卡就能选上，可以选好几个';
  if ($('pickStart')){
    $('pickStart').disabled = !n;
    $('pickStart').textContent = n ? ('开始练习（' + n + '）') : '开始练习';
  }
}
function pickToggle(c){
  if (!c) return;
  var i = pickIdx(c);
  if (i >= 0) PICK.list.splice(i, 1); else PICK.list.push(c);
  renderPickBar();
}
function pickStart(){
  if (!PICK.list.length){ toast('先点几个字，再开始'); return; }
  var kind = PICK.kind, chars = PICK.list.slice(0);
  pickEnd();
  renderLearn();          /* 先退出选字态：下一局回来时字卡不该还带着勾 */
  startGame(kind, chars);
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
  /* v36：玩法卡是页面上的普通按钮，统一走点击委托里的 [data-gp]，
     这里只绑「换一个玩法」和底部条两个按钮。 */
  $('gnChange').addEventListener('click', pickCancel);
  $('pickCancel').addEventListener('click', pickCancel);
  $('pickStart').addEventListener('click', pickStart);
  $('gameQuit').addEventListener('click', function(){ quitGame(true); });
  $('gameHint').addEventListener('click', gameHint);
  $('gameSpk').addEventListener('click', readAsk);
  $('gameMute').addEventListener('click', toggleMute);
  $('sheetClose').addEventListener('click', closeCard);
  $('sheetSpeak').addEventListener('click', function(){
    /* 和自动朗读一致：字 → 停一下 → 组词，避免手动点听和自动听节奏不一样 */
    if (!CARD_CH) return;
    avUnlock();
    var wd = wordOf(CARD_CH), spk = this;
    if (wd) saySeq([{ t: CARD_CH.w, gap: PACE.afterChar }, { t: wd }]);
    else saySeq([{ t: CARD_CH.w }]);
    /* 喇叭响一下的视觉回馈：教室吵、孩子听不清时会再点，得看得出点到了 */
    spk.classList.remove('saying');
    void spk.offsetWidth;
    spk.classList.add('saying');
    setTimeout(function(){ spk.classList.remove('saying'); }, 720);
  });
  /* v28：汉字本身就是描写入口（点字 → 看笔顺 → 照着描），不再单开一条大横框。
     字有 86px，是这张卡上最大的点击目标，特需孩子也不用瞄准。 */
  $('sheetChar').addEventListener('click', function(){ openTrace(CARD_CH); });
  $('sheetChar').addEventListener('keydown', function(ev){
    var k = ev.key;
    if (k !== 'Enter' && k !== ' ' && k !== 'Spacebar') return;
    ev.preventDefault();
    openTrace(CARD_CH);
  });
  soWire();                        /* v27：描写入口与笔顺面板 */
  $('cardMask').addEventListener('click', function(ev){
    if (ev.target === $('cardMask')) closeCard();
  });
  document.addEventListener('keydown', function(ev){
    if (ev.key !== 'Escape') return;
    /* 描写面板压在学字卡上面，Esc 要一层一层退 */
    if ($('traceMask') && !$('traceMask').hidden){ closeTrace(); return; }
    if (PICK.on){ pickCancel(); return; }
    if (!$('cardMask').hidden){ closeCard(); return; }
    if (STATE.phase === 'game') quitGame(true);
  });

  document.addEventListener('click', function(ev){
    var t = ev.target;
    if (!t || !t.closest) return;
    var el = t.closest('[data-nav]');
    if (el){ gotoNav(el.getAttribute('data-nav')); return; }
    el = t.closest('.grade-chip');
    if (el){
      /* v37：换年级时册次归零——「六上·写」不能留在「一年级」里，否则字格是空的 */
      LEARN.grade = el.getAttribute('data-grade') || '';
      LEARN.stage = '';
      LEARN.q = '';
      if ($('learnSearch')) $('learnSearch').value = '';
      renderLearn();
      return;
    }
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
      if (isNaN(i)) return;
      var c = LEARN.list[i];
      /* v35：选字态里点字卡是「勾上/取消」，不是打开学字卡 */
      if (PICK.on){
        if (!c) return;
        pickToggle(c);
        var sel = pickIdx(c) >= 0;
        el.classList.toggle('sel', sel);
        el.setAttribute('aria-pressed', sel ? 'true' : 'false');
        return;
      }
      openCard(c);
      return;
    }
    el = t.closest('[data-gp]');
    if (el){
      var gp = el.getAttribute('data-gp');
      if (gp === 'any') playAny(); else pickBegin(gp);
      return;
    }
    el = t.closest('[data-gk]');
    if (el){
      if (!CARD_CH){ toast('先选一个字'); return; }
      startGame(el.getAttribute('data-gk'), [CARD_CH]);
      return;
    }
    el = t.closest('#gameField [data-dact]');
    if (el){ dictAct(el.getAttribute('data-dact')); return; }
    el = t.closest('#gameField .g-item');
    if (el){ gamePick(el); return; }
  });
}
