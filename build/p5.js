/* =====================================================================
   视图层：选人页 / 练习页 / 题型引擎
   ===================================================================== */

function shuffleArr(a){
  var out = [], i;
  for (i = 0; i < a.length; i++) out.push(a[i]);
  var idx = jitter(out.length), res = [];
  for (i = 0; i < idx.length; i++) res.push(out[idx[i]]);
  return res;
}
function copyArr(a){
  var out = [], i;
  for (i = 0; i < a.length; i++) out.push(a[i]);
  return out;
}

/* ------------------------- 视图切换 ------------------------- */
function showScreen(name){
  STATE.phase = name;
  $('scrLearn').hidden = (name !== 'learn');
  $('scrPick').hidden = (name !== 'pick');
  $('scrPlay').hidden = (name !== 'play');
  $('scrTeacher').hidden = (name !== 'teacher');
  $('scrGame').hidden = (name !== 'game');
  var nav = $('mainNav'), nb, i, to, on;
  if (nav) nav.hidden = !(name === 'learn' || name === 'pick');
  nb = document.querySelectorAll('#mainNav .nav-btn');
  for (i = 0; i < nb.length; i++){
    to = nb[i].getAttribute('data-nav');
    on = (name === 'learn' && to === 'learn') || (name === 'pick' && to === 'pick');
    if (on) nb[i].classList.add('on'); else nb[i].classList.remove('on');
  }
  window.scrollTo(0, 0);
}

/* ------------------------- 选人页 ------------------------- */
function renderPick(){
  var grid = $('stuGrid'), html = '', i, s;
  var live = [];
  for (i = 0; i < STATE.students.length; i++){
    if (STATE.students[i].status !== '暂停') live.push(STATE.students[i]);
  }
  $('pickEmpty').hidden = STATE.students.length > 0;
  $('btnGoLearn').hidden = STATE.students.length > 0;
  for (i = 0; i < live.length; i++){
    s = live[i];
    html += '<button type="button" class="stu-card" data-stu="' + esc(s.name) + '">' +
      avatarHTML(s, 'stu-av') +
      TAG_STU_NM + esc(s.name) + CLOSE('span') +
      '<span class="stu-tag">' + (s.types.length ? esc(s.types.join(' · ')) : '还没排练习') + '</span>' +
      CLOSE('button');
  }
  setHTML(grid, html);
}

/* ------------------------- 练习页 ------------------------- */
function enterStudent(name){
  var i, found = null;
  for (i = 0; i < STATE.students.length; i++){
    if (STATE.students[i].name === name) found = STATE.students[i];
  }
  if (!found){ toast('找不到这个学生'); return; }
  STATE.cur = found;
  STATE.curType = found.types.length ? found.types[0] : '';
  /* 从老师端「抽练」进来的，返回键要说清回哪儿 */
  if ($('btnBackPick')) $('btnBackPick').textContent = STATE.fromTeacher ? '回老师端' : '换人';
  try { localStorage.setItem(LS_LAST, name); } catch (e) {}
  sayStop();
  renderPlayHeader();
  renderTypeTabs();
  showScreen('play');
  /* v18：进来先看今天的字卡，一张一张读过再做题（用户要求放在所有个人练习之前）。
     题型标签仍然可以点，点一下就跳过预习直接开题，老师赶时间时不必走这一步。 */
  syncActive(found);          /* 在学名单先摆正：已达标的退出、从待学补位 */
  preReset(found.name);
  renderPreStudy();
}
function leaveStudent(clearScreen){
  STATE.cur = null; STATE.quiz = null; STATE.curType = '';
  QUIZ_FOCUS = null;
  renderDrillBar(null);
  if ($('btnBackPick')) $('btnBackPick').textContent = '换人';
  if (clearScreen){
    /* 共用电脑是公开屏幕：把上一个人的所有痕迹擦干净 */
    setHTML($('stage'), '');
    setHTML($('playAvatar'), '');
    setHTML($('typeTabs'), '');
    $('playName').textContent = '';
    $('qNow').textContent = '0';
    $('qTotal').textContent = '0';
    $('btnRight').hidden = true;
    $('btnHint').disabled = true;
    sayStop();
  }
  renderPick();
  showScreen('pick');
}
function renderPlayHeader(){
  var s = STATE.cur;
  var av = s.photo || s.photoLocal || '';
  setHTML($('playAvatar'), av ? '<img src="' + esc(av) + '" alt="" width="46" height="46">' : esc((s.name || '?').slice(0, 1)));
  $('playName').textContent = s.name;
}
function renderTypeTabs(){
  var s = STATE.cur, html = '', i;
  for (i = 0; i < s.types.length; i++){
    html += '<button type="button" class="type-tab' + (s.types[i] === STATE.curType ? ' on' : '') + '" data-type="' + esc(s.types[i]) + '">' + esc(s.types[i]) + CLOSE('button');
  }
  setHTML($('typeTabs'), html);
  var stage = $('stage');
  if (stage) stage.setAttribute('data-sp-bindable', 'database');
  if (stage) stage.setAttribute('data-sp-database-id', DATABASE_ID);
}
function renderNoType(){
  setHTML($('stage'), '<div class="empty-tip">这位同学还没有分配练习题型。请老师点右上角「老师」（长按约 1 秒）进去勾选题型。</div>');
  $('qNow').textContent = '0';
  $('qTotal').textContent = '0';
}

/* ------------------------- 今日字卡（做题前先认一遍） -------------------------
   用户 2026-10-23：「识字启蒙台显示学生每天要学的字在一个界面，可以让学生整体复习学习一遍，
   放在所有学生个人练习之前。点进学生后，应让学生看今天所学的字卡，每个读一下，再去做练习。」
   要点：字单不另立一套算法 —— 和出题共用 pickTargets + 每日题量，
   所以预习看到的字就是这一轮练习会抽到的字（同权重桶，顺序可能不同）。
   另存一份「今日字单」只会在字表或记录变化后悄悄分叉。 */
var PRE = { list: [], read: {}, name: '' };

function preReset(name){
  PRE = { list: [], read: {}, name: name || '' };
}
/* 预习态还没开题，「提示一下 / 读对了 / 跳过这题」按了也没反应（useHint 里就 return 了），
   对特需孩子来说「按了没动静」比没有按钮更糟，所以直接藏起来。 */
function preMode(on){
  var play = $('scrPlay');
  if (!play || !play.classList) return;
  if (on) play.classList.add('is-pre'); else play.classList.remove('is-pre');
}
/* 组词栏可能是「大人、太阳」，取第一个当卡片上的示例词 */
function firstWordOf(c){
  var s = String((c && c.words) || '').split(/[、，,；;\/|]/)[0];
  return s ? s.trim() : '';
}
function todayChars(stu){
  var pool = charsOf(stu), map = {}, i, out = [], act;
  /* 老师临时指定的抽练：以老师选的为准，不看在学名单 */
  if (QUIZ_FOCUS && QUIZ_FOCUS.length){
    for (i = 0; i < pool.length; i++){
      if (QUIZ_FOCUS.indexOf(pool[i].w) >= 0) out.push(pool[i]);
    }
    if (out.length) return out;
  }
  /* 其余情况就是「在学的那几个字」——v19 起由状态机维护（上限＝stu.count），
     练习练到「已掌握」会自动换下一个上来，不用老师手动改字表。 */
  act = stuActive(stu);
  for (i = 0; i < pool.length; i++) map[pool[i].w] = pool[i];
  for (i = 0; i < act.length; i++){ if (map[act[i]]) out.push(map[act[i]]); }
  return out;
}
function preReadN(){
  var n = 0, i;
  for (i = 0; i < PRE.list.length; i++){ if (PRE.read[PRE.list[i].w]) n++; }
  return n;
}
/* 底部按钮文案：没排题型就明说，别让学生点了没反应 */
function preFootRefresh(){
  var go = $('preGo');
  if (!go) return;
  var hasType = !!STATE.curType, done = PRE.list.length && preReadN() >= PRE.list.length;
  go.disabled = !hasType;
  go.className = 'pre-go' + (hasType ? '' : ' off');
  go.textContent = !hasType ? '还没排练习题型'
    : (done ? '都读过啦，开始练习' : '开始练习');
  var tip = $('preTip');
  if (tip){
    tip.textContent = !hasType
      ? '请老师点右上角「老师」（长按约 1 秒）进去勾选练习题型'
      : '一张一张点着读，读完再开始练习';
  }
}
function renderPreStudy(){
  var stu = STATE.cur, stage = $('stage');
  if (!stu || !stage) return;
  var list = todayChars(stu), i, c, m, cls, cards = '', prof, lv = {}, masters = 0;
  PRE.list = list;
  preMode(true);
  renderDrillBar(null);   /* 抽练条属于答题态，预习阶段先收起来 */
  $('qNow').textContent = '预习';
  $('qTotal').textContent = String(list.length);

  if (!list.length){
    setHTML(stage, '<div class="empty-tip">这位同学还没有字表，所以没有今天的字卡。' +
      '请老师点右上角「老师」（长按约 1 秒）进去，在学生的「学哪些字」里选几个。</div>');
    return;
  }

  prof = stuProfile(stu);
  for (i = 0; i < prof.items.length; i++) lv[prof.items[i].w] = prof.items[i].lv;
  for (i = 0; i < list.length; i++){
    c = list[i];
    m = lv[c.w] || '待学';
    if (m === '已掌握') masters++;
    cls = m === '已掌握' ? 'm' : (m === '练习中' ? 'd' : (m === '需巩固' ? 't' : 'o'));
    cards += '<button type="button" class="pre-card' + (PRE.read[c.w] ? ' read' : '') +
        '" data-pre="' + esc(c.w) + '">' +
      '<span class="pre-idx">' + (i + 1) + CLOSE('span') +
      '<span class="pre-st ' + cls + '">' + esc(m) + CLOSE('span') +
      '<span class="pre-char">' + esc(c.w) + CLOSE('span') +
      '<span class="pre-py">' + esc(c.p || '—') + CLOSE('span') +
      (firstWordOf(c) ? '<span class="pre-wd">' + esc(firstWordOf(c)) + CLOSE('span') : '') +
      (PRE.read[c.w] ? '<span class="pre-tick">读过了</span>' : '') +
    CLOSE('button');
  }

  setHTML(stage,
    '<div class="pre-wrap">' +
      '<div class="pre-head">' +
        '<h2>今天的字</h2>' +
        '<span class="pre-cnt">共 ' + list.length + ' 个' +
          (masters ? ' · 已掌握 ' + masters : '') + CLOSE('span') +
      CLOSE('div') +
      '<div class="pre-grid">' + cards + CLOSE('div') +
      '<div class="pre-foot">' +
        '<p class="pre-tip" id="preTip"></p>' +
        '<button type="button" class="pre-go" id="preGo">开始练习</button>' +
      CLOSE('div') +
    CLOSE('div'));
  preFootRefresh();
}
/* 点一张卡读一个：单字走 charKey（每个字都有独立录音），不是拿词语去猜 */
function preSay(ch){
  if (!ch) return;
  var stage = $('stage'), card = stage && stage.querySelector ? stage.querySelector('[data-pre="' + ch + '"]') : null;
  say(ch);
  PRE.read[ch] = 1;
  if (card){
    if (card.className.indexOf('read') < 0) card.className += ' read';
    if (!card.querySelector('.pre-tick')){
      var t = document.createElement('span');
      t.className = 'pre-tick';
      t.textContent = '读过了';
      card.appendChild(t);
    }
  }
  preFootRefresh();
}
function preStart(){
  if (!STATE.curType){ toast('请老师先给这位同学勾选练习题型'); return; }
  startQuiz(STATE.curType);
}

/* ------------------------- 出题 ------------------------- */
function weightOf(ch, stu){
  var r = STATE.logs[logKey(stu.name, ch.w)];
  if (!r || !r.n) return 0;
  var lv = levelOf(r);
  if (lv === '需巩固') return 1;
  if (lv === '练习中') return 2;
  return 3;
}
function pickTargets(pool, n, stu){
  var buckets = {}, i, k, ws = [], out = [];
  for (i = 0; i < pool.length; i++){
    k = 'w' + weightOf(pool[i], stu);
    if (!buckets[k]) buckets[k] = [];
    buckets[k].push(pool[i]);
  }
  for (k in buckets){ if (Object.prototype.hasOwnProperty.call(buckets, k)) ws.push(k); }
  ws.sort();
  for (i = 0; i < ws.length; i++){
    var grp = shuffleArr(buckets[ws[i]]);
    for (var j = 0; j < grp.length && out.length < n; j++) out.push(grp[j]);
  }
  return out;
}
function buildQuestions(pool, n, stu, focusPool){
  /* focusPool 只在「抽练」时给：目标字从抽练名单里取，干扰项始终从整张字表取
     （否则只有 3 个字时凑不出 4 个选项，孩子会看到重复的字） */
  var targets = pickTargets(focusPool || pool, n, stu), qs = [], i, j, t, opts, d;
  for (i = 0; i < targets.length; i++){
    t = targets[i];
    d = pickN(pool, 3, [t]);
    opts = [t];
    for (j = 0; j < d.length; j++) opts.push(d[j]);
    opts = shuffleArr(opts);
    qs.push({ target: t, opts: opts });
  }
  return qs;
}
/* 抽练目标：只在这一轮有效。切题型、换学生、点「改回整张字表」都会清掉 */
var QUIZ_FOCUS = null;
function renderDrillBar(list){
  var el = $('drillBar');
  if (!el) return;
  if (!list || !list.length){
    el.hidden = true;
    setHTML(el, '');
    return;
  }
  var h = '<span>本次只练这 ' + list.length + ' 个字</span><div class="db-chars">', i;
  for (i = 0; i < list.length && i < 14; i++){ h += '<b>' + esc(list[i]) + CLOSE('b'); }
  h += CLOSE('div') + '<button type="button" id="btnDrillAll">改回整张字表</button>';
  setHTML(el, h);
  el.hidden = false;
  var b = $('btnDrillAll');
  if (b){
    b.addEventListener('click', function(){
      QUIZ_FOCUS = null;
      startQuiz(STATE.curType || (STATE.cur && STATE.cur.types[0]) || '');
    });
  }
}
/* ------------------------- 拼词语出题 -------------------------
   一屏 3 个词 = 6 个字块。词从「字库组词 + 老师自建词库」里取，
   只收「至少有一个字在这个学生字表里」的词 —— 这就是「依据学生选的字出词」。
   同一个字块在一组里只用一次；任取两个字若还能拼成本组以外的词，这一组就不要，
   否则孩子拼出「大小」却判错，会以为程序坏了。 */
var WB_PER_GROUP = 3;

function wbCrossHit(words, byW){
  var chars = [], seen = {}, i, j, k, t, isTarget;
  for (i = 0; i < words.length; i++){
    if (!seen[words[i].a]){ seen[words[i].a] = 1; chars.push(words[i].a); }
    if (!seen[words[i].b]){ seen[words[i].b] = 1; chars.push(words[i].b); }
  }
  for (i = 0; i < chars.length; i++){
    for (j = 0; j < chars.length; j++){
      if (i === j) continue;
      t = chars[i] + chars[j];
      if (!byW[t]) continue;
      isTarget = false;
      for (k = 0; k < words.length; k++){ if (words[k].w === t) isTarget = true; }
      if (!isTarget) return t;
    }
  }
  return '';
}

function buildWordGroups(pool, groupN, stu, focusPool){
  var bank = wordBank(true), poolMap = {}, fSet = null;
  var i, j, k, cand = [], wd, ca, cb, groups = [], cur = [], taken = {};
  var out = [], tiles, c;
  for (i = 0; i < pool.length; i++) poolMap[pool[i].w] = pool[i];
  if (focusPool && focusPool.length){
    fSet = {};
    for (i = 0; i < focusPool.length; i++) fSet[focusPool[i].w] = 1;
  }
  for (i = 0; i < bank.list.length; i++){
    wd = bank.list[i]; ca = poolMap[wd.a]; cb = poolMap[wd.b];
    if (!ca && !cb) continue;
    if (fSet && !fSet[wd.a] && !fSet[wd.b]) continue;
    cand.push({
      w: wd.w, a: wd.a, b: wd.b,
      tier: (ca && cb) ? 0 : 1,                      /* 两个字都学过的最优先 */
      wt: Math.min(ca ? weightOf(ca, stu) : 9, cb ? weightOf(cb, stu) : 9)
    });
  }
  cand = shuffleArr(cand);                           /* 先打乱，同优先度里就是随机的 */
  cand.sort(function(x, y){ return (x.tier - y.tier) || (x.wt - y.wt); });

  /* 成组：每组 3 个词、6 个字块互不共用；已经在前几组出现过的字优先级往后压，
     这样 20 个字的字表能覆盖到 18 个字，而不是三组都在练同样那 6 个。
     字表只有 6 个字时不可避免地要复用，但会尽量换组合。 */
  var allUsed = {}, usedW = {}, dead = {}, k, c2, best, bestScore, rep, sc, guard, fresh;
  for (i = 0; i < groupN; i++){
    cur = []; taken = {}; dead = {};      /* dead 只在本组有效，别影响下一组 */
    guard = 0;
    while (cur.length < WB_PER_GROUP && guard++ < 500){
      best = null; bestScore = 1e9;
      for (j = 0; j < cand.length; j++){
        c2 = cand[j];
        if (dead[c2.w]) continue;
        if (taken[c2.a] || taken[c2.b]) continue;
        rep = (allUsed[c2.a] ? 1 : 0) + (allUsed[c2.b] ? 1 : 0);
        /* 先保「两个字都学过」（tier 0），再尽量不重复用字（rep），
           最后才看掌握程度；前面组已经出过的词压到最低，避免整组重复 */
        sc = (usedW[c2.w] ? 10000 : 0) + c2.tier * 100 + rep * 10 + c2.wt;
        if (sc < bestScore){ bestScore = sc; best = c2; }
      }
      if (!best) break;
      if (wbCrossHit(cur.concat([best]), bank.byW)){
        /* 这个词会让本组出现第二个能拼成的词，跳过它，别让孩子拼对了却判错 */
        dead[best.w] = 1;
        continue;
      }
      cur.push(best); taken[best.a] = 1; taken[best.b] = 1;
    }
    fresh = 0;
    for (j = 0; j < cur.length; j++){ if (!usedW[cur[j].w]) fresh++; }
    /* 整组都是前面出过的词（字表太小、词不够用）→ 不再硬凑，少出几组比重复出题强 */
    if (cur.length >= 2 && (fresh || !groups.length)){
      groups.push(cur);
      for (j = 0; j < cur.length; j++){
        usedW[cur[j].w] = 1;
        allUsed[cur[j].a] = 1; allUsed[cur[j].b] = 1;
      }
    } else break;
  }
  for (i = 0; i < groups.length; i++){
    tiles = [];
    for (j = 0; j < groups[i].length; j++){
      tiles.push(groups[i][j].a); tiles.push(groups[i][j].b);
    }
    out.push({ words: groups[i], tiles: shuffleArr(tiles), done: [] });
  }
  return out;
}

function startQuiz(type){
  var stu = STATE.cur;
  if (!stu) return;
  preMode(false);            /* 开题了，老师辅助按钮放回来 */
  var pool = charsOf(stu), i;
  var focus = QUIZ_FOCUS;      /* 一次性消费：重进就回到整张字表 */
  QUIZ_FOCUS = null;
  if (type === '图字配对'){
    var pairable = [];
    for (i = 0; i < pool.length; i++){ if (canPair(pool[i])) pairable.push(pool[i]); }
    if (pairable.length >= 4) pool = pairable;
  }
  renderDrillBar(null);
  if (!pool.length){
    setHTML($('stage'), '<div class="empty-tip">这位同学还没有字表。请老师点右上角「老师」（长按约 1 秒）进去，在学生的「学哪些字」里选几个。</div>');
    $('qNow').textContent = '0'; $('qTotal').textContent = '0';
    return;
  }
  /* 目标字收敛，两个来源：
     ① 老师抽练（QUIZ_FOCUS，一次性）→ 顶部要亮出「本次只练这 N 个字」；
     ② 今日字单（PRE.list，进学生时按同一套权重固定下来）→ 静默收敛，不显示抽练条。
     有这个收敛，「预习看到的字」和「这一轮练的字」才是同一批；否则两处各自随机抽，
     孩子刚认完 8 个字，做题却是另外 8 个。 */
  var srcList = (focus && focus.length)
    ? focus
    : ((PRE.list && PRE.list.length) ? PRE.list.map(function(x){ return x.w; }) : null);
  var tp = pool, sub = [], i2;
  if (srcList && srcList.length){
    for (i = 0; i < pool.length; i++){
      if (srcList.indexOf(pool[i].w) >= 0) sub.push(pool[i]);
    }
    if (sub.length) tp = sub;
  }
  var isFocus = (tp !== pool);
  var isDrill = !!(focus && focus.length);   /* 只有抽练才点亮顶部的抽练条 */
  var total = stu.count || 8;
  if (total > 12) total = 12;
  if (total < 4) total = 4;
  if (total > pool.length) total = pool.length;
  if (isFocus) total = tp.length;          /* 只练 N 个字就出 N 题，不重复问同一个字 */

  if (type === '拼词语'){
    /* 每日题量在拼词语里按「词」算：8 个词就是 3 组（最后一组 2 个）。
       这里不能用 total —— 它已经被「字表字数」截断过，而 6 个字能出十几组词，
       拿字数当词数会让题量突然缩水。最多 4 组（12 个词），再多孩子坐不住。 */
    var raw = stu.count || 8;
    if (raw > 12) raw = 12;
    if (raw < 4) raw = 4;
    /* 只有抽练才按「挑了几个字就出几个词」；今日字单不缩词量 ——
       拼词语的题量按词算，用具数当词数会让 6 个字的字表只剩 2 组（T-008 的老坑）。 */
    if (isDrill) raw = Math.max(3, tp.length);
    var groupN = Math.max(1, Math.min(4, Math.ceil(raw / WB_PER_GROUP)));
    var wgs = buildWordGroups(pool, groupN, stu, isFocus ? tp : null);
    if (!wgs.length){
      setHTML($('stage'), '<div class="empty-tip">这位同学的字表还凑不出词语。请老师在「学哪些字」里多加几个字，或者到「词库」里补几个词。</div>');
      $('qNow').textContent = '0'; $('qTotal').textContent = '0';
      return;
    }
    STATE.quiz = { type: type, qs: wgs, i: 0, right: 0, prompts: 0,
                   answered: false, promptUsed: 0 };
    $('qTotal').textContent = String(wgs.length);
    if (isDrill){
      var wl = [];
      for (i2 = 0; i2 < tp.length; i2++) wl.push(tp[i2].w);
      renderDrillBar(wl);
    }
    renderStage();
    return;
  }

  if (pool.length < 4){
    setHTML($('stage'), '<div class="empty-tip">这位同学的字表只有 ' + pool.length + ' 个字，练这个题型至少要 4 个。请老师再选几个字。</div>');
    $('qNow').textContent = '0'; $('qTotal').textContent = '0';
    return;
  }
  STATE.quiz = { type: type, qs: buildQuestions(pool, total, stu, isFocus ? tp : null),
                 i: 0, right: 0, prompts: 0, answered: false, promptUsed: 0 };
  $('qTotal').textContent = String(STATE.quiz.qs.length);
  if (isDrill){
    var ws = [];
    for (i2 = 0; i2 < tp.length; i2++) ws.push(tp[i2].w);
    renderDrillBar(ws);
  }
  renderStage();
}
function curQ(){
  if (!STATE.quiz) return null;
  return STATE.quiz.qs[STATE.quiz.i] || null;
}

/* ------------------------- 题目渲染 ------------------------- */
function optCardHTML(ch, cls){
  return '<button type="button" class="opt ' + (cls || '') + '" data-c="' + esc(ch.w) + '">' + esc(ch.w) + CLOSE('button');
}
function speakerHTML(){
  return '<button type="button" class="speaker" id="spk" aria-label="再听一次">' +
    '<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#185FA5" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M11 5 6 9H3v6h3l5 4z"/>' +
    '<path d="M15.5 8.5a4.5 4.5 0 0 1 0 7"/>' +
    '<path d="M18.5 6a8 8 0 0 1 0 12"/>' +
    CLOSE('svg') + CLOSE('button');
}
function renderStage(){
  var stage = $('stage');
  var q = curQ();
  if (!q){
    renderSummary();
    return;
  }
  var type = STATE.quiz.type;
  $('qNow').textContent = String(STATE.quiz.i + 1);
  var head = '<div class="q-head">' +
      '<button type="button" class="read-btn" id="qRead" aria-label="再读一遍题目">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M11 5 6 9H3v6h3l5 4z"/>' +
          '<path d="M15.5 8.5a4.5 4.5 0 0 1 0 7"/>' +
          '<path d="M18.5 6a8 8 0 0 1 0 12"/>' +
        CLOSE('svg') + '读题' + CLOSE('button') +
      '<div class="q-ask">' + esc(TYPE_DESC[type] || '') + '</div>' +
      '<div class="q-progress">第 ' + (STATE.quiz.i + 1) + ' 题 / 共 ' + STATE.quiz.qs.length + ' 题</div>' +
    CLOSE('div') + '<div class="pinyin-hint read-hint" id="pyHint" hidden></div>';
  var body = '', opts = '', i;

  if (type === '拼词语'){ renderWordBuild(q, head); return; }

  if (type === '听音找字'){
    body = '<div class="q-head" style="margin-bottom:20px">' + speakerHTML() +
      '<div><div class="q-ask">点喇叭听一听</div></div>' + CLOSE('div');
  } else if (type === '找一样的字'){
    body = '<div class="big-char" style="font-size:110px">' + esc(q.target.w) + '</div>';
  } else if (type === '看拼音写字'){
    body = '<div class="big-pinyin" style="margin-top:16px">' + esc(q.target.p || '（没录拼音）') + '</div>';
  } else if (type === '图字配对'){
    var art = artOf(q.target);
    if (art){
      body = '<div class="drag-zone"><div class="drag-item" id="dragImg">' + art + CLOSE('div') +
        '<div class="pinyin-hint">把上面的图拖到下面的字上（也可以直接点字）</div>' + CLOSE('div');
    } else {
      body = '<div class="drag-zone"><div class="drag-item word" id="dragImg">' +
        wordCardHTML(q.target) + CLOSE('div') +
        '<div class="pinyin-hint">看词语里红颜色的那个字，点出它</div>' + CLOSE('div');
    }
  } else if (type === '认读跟读'){
    body = '<div class="big-char">' + esc(q.target.w) + '</div>' +
      '<div class="big-pinyin">' + esc(q.target.p || '') + '</div>' +
      '<div style="display:flex;justify-content:center;margin:8px 0 4px">' + speakerHTML() + CLOSE('div') +
      (q.target.words ? '<div class="big-word">组词：' + esc(q.target.words) + CLOSE('div') : '') +
      /* 跟读没有对错可判，靠老师/家长确认。按钮放在字下面正中间，
         不放底部辅助栏——那里是给老师用的，孩子看不见。 */
      '<div class="read-actions" id="readActions">' +
        '<button type="button" class="read-next" id="btnReadNext">读完啦，下一个 →</button>' +
        '<span class="read-tip">先跟着念一遍，再点这个按钮</span>' +
      CLOSE('div');
    setHTML(stage, head + body);
    STATE.quiz.answered = false;
    STATE.quiz.promptUsed = 0;
    bindStage();
    syncHelpBar();
    /* 题目先显示出来，让孩子看清界面再开口，不要一渲染就念 */
    setTimeout(function(){ readQuestion(); }, PACE.ready * 1000);
    return;
  }

  for (i = 0; i < q.opts.length; i++){ opts += optCardHTML(q.opts[i]); }
  setHTML(stage, head + body + '<div class="opts four">' + opts + CLOSE('div'));
  STATE.quiz.answered = false;
  STATE.quiz.promptUsed = 0;
  bindStage();
  syncHelpBar();
  setTimeout(function(){ readQuestion(); }, PACE.ready * 1000);
}
/* ------------------------- 拼词语渲染与作答 ------------------------- */
function wbTileHTML(ch, i){
  return '<button type="button" class="wb-tile" data-ti="' + i + '" aria-label="' + esc(ch) + '">' +
    esc(ch) + CLOSE('button');
}
function wbTileEl(i){
  return document.querySelector('#stage .wb-tile[data-ti="' + i + '"]');
}
function renderWordBuild(q, head){
  var slots = '', tiles = '', i, w;
  for (i = 0; i < q.words.length; i++){
    w = q.words[i].w;
    slots += q.done[i]
      ? '<div class="wb-slot on" data-slot="' + i + '">' + esc(w) + CLOSE('div')
      : '<div class="wb-slot" data-slot="' + i + '"><em></em><em></em>' + CLOSE('div');
  }
  for (i = 0; i < q.tiles.length; i++) tiles += wbTileHTML(q.tiles[i], i);
  q.sel = [];
  q.locked = false;
  setHTML($('stage'), head +
    '<div class="wb-slots"><span class="wb-slots-lb">要拼的词</span>' + slots + CLOSE('div') +
    '<div class="wb-tiles">' + tiles + CLOSE('div') +
    '<div class="wb-tip" id="wbTip">点两个字，拼成一个词 · 一共 ' + q.words.length + ' 个词</div>');
  STATE.quiz.answered = false;
  STATE.quiz.promptUsed = 0;
  bindStage();
  syncHelpBar();
  setTimeout(function(){ readQuestion(); }, PACE.ready * 1000);
}
function wbPick(idx){
  var q = curQ(), el, at;
  if (!q || !q.tiles || q.locked) return;
  el = wbTileEl(idx);
  if (!el || el.classList.contains('used')) return;
  at = q.sel.indexOf(idx);
  if (at >= 0){
    q.sel.splice(at, 1);
    el.classList.remove('sel');
    sfxTap();
    return;
  }
  sfxTap();
  q.sel.push(idx);
  el.classList.add('sel');
  if (q.sel.length >= 2) wbCheck(q);
}
function wbCheck(q){
  /* 两个字 → 找有没有这个词。顺序反过来也认（先点「人」再点「大」，
     孩子心里想的是「大人」），批得太严只会让他不敢点。 */
  var i1 = q.sel[0], i2 = q.sel[1], a = q.tiles[i1], b = q.tiles[i2];
  var hit = -1, i, k, w, left = 0, tip;
  var e1 = wbTileEl(i1), e2 = wbTileEl(i2);
  q.sel = [];
  for (i = 0; i < q.words.length; i++){
    if (q.done[i]) continue;
    w = q.words[i].w;
    if ((w.charAt(0) === a && w.charAt(1) === b) ||
        (w.charAt(0) === b && w.charAt(1) === a)){ hit = i; break; }
  }
  if (hit < 0){
    sfxNo();
    if (e1){ e1.classList.remove('sel'); e1.classList.add('shake'); }
    if (e2){ e2.classList.remove('sel'); e2.classList.add('shake'); }
    setTimeout(function(){
      if (e1) e1.classList.remove('shake');
      if (e2) e2.classList.remove('shake');
    }, 440);
    tip = $('wbTip');
    if (tip) tip.textContent = '这两个字拼不成词，再试试';
    setTimeout(function(){
      if (STATE.quiz && curQ() === q && !q.locked) say('再试一试。');
    }, 320);
    return;
  }
  q.done[hit] = true;
  STATE.quiz.right++;
  if (e1){ e1.classList.remove('sel'); e1.classList.add('used'); }
  if (e2){ e2.classList.remove('sel'); e2.classList.add('used'); }
  wbFillSlot(hit, q.words[hit].w);
  wbLogWord(q.words[hit]);
  STATE.quiz.promptUsed = 0;
  sfxOk();
  setTimeout(function(){
    if (STATE.quiz && curQ() === q) say(q.words[hit].w);
  }, 300);
  for (k = 0; k < q.words.length; k++){ if (!q.done[k]) left++; }
  tip = $('wbTip');
  if (tip) tip.textContent = left ? ('拼对啦！还剩 ' + left + ' 个词') : '这组都拼好啦！';
  if (!left) wbGroupDone(q);
}
function wbFillSlot(i, w){
  var el = document.querySelector('#stage .wb-slot[data-slot="' + i + '"]');
  if (!el) return;
  el.className = 'wb-slot on';
  setHTML(el, esc(w));
}
function wbGroupDone(q){
  q.locked = true;
  STATE.quiz.answered = true;
  syncHelpBar();
  setTimeout(function(){
    if (STATE.quiz && curQ() === q) say('太棒了！');
  }, 950);
  setTimeout(function(){
    if (STATE.quiz && curQ() === q) nextQuestion();
  }, 2700);
}
function wbLogWord(wd){
  /* 只给「属于学生字表」的字记分：词的另一半可能是字库里孩子还没学的字，
     记进档案会让进度虚高，也会把没教过的字标成「已掌握」。 */
  var stu = STATE.cur, pool, map = {}, cs = [wd.a, wd.b], i, ch, r;
  if (!stu) return;
  pool = charsOf(stu);
  for (i = 0; i < pool.length; i++) map[pool[i].w] = 1;
  for (i = 0; i < cs.length; i++){
    ch = cs[i];
    if (!map[ch]) continue;
    r = getLog(stu.name, ch);
    r.n++;
    if (STATE.quiz.promptUsed){ r.hinted++; r.prompts++; } else { r.alone++; }
    r.last = nowISO();
    r.level = levelOf(r);
    r.dirty = true;
  }
  flushLogs();
}
function wbHint(){
  /* 提示只做一件事：把某个还没拼的词的两个字块闪一下，不念词（念了就是答案） */
  var q = curQ(), i, j, w = '', a, b, tiles, els = [];
  if (!q || !q.tiles) return false;
  for (i = 0; i < q.words.length; i++){ if (!q.done[i]){ w = q.words[i].w; break; } }
  if (!w) return false;
  a = w.charAt(0); b = w.charAt(1);
  tiles = document.querySelectorAll('#stage .wb-tile');
  for (j = 0; j < tiles.length; j++){
    if (tiles[j].classList.contains('used')) continue;
    if (tiles[j].textContent === a || tiles[j].textContent === b) els.push(tiles[j]);
    if (els.length >= 2) break;
  }
  for (j = 0; j < els.length; j++) wbFlash(els[j]);
  STATE.quiz.promptUsed++;
  sfxPop();
  toast('提示：闪的这两个字能拼成一个词');
  return true;
}
function wbFlash(el){
  el.classList.add('hinted');
  setTimeout(function(){ el.classList.remove('hinted'); }, 2400);
}

function bindStage(){
  var rd = $('qRead');
  var wbt = document.querySelectorAll('#stage .wb-tile'), ti;
  for (ti = 0; ti < wbt.length; ti++){
    (function(el){
      el.addEventListener('click', function(){
        wbPick(parseInt(el.getAttribute('data-ti'), 10));
      });
    })(wbt[ti]);
  }
  if (rd) rd.addEventListener('click', function(){
    /* 语音开着的时候马上就有朗读，不用再叠一个点击音 */
    if (!AV.voice) sfxTap();
    readQuestion();
  });
  var spk = $('spk');
  if (spk) spk.addEventListener('click', function(){ readTarget(); });
  var rn = $('btnReadNext');
  if (rn) rn.addEventListener('click', function(){
    /* 跟读是「读给人听」，程序判不了对错：点了就算读过了 */
    if (STATE.quiz && !STATE.quiz.answered) gradeAnswer(true);
  });
  var dg = $('dragImg');
  if (dg){
    dg.addEventListener('pointerdown', function(ev){
      dg.classList.add('dragging');
      dg.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    });
    dg.addEventListener('pointermove', function(ev){
      var el = document.elementFromPoint(ev.clientX, ev.clientY);
      var card = el && el.closest ? el.closest('.opt') : null;
      var all = document.querySelectorAll('#stage .opt'), i;
      for (i = 0; i < all.length; i++){ all[i].classList.remove('drop-on'); }
      if (card) card.classList.add('drop-on');
    });
    dg.addEventListener('pointerup', function(ev){
      dg.classList.remove('dragging');
      var el = document.elementFromPoint(ev.clientX, ev.clientY);
      var card = el && el.closest ? el.closest('.opt') : null;
      var all = document.querySelectorAll('#stage .opt'), i;
      for (i = 0; i < all.length; i++){ all[i].classList.remove('drop-on'); }
      if (card) pickOption(card.getAttribute('data-c'));
    });
    dg.addEventListener('pointercancel', function(){ dg.classList.remove('dragging'); });
  }
}
function readTarget(){
  var q = curQ();
  if (!q) return;
  var ok = speak(q.target.w);
  readHint($('pyHint'), ok, q.target.p || q.target.w);
}
function speak(text){ return say(text); }

/* 把题干读出来：特需学生不认字，靠听也能知道这道题要干什么。
   一律「先说要做什么 → 停一下 → 再给要听的字」，不连读两遍。 */
function quizSay(type, q){
  if (!q) return null;
  /* 拼词语不念词语本身：念出来就等于把答案告诉孩子了 */
  if (type === '拼词语') return [{ t: '找出下面的词语。' }];
  var w = q.target.w || '';
  if (type === '听音找字'){
    return [{ t: '找出这个字。', gap: PACE.afterAsk }, { t: w }];
  }
  if (type === '找一样的字'){
    return [{ t: '找出一样的字。', gap: PACE.afterAsk }, { t: w }];
  }
  /* 看拼音写字、图字配对都不念答案，念出来就等于替孩子做了 */
  if (type === '看拼音写字') return [{ t: '看拼音。找出这个字。' }];
  if (type === '图字配对'){
    return artOf(q.target) ? [{ t: '看看图。这是什么。找出它的名字。' }]
                           : [{ t: '看看红色的那个字。找出它。' }];
  }
  if (type === '认读跟读'){
    return [{ t: w, gap: PACE.afterChar }, { t: w }];
  }
  return [{ t: w }];
}
function quizSentence(type, q){
  var list = quizSay(type, q), i, out = '';
  for (i = 0; list && i < list.length; i++) out += list[i].t;
  return out;
}
function readQuestion(){
  var q = curQ();
  if (!q || !STATE.quiz) return false;
  /* 已经离开练习页（去游戏/去乐园）就不要再念题：
     换页时可能还留着上一次的延时读题，不拦住会在别的页面上突然冒出一句。 */
  var scr = $('scrPlay');
  if (scr && scr.hidden) return false;
  var type = STATE.quiz.type, ok = saySeq(quizSay(type, q));
  readHint($('pyHint'), ok, quizSentence(type, q));
  return ok;
}
function syncHelpBar(){
  var type = STATE.quiz ? STATE.quiz.type : '';
  var answered = STATE.quiz ? STATE.quiz.answered : true;
  /* 跟读的「下一个」已经放大到字下面正中间，底部辅助栏不再重复一个「读对了」，
     否则孩子和老师会同时去点两个地方。 */
  $('btnRight').hidden = true;
  $('btnRight').disabled = answered;
  $('btnHint').disabled = answered;
  var rn = $('btnReadNext'), ra = $('readActions');
  if (rn) rn.disabled = answered;
  /* 答过之后收起大按钮，让下面的反馈条和「下一题」成为唯一出口 */
  if (ra && type === '认读跟读') ra.hidden = answered;
}

/* ------------------------- 作答 ------------------------- */
function pickOption(ch){
  var q = curQ();
  if (!q || STATE.quiz.answered) return;
  STATE.quiz.picked = ch;
  gradeAnswer(ch === q.target.w);
}
function gradeAnswer(right){
  var q = curQ();
  if (!q) return;
  STATE.quiz.answered = true;
  var picked = STATE.quiz.picked || '';
  var stu = STATE.cur, r = getLog(stu.name, q.target.w);
  r.n++;
  if (right){
    if (STATE.quiz.promptUsed) r.hinted++; else r.alone++;
    STATE.quiz.right++;
  } else {
    r.wrong++;
  }
  r.prompts += STATE.quiz.promptUsed;
  r.last = nowISO();
  r.level = levelOf(r);
  r.dirty = true;
  flushLogs();

  var all = document.querySelectorAll('#stage .opt'), i, el;
  for (i = 0; i < all.length; i++){
    el = all[i];
    if (el.getAttribute('data-c') === q.target.w) el.classList.add('right');
    else if (picked && el.getAttribute('data-c') === picked) el.classList.add('wrong');
  }
  if (right){
    sfxOk();
    /* 先响音效，停一下再开口说「答对了」，两个声音不叠在一起 */
    setTimeout(function(){
      if (STATE.quiz && STATE.quiz.answered) say('答对了！');
    }, PACE.afterOk * 1000);
  } else { sfxNo(); }
  var tail = '<div class="feedback ' + (right ? 'ok' : 'no') + '">' +
    (right ? '答对了！' : '这个是「' + esc(q.target.w) + '」，再听一遍') +
    '<button type="button" class="help-btn" id="btnGo" style="margin-left:auto">下一题</button>' +
    CLOSE('div');
  var host = document.querySelector('#stage .opts');
  if (host) insertAfter(host, tail); else appendToStage(tail);
  var go = $('btnGo');
  if (go) go.addEventListener('click', nextQuestion);
  if (!right){
    /* 等错误音效播完再读正确读音，两个声音不叠在一起 */
    setTimeout(function(){
      if (STATE.quiz && STATE.quiz.answered) readTarget();
    }, 560);
    syncHelpBar();
    return;
  }
  syncHelpBar();
  /* 念完「答对了」再留一拍，别刚说完就翻页 */
  setTimeout(function(){
    if (STATE.quiz && STATE.quiz.answered && $('btnGo')) nextQuestion();
  }, 2300);
}
function insertAfter(host, markup){
  var box = document.createElement('div');
  box.appendChild(document.createRange().createContextualFragment(markup));
  if (host.parentNode) host.parentNode.insertBefore(box, host.nextSibling);
}
function appendToStage(markup){
  var box = document.createElement('div');
  box.appendChild(document.createRange().createContextualFragment(markup));
  $('stage').appendChild(box);
}
function useHint(){
  if (!STATE.quiz || STATE.quiz.answered) return;
  if (STATE.quiz.type === '拼词语'){ wbHint(); return; }
  STATE.quiz.promptUsed++;
  sfxPop();
  var q = curQ();
  var all = document.querySelectorAll('#stage .opt'), i, el, hidden = 0;
  for (i = 0; i < all.length; i++){
    el = all[i];
    if (el.getAttribute('data-c') !== q.target.w && hidden < 2){ el.classList.add('dim'); hidden++; }
  }
  readTarget();
  toast('已给提示：去掉两个错的，再听一次读音');
}
function skipQuestion(){
  if (!STATE.quiz) return;
  nextQuestion();
}
function nextQuestion(){
  if (!STATE.quiz) return;
  STATE.quiz.i++;
  if (STATE.quiz.i >= STATE.quiz.qs.length){ renderSummary(); return; }
  renderStage();
}
function renderSummary(){
  var z = STATE.quiz, done = z.i, right = z.right, denom = done, i;
  /* 拼词语一组 3 个词，正确率要按「词」算：8 个词拼对 6 个 = 75%，
     按组算会变成 0%（一组没全拼完就崩）或者 100%（组数少）。 */
  if (z.type === '拼词语'){
    denom = 0;
    for (i = 0; i < z.qs.length; i++) denom += z.qs[i].words.length;
  }
  var rate = denom ? Math.round(right * 100 / denom) : 0;
  var stars = rate >= 90 ? 3 : (rate >= 70 ? 2 : (rate >= 40 ? 1 : 0));
  var starHTML = '';
  for (i = 0; i < stars; i++){ starHTML += '<span class="pill g" style="font-size:15px">★</span>'; }
  var msg = rate >= 90 ? '太棒了！' : (rate >= 70 ? '做得不错，继续加油' : '再来一次会更好');
  if (rate >= 70) sfxWin(); else sfxNo();
  /* 先让庆祝音效放完，再报结果，别两个声音挤在一起 */
  setTimeout(function(){
    if (STATE.quiz === z) say(msg);
  }, 800);
  var html = '<div class="q-head"><div class="q-ask">这一轮练完了</div></div>' +
    '<div class="big-char" style="font-size:74px">' + rate + '%</div>' +
    '<div class="star-row" style="justify-content:center">' + starHTML + CLOSE('div') +
    '<div class="feedback ok" style="justify-content:center">' + esc(msg) + CLOSE('div') +
    '<div class="row" style="justify-content:center;margin-top:18px">' +
      '<button type="button" class="primary" id="btnAgain">再来一轮</button>' +
      '<button type="button" class="secondary" id="btnBackTypes">换题型</button>' +
    CLOSE('div');
  $('qNow').textContent = String(done);
  setHTML($('stage'), html);
  var a = $('btnAgain'), b = $('btnBackTypes');
  if (a) a.addEventListener('click', function(){ startQuiz(STATE.quiz.type); });
  if (b) b.addEventListener('click', function(){
    if (!STATE.cur) return;
    if (STATE.cur.types.length > 1) toast('点上面的题型标签，就能换一种练');
    else toast('这位同学只排了一个题型，请老师在「学生管理」里再加一个');
  });
  syncHelpBar();
}
