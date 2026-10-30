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
/* v30：每屏记住自己滚到哪儿，回来时原样回去。
   老师原话：「练完回到乐园会回到最上面，没有保持刚刚那个汉字的位置，
   这样又要滑动下来非常麻烦」——认字乐园是 22 个册次一长条字格，
   从第 500 个字点进去玩一局，回来被甩到顶上，等于从头再翻一遍。 */
var SCROLL_MEM = {};
function showScreen(name){
  var prev = STATE.phase;
  if (prev && prev !== name){
    SCROLL_MEM[prev] = window.pageYOffset ||
      (document.documentElement && document.documentElement.scrollTop) ||
      (document.body && document.body.scrollTop) || 0;
  }
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
  /* 回原位：先立刻滚一次，再用 setTimeout 补一次——屏幕刚显示时高度可能还没算好，
     直接滚会落在半路（jsdom 里量不到，真机上是「差一点」那种恼人）。 */
  var y = SCROLL_MEM[name] || 0;
  window.scrollTo(0, y);
  if (y > 0) setTimeout(function(){ window.scrollTo(0, y); }, 0);
}

/* ------------------------- 选人页 ------------------------- */
/* v30：卡片上不再铺「听音找字 · 找一样的字 · …」整串题型（9 个题型折成五行，
   把卡片撑得又高又乱，孩子也读不懂）。只留三样：照片、姓名、一句胶囊。
   具体排了哪些题型到老师端去看，这里只回答「他能不能开始练」。 */
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
      '<span class="stu-tag' + (s.types.length ? '' : ' warn') + '">' +
        (s.types.length ? s.types.length + ' 个题型' : '还没排练习') + CLOSE('span') +
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
  renderTypeProg();          /* 今天还剩几个题型，进学生就先让他看见 */
  showScreen('play');
  /* v24：先进「我的主页」——看清楚自己学到哪了、今天要练哪几个，再决定开始。
     以前直接甩一张字卡，孩子不知道自己在整个字表里的位置。 */
  syncActive(found);          /* 在学名单先摆正：已达标的退出、从待学补位 */
  renderStuHome();
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
/* 题型条：**每个题型名下面挂一个圆点，圆点之间用一条横线连起来**（v31）。
   老师 2026-10-30：「你这个题型一多就换行很奇怪啊。而且这个圈圈打勾也难理解，
   能不能正在文字下面呈现一个圈圈，然后用横线连接，完成了这个圈圈就填满」——
   原来进度是另起一行的号码圈，跟题型名各说各话；现在长在一起，一眼看得出
   「哪个练完了、练到第几个」。做完的圆点**填实**（不再打勾：孩子不认勾只认颜色）。 */
function renderTypeTabs(){
  var s = STATE.cur, sess, html = '', i, k;
  if (!s || !isArr(s.types)){ setHTML($('typeTabs'), ''); return; }
  sess = sessEnsure(s);
  for (i = 0; i < s.types.length; i++){
    k = s.types[i];
    html += '<button type="button" class="type-tab' +
              (k === STATE.curType ? ' on' : '') + (sess.done[k] ? ' done' : '') +
              '" data-type="' + esc(k) + '">' +
              '<span class="ts-name">' + esc(k) + CLOSE('span') +
              '<span class="ts-track"><i class="ts-dot"></i>' + CLOSE('span') +
            CLOSE('button');
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
  if (on) play.classList.add('is-pre');
  else {
    play.classList.remove('is-pre');
    /* 开题后就不在主页了，把主页的隐藏规则一起撤掉 */
    play.classList.remove('is-home');
  }
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

/* ------------------------- 我的主页（v24，T-014 第 2 期） -------------------------
   用户 2026-10-23：「学生端应该有自己的界面，看到自己的进度…然后才是按钮开启今日学习」。
   以前点照片直接甩一张字卡，孩子不知道「我学到哪了」，也没有「今天要做什么」的总览。
   这里只做一屏：我是谁 / 学到哪了 / 今天练什么 / 一个大按钮。
   数据全部来自 stuProfile 与 todayChars，不另算一套（另算必然和练习页分叉）。 */
var STU_HOME = { name: '', list: [] };

/* 本地日期键（YYYY-MM-DD）。记录里的 last 是 toISOString 的 UTC 串，
   必须先 Date.parse 再按本地时区取日，否则早上 8 点前练的会算到前一天。 */
function dayKey(d){
  var m = d.getMonth() + 1, dd = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd;
}
/* --------------------- 今天的题型进度（T-021） ---------------------
   用户 2026-10-29：「完成一个练习后应该给一个选项比较明显一点的让学生进入下一个题型」，
   「总的上面也应该有一个进度条或者别的上面打勾？让学生理解还有几个题型没完成」。
   一局仍然只练一个题型（出题逻辑不动），另记一份「今天做完了哪几个题型」：
   按「日期 + 学生」存 localStorage，**不进 STATE**，也就碰不到云端 schema。
   跨天自动清零；换学生自动换一份。 */
var LS_SESS = 'wb2_sess_v1';
var SESS = null;
function sessEnsure(stu){
  var day = dayKey(new Date()), nm = stu ? stu.name : '', o;
  if (SESS && SESS.day === day && SESS.name === nm) return SESS;
  SESS = { day: day, name: nm, done: {} };
  try {
    o = JSON.parse(localStorage.getItem(LS_SESS) || 'null');
    if (o && o.day === day && o.name === nm && o.done) SESS.done = o.done;
  } catch (e) {}
  return SESS;
}
function sessSave(){
  try { localStorage.setItem(LS_SESS, JSON.stringify(SESS)); } catch (e) {}
}
/* 一个题型完整做完一轮（走到结算页）才算完成；点进去没做完不算 */
function sessMark(type){
  if (!type) return;
  var s = sessEnsure(STATE.cur);
  s.done[type] = 1;
  sessSave();
}
function sessTypes(stu){
  return (stu && isArr(stu.types)) ? stu.types : [];
}
function sessDoneN(stu){
  var t = sessTypes(stu), s = sessEnsure(stu), i, n = 0;
  for (i = 0; i < t.length; i++){ if (s.done[t[i]]) n++; }
  return n;
}
/* 下一个还没做完的题型；都做完了返回空串 */
function sessNext(stu){
  var t = sessTypes(stu), s = sessEnsure(stu), i;
  for (i = 0; i < t.length; i++){ if (!s.done[t[i]]) return t[i]; }
  return '';
}
/* 题型进度的文字说明（圆点已经搬到 renderTypeTabs 里，跟题型名长在一起了）。
   这里只留一句「还剩几个」，顺手重画题型条 —— 完成一个题型时圆点要马上填实。 */
function renderTypeProg(){
  var box = $('typeProg'), stu = STATE.cur, t, html, left, done;
  if (!box) return;
  t = sessTypes(stu);
  if (!t.length){ box.hidden = true; setHTML(box, ''); return; }
  done = sessDoneN(stu);
  left = t.length - done;
  box.hidden = false;
  html = '<span class="tp-txt' + (left ? '' : ' all') + '">' +
    (left ? ('已完成 ' + done + ' / ' + t.length + ' 个题型，还有 ' + left + ' 个')
          : '今天的 ' + t.length + ' 个题型都练完啦') + CLOSE('span');
  setHTML(box, html);
  renderTypeTabs();
}
/* 连续天数：把学生所有字最近练习的日期去重，从今天往回数。
   今天还没练也从昨天开始数——「今天还没开始」不该把昨天以前的连续记录清零，
   那对孩子是最伤的一种反馈。 */
function streakOf(stu){
  var set = {}, i, w, r, chars, cur, n = 0, guard = 0, t;
  if (!stu) return 0;
  chars = isArr(stu.chars) ? stu.chars : expandGroups(stu.groups || []);
  for (i = 0; i < chars.length; i++){
    w = chars[i];
    if (!w) continue;
    r = STATE.logs[logKey(stu.name, w)];
    if (!r || !r.last) continue;
    t = Date.parse(r.last);
    if (!t) continue;
    set[dayKey(new Date(t))] = 1;
  }
  cur = new Date();
  if (!set[dayKey(cur)]) cur.setDate(cur.getDate() - 1);
  while (set[dayKey(cur)] && guard < 400){
    n++; guard++;
    cur.setDate(cur.getDate() - 1);
  }
  return n;
}
/* 星星按掌握率分档，每 20% 一颗，最多 5 颗。
   方案原稿写的是「每掌握 5 个字一颗」，但字表只有 12 个字的孩子永远拿不到 5 颗星
   （要 25 个字才够）——在特需班里这等于挂了一个够不着的目标。改成按比例，
   不管字表大小都看得见「再会几个就多一颗」。 */
function starsOf(rate){
  var n = Math.floor((rate || 0) / 20);
  /* 学会第一个字就给一颗：0 变成 1 的这一刻，比 19% 到 20% 那一刻更重要。
     一个刚认下 2 个字的孩子看到五颗全灰，只会觉得「我什么都没做到」。 */
  if (rate > 0 && n < 1) n = 1;
  return Math.max(0, Math.min(5, n));
}
function homeFootRefresh(){
  var go = $('homeGo');
  if (!go) return;
  var hasType = !!STATE.curType, hasChars = !!(STU_HOME.list && STU_HOME.list.length);
  go.disabled = !hasType || !hasChars;
  go.className = 'home-go' + (go.disabled ? ' off' : '');
  go.textContent = !hasChars ? '还没有要练的字'
    : (!hasType ? '还没排练习题型' : '开始今天的学习');
}
function renderStuHome(){
  var stu = STATE.cur, stage = $('stage');
  if (!stu || !stage) return;
  var p = stuProfile(stu), list = todayChars(stu), stars = starsOf(p.rate), dy = streakOf(stu);
  var lv = {}, chips = '', i, c, m, cls, starHTML = '';
  STU_HOME.name = stu.name;
  STU_HOME.list = list;
  /* 换人才重置字卡的勾选；同一个人从主页进出不该把「读过了」清掉 */
  if (PRE.name !== stu.name) preReset(stu.name);
  PRE.list = list;
  preMode(true);
  var play = $('scrPlay');
  if (play && play.classList) play.classList.add('is-home');
  renderDrillBar(null);
  $('qNow').textContent = '主页';
  $('qTotal').textContent = String(p.total);

  for (i = 0; i < p.items.length; i++) lv[p.items[i].w] = p.items[i].lv;
  for (i = 0; i < list.length; i++){
    c = list[i];
    m = lv[c.w] || '待学';
    cls = m === '已掌握' ? 'm' : (m === '练习中' ? 'd' : (m === '需巩固' ? 't' : 'o'));
    chips += '<span class="home-chip ' + cls + '">' + esc(c.w) +
      (c.p ? '<i>' + esc(c.p) + '</i>' : '') + CLOSE('span');
  }
  for (i = 0; i < 5; i++){
    starHTML += '<span class="home-star' + (i < stars ? ' on' : '') + '">★' + CLOSE('span');
  }

  if (!p.total){
    setHTML(stage, '<div class="empty-tip">这位同学还没有字表，所以今天没有要练的字。' +
      '请老师点右上角「老师」（长按约 1 秒）进去，在 ' + esc(stu.name) + ' 的「学哪些字」里选几个。</div>');
    return;
  }

  setHTML(stage,
    '<div class="home-wrap">' +
      '<div class="home-hero">' +
        '<div class="home-who">' +
          avatarHTML(stu, 'home-av') +
          '<div class="home-nm">' +
            '<h2>' + esc(stu.name) + CLOSE('h2') +
            '<p class="home-hi">' + (dy ? '今天也来练一会儿吧' : '先来认认今天这几个字') + CLOSE('p') +
          CLOSE('div') +
        CLOSE('div') +
        ringHTML(p.rate) +
      CLOSE('div') +
      '<div class="home-stats">' +
        '<div class="hs m"><b>' + p.mastered + '</b><span>已学会</span>' + CLOSE('div') +
        '<div class="hs o"><b>' + p.standby + '</b><span>还在排队</span>' + CLOSE('div') +
        '<div class="hs d"><b>' + p.act + '</b><span>正在学</span>' + CLOSE('div') +
      CLOSE('div') +
      '<div class="home-badges">' +
        '<span class="home-stars">' + starHTML + CLOSE('span') +
        (dy ? '<span class="home-streak">连着 ' + dy + ' 天' + CLOSE('span') : '') +
      CLOSE('div') +
      '<div class="home-today">' +
        '<div class="home-today-hd">今天练这 ' + list.length + ' 个' + CLOSE('div') +
        (chips ? '<div class="home-chips">' + chips + CLOSE('div')
               : '<p class="home-note">这一刻没有排进「在学」的字，请老师看一下字表。</p>') +
        '<p class="home-note">每学会 20% 多亮一颗星</p>' +
      CLOSE('div') +
      '<div class="home-foot">' +
        '<button type="button" class="home-go" id="homeGo">开始今天的学习</button>' +
      CLOSE('div') +
    CLOSE('div'));
  homeFootRefresh();
}
/* 主页 → 今日字卡。主页只负责「看清楚」，认字还是要在字卡上一张张过。 */
function homeGo(){
  if (!STATE.cur) return;
  if (!STU_HOME.list || !STU_HOME.list.length){ toast('还没有要练的字，请老师先选字表'); return; }
  if (!STATE.curType){ toast('请老师先给这位同学勾选练习题型'); return; }
  renderPreStudy();
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
  var play = $('scrPlay');
  if (play && play.classList) play.classList.remove('is-home');
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
        '<button type="button" class="pre-back" id="preBack">返回主页</button>' +
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
  var stu = STATE.cur;
  /* 从「今天还没练完的第一个题型」接着往下走：孩子刚看完字卡，
     该练的就是下一个没做完的，而不是永远从第一个题型重头来。 */
  var t = sessNext(stu) || (stu && sessTypes(stu).length ? sessTypes(stu)[0] : STATE.curType);
  if (!t){ toast('请老师先给这位同学勾选练习题型'); return; }
  STATE.curType = t;
  startQuiz(t);
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

/* 冲突打分。两种冲突要分开算，因为它们该不该容忍完全不一样：
     硬冲突 = 同屏字块能拼出「词库里另一个词」（大小、大河…）——v25 起就不允许，
              孩子拼出来一定判错，所以永远不接受；
     软冲突 = 能拼出「常见搭配表」里的词（一人 / 人头 / 人大）——它确实是词，
              只是不在本题那三个里，孩子拼了会困惑，属于「最好避开」。
   返回：有硬冲突 → 1000（当无穷大用）；否则返回软冲突对数（0、1、2…）。 */
function wbCrossScore(words, byW, cross){
  var chars = [], seen = {}, i, j, k, t, isTarget, hard = 0, soft = 0;
  for (i = 0; i < words.length; i++){
    if (!seen[words[i].a]){ seen[words[i].a] = 1; chars.push(words[i].a); }
    if (!seen[words[i].b]){ seen[words[i].b] = 1; chars.push(words[i].b); }
  }
  for (i = 0; i < chars.length; i++){
    for (j = 0; j < chars.length; j++){
      if (i === j) continue;
      t = chars[i] + chars[j];
      if (!byW[t] && !(cross && cross[t])) continue;
      isTarget = false;
      for (k = 0; k < words.length; k++){ if (words[k].w === t) isTarget = true; }
      if (isTarget) continue;
      if (byW[t]) hard++; else soft++;
    }
  }
  return hard ? 1000 : soft;
}
/* 老接口：只回答「这组有没有冲突」，返回空串表示没有。 */
function wbCrossHit(words, byW, cross){
  return wbCrossScore(words, byW, cross) ? 'hit' : '';
}

function buildWordGroups(pool, groupN, stu, focusPool){
  var bank = wordBank(true), poolMap = {}, fSet = null;
  var i, j, k, cand = [], wd, ca, cb, groups = [], cur = [], taken = {};
  var out = [], tiles, c;
  /* 这个学生的册次水平（字表册次的中间值）：词的难度都拿它比。
     一年级学「一」的孩子到不了「统」（六上），所以「统一」不会出现；
     六年级学「统」的孩子本来就在那一册，出现就正常（老师 2026-10-29）。 */
  var lv = stuStageLevel(stu);
  for (i = 0; i < pool.length; i++) poolMap[pool[i].w] = pool[i];
  if (focusPool && focusPool.length){
    fSet = {};
    for (i = 0; i < focusPool.length; i++) fSet[focusPool[i].w] = 1;
  }
  for (i = 0; i < bank.list.length; i++){
    wd = bank.list[i]; ca = poolMap[wd.a]; cb = poolMap[wd.b];
    if (!ca && !cb) continue;
    if (!wordFitsStu(ca, cb, wd.a, wd.b, lv)) continue;
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
  var allUsed = {}, usedW = {}, k, c2, best, bestScore, rep, sc, guard, fresh;
  var cross = crossSet();
  /* 凑满一组（3 个词、6 个字块互不共用）。
     软冲突预算 K 从 0 起：先追求「一个都拼不出本组以外的词」；
     字表太小凑不满 3 个时，把 K 放到 1、2、3 再试 —— 前一档选好的词不丢，
     只在补进来的那个上让步。这样「避开撞词」和「一定能出题」不会互相挤掉，
     也不会像一刀切那样，一凑不满就整组退回只查词库的老状态。 */
  function fillGroup(){
    var c3 = [], tk = {}, dead = {}, bv, bs, j2, x, r2, s2, g2 = 0, K = 0, sc3;
    while (c3.length < WB_PER_GROUP){
      if (g2++ > 600) break;
      bv = null; bs = 1e9;
      for (j2 = 0; j2 < cand.length; j2++){
        x = cand[j2];
        if (dead[x.w]) continue;
        if (tk[x.a] || tk[x.b]) continue;
        r2 = (allUsed[x.a] ? 1 : 0) + (allUsed[x.b] ? 1 : 0);
        /* 先保「两个字都学过」（tier 0），再尽量不重复用字（rep），
           最后才看掌握程度；前面组已经出过的词压到最低，避免整组重复 */
        s2 = (usedW[x.w] ? 10000 : 0) + x.tier * 100 + r2 * 10 + x.wt;
        if (s2 < bs){ bs = s2; bv = x; }
      }
      if (!bv){
        /* 已经凑到 2 个词就收手：宁可这一组少一个词，也不放宽冲突。
           老师 2026-10-29 原话「如果一些基础汉字容易撞的话，你可以只拼两个词语，
           其他的就三个词」—— 少一个词孩子只会少做一点，撞词会让他以为程序坏了。
           连 2 个都凑不出（字数太少）才退一步放宽，保证还能出题。 */
        if (c3.length >= 2) break;
        if (K < 3){ K++; dead = {}; g2 = 0; continue; }
        break;
      }
      sc3 = wbCrossScore(c3.concat([bv]), bank.byW, cross);
      if (sc3 >= 1000 || sc3 > K){ dead[bv.w] = 1; continue; }   /* 硬冲突永不接受 */
      c3.push(bv); tk[bv.a] = 1; tk[bv.b] = 1;
    }
    return { words: c3, taken: tk };
  }
  for (i = 0; i < groupN; i++){
    var got = fillGroup();
    cur = got.words; taken = got.taken;
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
  /* 从哪进来的都把当前题型摆正：顶部标签的高亮和「第几个圆点亮着」跟着它走 */
  if (type) STATE.curType = type;
  renderTypeTabs();
  renderTypeProg();
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
                   answered: false, promptUsed: 0,
                   missed: 0, wrongLogged: false, retried: 0 };
    $('qTotal').textContent = String(wgs.length);
    if (isDrill){
      var wl = [];
      for (i2 = 0; i2 < tp.length; i2++) wl.push(tp[i2].w);
      renderDrillBar(wl);
    }
    renderStage();
    return;
  }

  if (pool.length < 4 && !isWriteType(type)){
    setHTML($('stage'), '<div class="empty-tip">这位同学的字表只有 ' + pool.length + ' 个字，练这个题型至少要 4 个。请老师再选几个字。</div>');
    $('qNow').textContent = '0'; $('qTotal').textContent = '0';
    return;
  }
  /* 手写题型不靠选项，一个字的字表也能练；但写 6 个词对特需孩子已经够多了 */
  if (isWriteType(type)){
    if (total > WRITE_MAX) total = WRITE_MAX;
    if (isFocus && tp.length < total) total = tp.length;
    if (total < 1) total = 1;
  }
  STATE.quiz = { type: type,
                 qs: isWriteType(type)
                   ? buildWriteQuestions(type, tp, total, stu, isFocus ? tp : null)
                   : buildQuestions(pool, total, stu, isFocus ? tp : null),
                 i: 0, right: 0, prompts: 0, answered: false, promptUsed: 0,
                 missed: 0, wrongLogged: false, retried: 0 };
  if (!STATE.quiz.qs.length){
    /* 词语听写最容易撞上这种：字表里的字在组词栏里一个词都没有 */
    setHTML($('stage'), '<div class="empty-tip">这位同学的字表还凑不出词语。请老师在「学哪些字」里多加几个字，或者到「词库」里给这些字补几个词。</div>');
    STATE.quiz = null;
    $('qNow').textContent = '0'; $('qTotal').textContent = '0';
    return;
  }
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
  /* 手写题型（v25，v27 把听写拆成单字 / 词语两个）：没有选项，自己一套渲染 */
  if (isDictation(type)){ renderDictation(q, head); return; }
  if (type === '描红汉字'){ renderTrace(q, head); return; }

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
    resetQState();
    bindStage();
    syncHelpBar();
    /* 题目先显示出来，让孩子看清界面再开口，不要一渲染就念 */
    setTimeout(function(){ readQuestion(); }, PACE.ready * 1000);
    return;
  }

  for (i = 0; i < q.opts.length; i++){ opts += optCardHTML(q.opts[i]); }
  setHTML(stage, head + body + '<div class="opts four">' + opts + CLOSE('div'));
  resetQState();
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
  resetQState();
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

/* ------------------------- 手写题型：汉字听写 / 描红汉字（v25，T-018） -------------------------
   用户 2026-10-28：「需要增加两个题型，一个是汉字词语听写，给一个方框给学生默写。
   还有一个是描红汉字。」

   这两个题型的共同点：没有选项可点。听写的答案根本不在屏幕上，描红的答案已经给在屏幕上。
   离线单文件没有手写识别，所以不伪装成「自动判分」：
     · 听写：写完点「写好了」→ 每个方框里浮出正确的字（浅绿）→ 孩子和老师对一下
       → 「写对了」或「没写好，重写」。重写不判死，一题最多记 1 次错（同 T-016 口径）。
     · 描红：照着浅灰的字描完 → 「描完了」→ 直接过，但记的是「辅助完成」（hinted/prompts），
       不记 alone。照着描不等于认出来了，否则描两遍就进「已掌握」，档案会骗老师。

   两条硬约束：
     ① 门禁测试跑在 jsdom 上，它没有 canvas 实现（getContext 返回 null）。所有绘制先判空，
        结构（几个方框、几个按钮）必须不依赖画布就能测。
     ② 平板上写字不能带着页面一起滚，canvas 必须 touch-action:none。
   -------------------------------------------------------------------------------------- */
var WG = { boxes: [] };

/* 听写写哪个词：优先字库「组词」栏的第一个词（和字卡上显示的一致），
   只收 1~4 个字且确实包含这个字的，防止组词栏里混进成语或半截词。
   没有组词就听写单字，不留空格子。 */
function writeWordOf(c){
  var w = firstWordOf(c);
  if (w && w.length >= 1 && w.length <= 4 && w.indexOf(c.w) >= 0) return w;
  return '';
}
function wgAnswerOf(q, type){
  if (!q) return '';
  /* 只听单字的题型（汉字听写 / 描红）答案永远是那一个字；只有词语听写要拼整词。
     type 可以不传：默认读当前题型，测试里直接传更省事。 */
  var t = type || (STATE.quiz && STATE.quiz.type);
  if (writesWord(t)) return q.text || q.target.w;
  return q.target.w;
}
/* 出题：汉字听写一个字一题；词语听写只从「组词栏里查得到词」的字里挑，
   挑不出词就不出这道题（宁可少一个题型，也不要名字叫词语听写、实际写单字）。 */
function buildWriteQuestions(type, pool, n, stu, focusPool){
  var src = focusPool || pool, cand = [], targets, qs = [], i, w;
  if (writesWord(type)){
    for (i = 0; i < src.length; i++){
      w = writeWordOf(src[i]);
      if (w && w.length >= 2 && w.length <= 4) cand.push(src[i]);
    }
    src = cand;
  }
  targets = pickTargets(src, n, stu);
  for (i = 0; i < targets.length; i++){
    qs.push({ target: targets[i], text: writesWord(type) ? writeWordOf(targets[i]) : '' });
  }
  return qs;
}

/* ------------------------- 画布 ------------------------- */
function wgSize(b){
  var cv = b.cv, r, w, h, dpr, ctx;
  if (!cv || !cv.getBoundingClientRect) return;
  r = cv.getBoundingClientRect();
  w = Math.round(r.width); h = Math.round(r.height);
  /* 隐藏/未布局时量到 0：这时不要动 canvas.width，否则退回到默认 300×150 会拉花 */
  if (!w || !h) return;
  b.w = w; b.h = h;
  dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  ctx = b.ctx = (cv.getContext ? cv.getContext('2d') : null);
  if (!ctx) return;                       /* jsdom 没有 canvas 实现，走到这里就停 */
  if (ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  wgRedraw(b);
}
function wgPen(ctx){
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1B242C';
  ctx.fillStyle = '#1B242C';
}
function wgRedraw(b){
  var ctx = b.ctx, i, j, s;
  if (!ctx || !ctx.clearRect) return;
  ctx.clearRect(0, 0, b.w || 1, b.h || 1);
  wgPen(ctx);
  for (i = 0; i < b.strokes.length; i++){
    s = b.strokes[i];
    if (!s.length) continue;
    /* 一个点也是一笔（顿笔），别让它凭空消失 */
    if (s.length === 1){
      ctx.beginPath();
      ctx.arc(s[0].x, s[0].y, 5, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(s[0].x, s[0].y);
    for (j = 1; j < s.length; j++) ctx.lineTo(s[j].x, s[j].y);
    ctx.stroke();
  }
}
function wgPoint(b, ev){
  var r = b.cv.getBoundingClientRect();
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}
function wgBindOne(b){
  var cv = b.cv;
  if (!cv || !cv.addEventListener) return;
  cv.addEventListener('pointerdown', function(ev){
    /* free = 不属于练习的方框（认字乐园里的描写）：那里没有 STATE.quiz，也不该被它挡住 */
    if (!b.free && STATE.quiz && STATE.quiz.answered) return;
    b.cur = [wgPoint(b, ev)];
    b.strokes.push(b.cur);
    if (cv.setPointerCapture && ev.pointerId !== undefined){
      try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
    }
    if (ev.preventDefault) ev.preventDefault();
  });
  cv.addEventListener('pointermove', function(ev){
    var ctx = b.ctx, n, s;
    if (!b.cur) return;
    n = b.cur.length;
    b.cur.push(wgPoint(b, ev));
    /* 边写边画：只补最后一小段，不用整块重绘，笔迹才跟手 */
    s = b.cur;
    if (ctx && s.length >= 2){
      wgPen(ctx);
      ctx.beginPath();
      ctx.moveTo(s[n - 1].x, s[n - 1].y);
      ctx.lineTo(s[n].x, s[n].y);
      ctx.stroke();
    }
    if (ev.preventDefault) ev.preventDefault();
  });
  function end(){
    if (!b.cur) return;
    b.cur = null;
    wgRedraw(b);            /* 收笔重画一遍，补上单点顿笔 */
  }
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  cv.addEventListener('pointerleave', end);
}
/* 方框多大：行宽除以个数。不用 CSS 的 aspect-ratio —— 教室那台平板是不是
   iOS 15 以上不确定，量出来再写死 px 最稳，顺带把底字的字号一起定下来
   （字要占格子约 76%，太大就画出格，太小又看不清笔画）。 */
function wgLayout(){
  var row = document.getElementById('wgRow'), n = WG.boxes.length, avail, size, i, gap = 14, el;
  if (!row || !n) return;
  avail = row.clientWidth || 0;
  if (!avail) return;                     /* 还没布局（或 jsdom）：留着 CSS 的兜底尺寸 */
  size = Math.floor((avail - gap * (n - 1)) / n);
  if (size > 300) size = 300;
  if (size < 96) size = 96;
  for (i = 0; i < n; i++){
    el = WG.boxes[i].el;
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    if (el.style.setProperty) el.style.setProperty('--wg-fs', Math.round(size * 0.76) + 'px');
  }
}
function wgInit(){
  var list = document.querySelectorAll('#stage .wg-box'), i, el, cv;
  WG.boxes = [];
  for (i = 0; i < list.length; i++){
    el = list[i];
    cv = el.querySelector('canvas');
    if (!cv) continue;
    WG.boxes.push({ el: el, cv: cv, ctx: null, strokes: [], cur: null, w: 0, h: 0 });
  }
  wgLayout();
  for (i = 0; i < WG.boxes.length; i++){ wgSize(WG.boxes[i]); wgBindOne(WG.boxes[i]); }
  /* 首帧字号/滚动条还没落定，量到的宽度会差几像素；下一拍再量一次。
     不挂 requestAnimationFrame —— 后台标签页可能整页都不执行。 */
  setTimeout(function(){
    wgLayout();
    for (var j = 0; j < WG.boxes.length; j++) wgSize(WG.boxes[j]);
  }, 80);
}
function wgHasInk(){
  for (var i = 0; i < WG.boxes.length; i++){ if (WG.boxes[i].strokes.length) return true; }
  return false;
}
function wgClear(){
  var i, b;
  for (i = 0; i < WG.boxes.length; i++){
    b = WG.boxes[i];
    b.strokes = [];
    b.cur = null;
    wgRedraw(b);
  }
}
function wgBoxHTML(i, ghost){
  return '<div class="wg-box" data-wg="' + i + '">' +
    (ghost ? '<span class="wg-ghost">' + esc(ghost) + CLOSE('span') : '') +
    '<span class="wg-ans"></span>' +
    '<canvas></canvas>' +
  CLOSE('div');
}

/* ------------------------- 渲染 ------------------------- */
function renderDictation(q, head){
  var word = wgAnswerOf(q), i, boxes = '';
  for (i = 0; i < word.length && i < 4; i++) boxes += wgBoxHTML(i, '');
  /* 说明不在这块里再写一遍：顶部 q-ask 已经是 TYPE_DESC 那句，重复两遍孩子只会更乱。
     顺序是「方框 → 写好了 → 擦掉/再听」：主按钮贴着写字区，辅助操作放它下面。 */
  setHTML($('stage'), head +
    '<div class="wg-row" id="wgRow">' + boxes + CLOSE('div') +
    '<div class="wg-foot" id="wgFoot">' +
      '<button type="button" class="wg-main" data-wg-act="done">写好了</button>' +
      '<span class="wg-tip">写完点这里，我们一起看对不对</span>' +
    CLOSE('div') +
    '<div class="wg-tools">' +
      '<button type="button" class="ghost-btn" data-wg-act="say" id="wgPlay">再听一遍</button>' +
      '<button type="button" class="ghost-btn" data-wg-act="clear">擦掉重写</button>' +
    CLOSE('div'));
  resetQState();
  bindStage();
  syncHelpBar();
  wgInit();
  setTimeout(function(){ readQuestion(); }, PACE.ready * 1000);
}
function renderTrace(q, head){
  setHTML($('stage'), head +
    '<div class="wg-row" id="wgRow">' + wgBoxHTML(0, q.target.w) + CLOSE('div') +
    '<div class="wg-foot" id="wgFoot">' +
      '<button type="button" class="wg-main" data-wg-act="done">描完了</button>' +
    CLOSE('div') +
    '<div class="wg-tools">' +
      '<button type="button" class="ghost-btn" data-wg-act="say">念一遍这个字</button>' +
      '<button type="button" class="ghost-btn" data-wg-act="clear">擦掉重描</button>' +
    CLOSE('div'));
  resetQState();
  bindStage();
  syncHelpBar();
  wgInit();
  setTimeout(function(){ readQuestion(); }, PACE.ready * 1000);
}

/* ------------------------- 作答 ------------------------- */
/* 记一次「没写好」。和 missOption 同一口径：一题最多记 1 次错，
   重写是给他机会，不该双重惩罚，否则 n 和 wrong 会一路涨。 */
function logWriteMiss(){
  var q = curQ(), stu = STATE.cur, r;
  if (!q || !stu || !STATE.quiz || STATE.quiz.wrongLogged) return false;
  r = getLog(stu.name, q.target.w);
  r.n++;
  r.wrong++;
  r.prompts += STATE.quiz.promptUsed;
  r.last = nowISO();
  r.level = levelOf(r);
  r.dirty = true;
  flushLogs();
  STATE.quiz.wrongLogged = true;
  return true;
}
function wgReveal(){
  var q = curQ(), word = wgAnswerOf(q), i, b, el;
  for (i = 0; i < WG.boxes.length && i < word.length; i++){
    b = WG.boxes[i];
    el = b.el.querySelector('.wg-ans');
    if (el) el.textContent = word.charAt(i);
    if (b.el.classList) b.el.classList.add('reveal');
  }
}
function wgHideAns(){
  var i, b, el;
  for (i = 0; i < WG.boxes.length; i++){
    b = WG.boxes[i];
    el = b.el.querySelector('.wg-ans');
    if (el) el.textContent = '';
    if (b.el.classList) b.el.classList.remove('reveal');
  }
}
function wgFootWrite(){
  setHTML($('wgFoot'), '<button type="button" class="wg-main" data-wg-act="done">写好了</button>' +
    '<span class="wg-tip">慢一点，一笔一笔写</span>');
}
function wgToolsShow(on){
  var el = document.querySelector('#stage .wg-tools');
  if (el) el.hidden = !on;
}
function wgDone(){
  var q = curQ();
  if (!q || !STATE.quiz || STATE.quiz.answered) return;
  if (!wgHasInk()){ sfxTap(); toast('先在方框里写一写'); return; }
  if (STATE.quiz.type === '描红汉字'){ wgFinishTrace(); return; }
  /* 听写：这一下只「亮答案」，不判分 —— 判分要靠人看一眼 */
  STATE.quiz.checked = true;
  wgReveal();
  setHTML($('wgFoot'), '<button type="button" class="wg-main" data-wg-act="ok">写对了</button>' +
    '<button type="button" class="ghost-btn" data-wg-act="miss">没写好，重写</button>');
  /* 「擦掉重写」在这一步收起来：下面已经有「没写好，重写」了，两个重写并排会点错 */
  wgToolsShow(false);
  sfxPop();
  toast('对照一下，写对了吗');
}
function wgOk(){
  if (!STATE.quiz || STATE.quiz.answered) return;
  gradeAnswer(true);
}
function wgMiss(){
  if (!STATE.quiz || STATE.quiz.answered) return;
  logWriteMiss();
  sfxNo();
  wgClear();
  wgHideAns();
  wgFootWrite();
  wgToolsShow(true);
  STATE.quiz.checked = false;
  toast('再写一次，慢慢来');
  /* 等错误音过去再念，两个声音不叠在一起 */
  setTimeout(function(){
    if (STATE.quiz && !STATE.quiz.answered) readTarget();
  }, 520);
}
function wgFinishTrace(){
  /* 描红记「辅助完成」：promptUsed 置 1 → gradeAnswer 走 hinted++ / prompts++。
     不记 alone 是刻意的（见本节开头）。 */
  STATE.quiz.promptUsed = 1;
  gradeAnswer(true);
}
/* 老师按「提示一下」：听写直接把答案亮出来（记一次辅助），描红把底字加深 */
function wgHint(){
  var q = curQ(), b;
  if (!q || !STATE.quiz) return;
  STATE.quiz.promptUsed++;
  sfxPop();
  if (STATE.quiz.type === '描红汉字'){
    b = WG.boxes[0];
    if (b && b.el.classList) b.el.classList.add('hint');
    toast('底下的字加深了，沿着它描');
  } else {
    wgReveal();
    toast('答案亮出来了，照着写（这次记一次辅助）');
  }
  readTarget();
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
  /* 词语听写要听的是「词」，不是那个字：念成单字，孩子就不知道要写两个格子。
     汉字听写反过来——只听一个字，念成词就等于给了额外提示。 */
  var txt = writesWord(STATE.quiz && STATE.quiz.type) ? wgAnswerOf(q) : q.target.w;
  var ok = speak(txt);
  readHint($('pyHint'), ok, q.target.p || txt);
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
  /* 听写：说明 + 停一拍 + 念那个词/字。这个词就是题目本身，必须念；
     念完要停够（afterAsk），孩子得听完才知道有几个字要写。
     两个听写共用同一句题面语音：新加一句就要动 SENTS / p_voice / SENT_FULL 三处，
     而这句「听一听，写下来。」对单字和词语都成立，没必要为它多一条音频。 */
  if (isDictation(type)){
    return [{ t: '听一听，写下来。', gap: PACE.afterAsk }, { t: wgAnswerOf(q, type) }];
  }
  /* 描红：字已经摆在屏幕上了，念一遍是帮他认，不是给答案 */
  if (type === '描红汉字'){
    return [{ t: '照着描一遍。', gap: PACE.afterAsk }, { t: w }];
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
/* 每道新题把「这一题自己的状态」清干净。missed / wrongLogged 是 T-016 加的：
   点错不再判死，所以「这题错了几次」「这次错有没有记进档案」要跟着题目走，
   不能留到下一题（否则第 2 题错第一次就不记档案了）。 */
function resetQState(){
  STATE.quiz.answered = false;
  STATE.quiz.promptUsed = 0;
  STATE.quiz.missed = 0;
  STATE.quiz.wrongLogged = false;
  STATE.quiz.picked = '';
  /* 听写「亮过答案没有」。跟着题目走：上一题亮过，下一题不能继承 */
  STATE.quiz.checked = false;
}
function optEl(ch){
  var all = document.querySelectorAll('#stage .opt'), i;
  for (i = 0; i < all.length; i++){
    if (all[i].getAttribute('data-c') === ch) return all[i];
  }
  return null;
}
function pickOption(ch){
  var q = curQ();
  if (!q || STATE.quiz.answered) return;
  STATE.quiz.picked = ch;
  /* 点错不判死：把它试过的那个变灰，剩下的还能点（T-016）。
     旧版这里直接 gradeAnswer(false)，一错就锁死，孩子只能点「下一题」。 */
  if (ch !== q.target.w){ missOption(ch); return; }
  gradeAnswer(true);
}
/* 点错一次：记一次错（一题最多记一次）→ 变灰 + 抖 + 错误音 → 继续等他自己找对的。
   只有连错 2 次才把正确项亮出来并念一遍：这时「测」已经失败了，目的改成教会他。 */
function missOption(ch){
  var q = curQ(), el, r, stu, nth;
  if (!q || STATE.quiz.answered) return;
  nth = STATE.quiz.missed = (STATE.quiz.missed || 0) + 1;
  stu = STATE.cur;
  if (stu && !STATE.quiz.wrongLogged){
    /* 宽松口径：一题最多记 1 次错。重试的目的是「给他机会」，不该双重惩罚。
       n 也在这时 +1 —— 一题「错一次再对」真的练了两次（错一次、对一次），
       这样 alone + hinted + wrong === n 这条不变量才不会被破坏。 */
    r = getLog(stu.name, q.target.w);
    r.n++;
    r.wrong++;
    r.prompts += STATE.quiz.promptUsed;
    r.last = nowISO();
    r.level = levelOf(r);
    r.dirty = true;
    flushLogs();
    STATE.quiz.wrongLogged = true;
  }
  sfxNo();
  el = optEl(ch);
  if (el) el.classList.add('miss');
  toast(nth >= 2 ? '看这个亮的，就是它' : '再试试别的');
  if (nth === 2){
    el = optEl(q.target.w);
    if (el){
      el.classList.add('glow');
      setTimeout(function(){ if (el) el.classList.remove('glow'); }, 2600);
    }
    /* 等错误音过去再念，两个声音不叠在一起 */
    setTimeout(function(){
      if (STATE.quiz && !STATE.quiz.answered) readTarget();
    }, 460);
  }
}
function gradeAnswer(right){
  var q = curQ();
  if (!q) return;
  /* 答错不再在这里判死（pickOption 会转给 missOption）。
     保留这个入口，是为了万一有调用方传 false 也落到同一套「不判死」逻辑上。 */
  if (!right){ missOption(STATE.quiz.picked || ''); return; }
  STATE.quiz.answered = true;
  var stu = STATE.cur, r = getLog(stu.name, q.target.w);
  r.n++;
  if (STATE.quiz.promptUsed) r.hinted++; else r.alone++;
  /* 试过才答对：本次练习记一笔，结算页报「其中 N 题是试了再答对的」。
     不落库 —— 云端日志 schema 没有这一列，写进去也会被同步覆盖成 0（比不写更糟）。 */
  if (STATE.quiz.wrongLogged) STATE.quiz.retried = (STATE.quiz.retried || 0) + 1;
  STATE.quiz.right++;
  r.prompts += STATE.quiz.promptUsed;
  r.last = nowISO();
  r.level = levelOf(r);
  r.dirty = true;
  flushLogs();

  var all = document.querySelectorAll('#stage .opt'), i, el;
  for (i = 0; i < all.length; i++){
    el = all[i];
    if (el.getAttribute('data-c') === q.target.w) el.classList.add('right');
  }
  sfxOk();
  /* 描红没有「对错」，只有「写完了」，说「答对了」孩子会以为自己在做题 */
  var okTxt = (STATE.quiz.type === '描红汉字') ? '写好了！' : '答对了！';
  /* 先响音效，停一下再开口说「答对了」，两个声音不叠在一起 */
  setTimeout(function(){
    if (STATE.quiz && STATE.quiz.answered) say(okTxt);
  }, PACE.afterOk * 1000);
  var tail = '<div class="feedback ok">' + okTxt +
    '<button type="button" class="help-btn" id="btnGo" style="margin-left:auto">下一题</button>' +
    CLOSE('div');
  var host = document.querySelector('#stage .opts');
  if (host) insertAfter(host, tail); else appendToStage(tail);
  var go = $('btnGo');
  if (go) go.addEventListener('click', nextQuestion);
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
  /* 手写题型没有「去掉两个错的」可去，提示换成「亮答案 / 加深底字」 */
  if (isWriteType(STATE.quiz.type)){ wgHint(); return; }
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
  /* 题型进度：走到结算页才算「这个题型今天做完了」。
     全部做完时不管这轮正确率多少都给庆祝音 —— 今天该练的都练完了，这件事本身值得夸。 */
  var stu = STATE.cur;
  sessMark(z.type);
  var nextT = sessNext(stu), allDone = !nextT, typeN = sessTypes(stu).length;
  if (allDone) msg = '太棒了！';
  /* 全部练完时念一句自己的话（录过整句），不然「今天练完了」这件事全靠屏幕字 */
  var sayWhat = allDone ? '今天的练习全部完成。' : msg;
  if (rate >= 70 || allDone) sfxWin(); else sfxNo();
  /* 先让庆祝音效放完，再报结果，别两个声音挤在一起 */
  setTimeout(function(){
    if (STATE.quiz === z) say(sayWhat);
  }, 800);
  var btns, arrow;
  /* 箭头用 SVG 不用「→」字符：字符在不同字体里大小和基线都不一样，拼进胶囊里会歪 */
  arrow = '<svg class="nt-ar" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path d="M4 12h14M13 6l6 6-6 6"/>' + CLOSE('svg');
  /* 老师 2026-10-30：「这个方框去下一个题型很长也很生硬很奇怪啊很丑」——
     原来是整行 100% 宽的深绿大板子。改成**按内容宽度的胶囊**：
     左边小字「下一个题型」说明这是干什么的，右边大字是题型名，一眼知道去哪。 */
  if (allDone){
    btns = '<button type="button" class="primary next-type" id="btnHome2">' +
             '<span class="nt-v">回我的主页</span>' + CLOSE('button') +
           '<div class="row" style="justify-content:center;margin-top:12px">' +
             '<button type="button" class="secondary" id="btnAgain">再练一轮</button>' +
           CLOSE('div');
  } else {
    btns = '<button type="button" class="primary next-type" id="btnNextType">' +
             '<span class="nt-k">下一个题型</span>' +
             '<span class="nt-v">' + esc(nextT) + CLOSE('span') + arrow + CLOSE('button') +
           '<div class="row" style="justify-content:center;margin-top:12px">' +
             '<button type="button" class="secondary" id="btnAgain">这个题型再练一轮</button>' +
             '<button type="button" class="secondary" id="btnHome2">回我的主页</button>' +
           CLOSE('div');
  }
  var html = '<div class="q-head"><div class="q-ask">这一轮练完了</div></div>' +
    /* 全部做完时加一块大字提示，但**正确率照样留着** —— 只排了一个题型的学生，
       第一次做完就等于「全部完成」，不能因此让他看不到分数（v26 第一版踩过）。 */
    (allDone
      ? '<div class="done-hero">今天的练习全部完成</div>' +
        '<div class="prog-note" style="text-align:center">' + typeN + ' 个题型都练过了，真棒</div>'
      : '') +
    '<div class="big-char" style="font-size:' + (allDone ? '60px' : '74px') + '">' + rate + '%</div>' +
    '<div class="star-row" style="justify-content:center">' + starHTML + CLOSE('div') +
    /* 鼓励语用 .fb-say（透明底纯文字），不能再用 .feedback（有底色+描边，看着像按钮） */
    '<div class="fb-say">' + esc(msg) + CLOSE('div') +
    /* 重试不扣分（结算页是给孩子的激励），但要让老师一眼看出这轮是靠试出来的 */
    (z.retried ? '<div class="prog-note" style="text-align:center;margin-top:8px">其中 ' +
      z.retried + ' 题是试了再答对的</div>' : '') +
    '<div class="sum-actions">' + btns + CLOSE('div');
  $('qNow').textContent = String(done);
  setHTML($('stage'), html);
  renderTypeProg();
  var a = $('btnAgain'), b = $('btnNextType'), c = $('btnHome2');
  if (a) a.addEventListener('click', function(){ startQuiz(STATE.quiz.type); });
  if (b) b.addEventListener('click', function(){
    STATE.curType = nextT;
    renderTypeTabs();
    startQuiz(nextT);
  });
  if (c) c.addEventListener('click', function(){ renderStuHome(); });
  syncHelpBar();
}
