/* =====================================================================
   老师端：学生建档（含真实照片）/ 字库 / 词库 / 进度总览  +  初始化
   ===================================================================== */

/* 数据表绑定标记：属性必须直接写在标签字面量里（lint 只在 <tag ...> 内识别） */
var TAG_STU_SPAN = '<span data-sp-bindable="database" data-sp-database-id="jmNjdfyRjnCNaI3I0UvfRg">';
var TAG_STU_TD   = '<td data-sp-bindable="database" data-sp-database-id="jmNjdfyRjnCNaI3I0UvfRg">';
var TAG_STU_NM   = '<span class="stu-nm" data-sp-bindable="database" data-sp-database-id="jmNjdfyRjnCNaI3I0UvfRg">';
var TAG_LIB_SPAN = '<span class="lib-cell" data-sp-bindable="database" data-sp-database-id="xNa5qeVuLMCljcIzP5Ey5V">';
var TAG_LOG_DIV  = '<div class="n" data-sp-bindable="database" data-sp-database-id="YPUjH8fNLVMazG0BA9gciK">';

var TEA_TAB = 'stu';
var EDIT_STU = null, EDIT_LIB = null, EDIT_WD = null;
var PHOTO_URL = '', LIB_PIC_URL = '', WD_PIC_URL = '';

/* ------------------------- 打开 / 分页 ------------------------- */
function openTeacher(){
  sayStop();
  STATE.prevPhase = STATE.phase;
  showScreen('teacher');
  renderTeacher();
}
function renderOfflineNote(){
  var el = $('teaOffline');
  if (!el) return;
  if (STATE.cloudOk === false){
    el.hidden = false;
    setHTML(el, '<b>数据存在这台电脑上。</b>没连上云端（可能没登录，或网络不通），不影响建档和上课；' +
      '但换电脑、清理浏览器会看不到，建议每周点一次下面「导出备份」。');
  } else {
    el.hidden = true;
  }
}
function renderTeacher(){
  var tabs = document.querySelectorAll('.tea-tab'), i;
  for (i = 0; i < tabs.length; i++){
    if (tabs[i].getAttribute('data-tp') === TEA_TAB) tabs[i].classList.add('on');
    else tabs[i].classList.remove('on');
  }
  $('tpStu').hidden = (TEA_TAB !== 'stu');
  $('tpLib').hidden = (TEA_TAB !== 'lib');
  $('tpWord').hidden = (TEA_TAB !== 'word');
  $('tpProg').hidden = (TEA_TAB !== 'prog');
  renderOfflineNote();
  paintAppVer();
  /* 学生 tab 有「名单 / 档案」两态，档案开着时切回来还停在档案上 */
  if (TEA_TAB === 'stu'){
    if (PROF_NAME && findStu(PROF_NAME)){ $('stuListView').hidden = true; $('stuProfile').hidden = false; renderStuProfile(); }
    else { PROF_NAME = ''; $('stuProfile').hidden = true; $('stuListView').hidden = false; renderStuList(); }
  }
  if (TEA_TAB === 'lib') renderWordList('lib');
  if (TEA_TAB === 'word') renderWordList('word');
  if (TEA_TAB === 'prog') renderProgress();
}

/* ------------------------- 学生管理 ------------------------- */
/* ------------------- 学生字表（T-005） -------------------
   交互刻意保持老师原来的路径：还是先点「组」，展开后能点掉个别字。
   底层存的是显式字表 STU_CHARS（汉字数组），不是「排除表」——
   这样以后要加跨组挑字、复制给另一个学生、在学上限，都不用再改结构。
   ------------------------------------------------------- */
var STU_CHARS = [];     /* 正在编辑的字表 */
var STU_OPEN = {};      /* 哪几组展开 */
var STU_KW = '';        /* 搜索词 */

function stuCharIdx(w){ return STU_CHARS.indexOf(w); }
function stuCharOn(w){ return STU_CHARS.indexOf(w) >= 0; }
function stuCharToggle(w){
  var i = STU_CHARS.indexOf(w);
  if (i >= 0) STU_CHARS.splice(i, 1); else STU_CHARS.push(w);
  renderStuChars();
}
/* 整组加入 / 移除：整组都选了就移除，否则补齐 */
function stuCharGroupAll(g){
  var chars = expandGroups([g]), i, picked = 0, full;
  for (i = 0; i < chars.length; i++){ if (stuCharOn(chars[i])) picked++; }
  full = (chars.length > 0 && picked === chars.length);
  if (full){
    for (i = 0; i < chars.length; i++){
      var k = STU_CHARS.indexOf(chars[i]);
      if (k >= 0) STU_CHARS.splice(k, 1);
    }
  } else {
    for (i = 0; i < chars.length; i++){
      if (!stuCharOn(chars[i])) STU_CHARS.push(chars[i]);
    }
  }
  renderStuChars();
}
function stuChipHTML(c){
  var on = stuCharOn(c.w);
  return '<button type="button" class="char-chip' + (on ? ' on' : '') + '" data-cw="' + esc(c.w) + '"' +
    ' aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(c.w) + CLOSE('button');
}
function renderStuChars(){
  var host = $('fStuCharList');
  if (!host) return;
  var stat = $('fStuCharStat'), total = STU_CHARS.length, i, j, c, g, html = '', m = charMap();
  if (stat){
    if (!total){
      setHTML(stat, '<span class="char-warn">还没选字，这位同学暂时无法练习</span>');
    } else if (total > 40){
      setHTML(stat, '已选 <b>' + total + '</b> 个字　<span class="char-warn">建议先教 20 个以内</span>');
    } else {
      setHTML(stat, '已选 <b>' + total + '</b> 个字');
    }
  }

  /* 搜索：跨组列出命中字，不受折叠影响（同一个字只列一次） */
  if (STU_KW){
    var kw = STU_KW.toLowerCase(), hits = [], seen = {};
    for (i = 0; i < STATE.chars.length; i++){
      c = STATE.chars[i];
      if (!c || !c.on || !c.w || seen[c.w]) continue;
      if ((c.w + ' ' + (c.p || '') + ' ' + (c.g || '')).toLowerCase().indexOf(kw) >= 0){
        seen[c.w] = true;
        hits.push(c);
      }
    }
    html = '<div class="char-sec">搜索「' + esc(STU_KW) + '」命中 ' + hits.length + ' 个字</div>' +
      '<div class="char-chips">';
    for (j = 0; j < hits.length; j++) html += stuChipHTML(hits[j]);
    html += CLOSE('div');
    setHTML(host, html);
    return;
  }

  var groups = groupOptions();
  for (i = 0; i < groups.length; i++){
    g = groups[i];
    /* 用 expandGroups 取字：它已按汉字去重，和「整组加入/移除」的口径完全一致，
       否则组里 10 条记录但只有 8 个字时，按钮会永远停在「整组加入」 */
    var ws = expandGroups([g]), inG = [], picked = 0;
    for (j = 0; j < ws.length; j++){
      c = m[ws[j]];
      if (!c) continue;
      inG.push(c);
      if (stuCharOn(c.w)) picked++;
    }
    if (!inG.length) continue;
    var open = !!STU_OPEN[g], full = (picked === inG.length);
    html += '<div class="char-grp' + (open ? ' open' : '') + '">' +
      '<div class="char-g-head">' +
        '<button type="button" class="char-g-tog" data-gt="' + esc(g) + '"' +
          ' aria-expanded="' + (open ? 'true' : 'false') + '">' +
          '<span class="char-g-arrow">' + (open ? '▾' : '▸') + '</span>' +
          '<span class="char-g-name">' + esc(g) + '</span>' +
          '<span class="char-g-cnt">' + inG.length + ' 字 / 已选 ' + picked + '</span>' +
        CLOSE('button') +
        '<button type="button" class="char-g-all' + (full ? ' on' : '') + '" data-ga="' + esc(g) + '">' +
          (full ? '整组移除' : '整组加入') + CLOSE('button') +
      CLOSE('div');
    if (open){
      html += '<div class="char-chips">';
      for (j = 0; j < inG.length; j++) html += stuChipHTML(inG[j]);
      html += CLOSE('div');
    }
    html += CLOSE('div');
  }
  if (!html) html = '<div class="char-empty">字库还没分组，请先到「字库」里导入或新增汉字。</div>';
  setHTML(host, html);
}
function bindStuChars(){
  var host = $('fStuCharList');
  if (host && !host.__bound005){
    host.__bound005 = true;
    host.addEventListener('click', function(e){
      var t = e.target;
      while (t && t !== host && !(t.getAttribute && (t.getAttribute('data-cw') || t.getAttribute('data-gt') || t.getAttribute('data-ga')))){
        t = t.parentNode;
      }
      if (!t || t === host || !t.getAttribute) return;
      var w = t.getAttribute('data-cw'), gt = t.getAttribute('data-gt'), ga = t.getAttribute('data-ga');
      if (w !== null && w !== undefined && w !== ''){ stuCharToggle(w); return; }
      if (gt){ STU_OPEN[gt] = !STU_OPEN[gt]; renderStuChars(); return; }
      if (ga){ stuCharGroupAll(ga); return; }
    });
  }
  var sq = $('fStuCharSearch');
  if (sq && !sq.__bound005){
    sq.__bound005 = true;
    sq.addEventListener('input', function(){
      STU_KW = String(sq.value || '').replace(/^\s+|\s+$/g, '');
      renderStuChars();
    });
  }
}
/* 从组名反推：字表来源标签，只用于界面回显与云端镜像，不参与出题 */
function groupsOfChars(chars){
  var out = [], m = charMap(), i, c;
  for (i = 0; i < chars.length; i++){
    c = m[chars[i]];
    if (c && c.g && out.indexOf(c.g) < 0) out.push(c.g);
  }
  return out;
}

/* 名单里一眼能看出谁没配字表 —— 空字表的学生进去练不了，必须显眼 */
function stuCharCellHTML(s){
  var chars = isArr(s.chars) ? s.chars : expandGroups(s.groups || []);
  if (!chars.length) return '<span class="pill a">未选字</span>';
  return '字表 ' + chars.length + ' 字';
}

function renderStuList(){
  var html = '', i, s, p;
  for (i = 0; i < STATE.students.length; i++){
    s = STATE.students[i];
    p = stuProfile(s);
    html += '<tr>' +
      '<td>' + avatarHTML(s, 'mini-av') + TAG_STU_SPAN + esc(s.name) + CLOSE('span') + CLOSE('td') +
      '<td>' + esc(s.types.join('、') || '还没排') + CLOSE('td') +
      '<td>' + stuProgCell(s, p) + CLOSE('td') +
      TAG_STU_TD + esc(s.count) + CLOSE('td') +
      '<td><span class="pill ' + (s.status === '暂停' ? 'gy' : 'g') + '">' + esc(s.status) + CLOSE('span') + CLOSE('td') +
      '<td class="pm-txt">' + esc(sinceText(p.lastAt)) + CLOSE('td') +
      '<td><button type="button" class="primary sm" data-prof="' + esc(s.name) + '">档案</button> ' +
          '<button type="button" class="secondary sm" data-edit="' + esc(s.name) + '">编辑</button> ' +
          '<button type="button" class="danger" data-del="' + esc(s.name) + '">删除</button>' + CLOSE('td') +
    CLOSE('tr');
  }
  setHTML($('stuTbody'), html);
}
/* 四段进度条：每段宽度＝该状态字数 / 字表字数。没有字表时不给 0% 的假进度，直接说未选字 */
function stuProgCell(s, p){
  if (!p.total) return '<span class="pill r">未选字</span>';
  return '<div class="stu-prog">' + progBarHTML(p, 'prog-mini') +
    '<span class="pm-txt"><b>' + p.mastered + '</b>/' + p.total + ' 已掌握' +
    (p.todo ? '　' + p.todo + ' 待学' : '') + '</span>' + CLOSE('div');
}
/* 进度条由四段构成，宽度按各态字数占比算。
   注意：`#profBar` 自己就是 .prog-bar 容器，只往里面塞 <i>，
   不要再套一层 div——嵌套后内层宽度塌成 0，整条会变成一根灰线。 */
function progSegsHTML(p){
  if (!p || !p.total) return '';
  var segs = [['m', p.mastered], ['d', p.doing], ['t', p.tough], ['o', p.todo]];
  var out = '', i, pct;
  for (i = 0; i < segs.length; i++){
    if (!segs[i][1]) continue;
    pct = (segs[i][1] * 100 / p.total).toFixed(1);
    out += '<i class="pg-' + segs[i][0] + '" style="width:' + pct + '%"></i>';
  }
  return out;
}
function progBarHTML(p, cls){
  if (!p || !p.total) return '';
  return '<div class="' + (cls || 'prog-bar') + '" role="img" aria-label="' +
    ('已掌握 ' + p.mastered + '，练习中 ' + p.doing + '，需巩固 ' + p.tough + '，待学 ' + p.todo) +
    '">' + progSegsHTML(p) + CLOSE('div');
}

/* ------------------- 学生档案（T-006 / v12） -------------------
   一个学生一张档案：四态计数 → 逐字网格 → 建议先练 → 只练这几个字。
   逐字网格是老师真正要的东西：知道「他到底哪个字不会」，而不是一个百分比。
   ------------------------------------------------------------- */
var PROF_NAME = '', PROF_CH = '';

function findStu(name){
  var i;
  for (i = 0; i < STATE.students.length; i++){
    if (STATE.students[i].name === name) return STATE.students[i];
  }
  return null;
}
function openStuProfile(name){
  PROF_NAME = name; PROF_CH = '';
  $('stuListView').hidden = true;
  $('stuProfile').hidden = false;
  $('stuForm').hidden = true;
  var box = $('stuProfile');
  if (box && box.scrollIntoView) box.scrollIntoView({ block: 'start' });
  /* 先摆正在学名单再画：否则老数据（还没有 active）会显示「在学 0 / 6」，
     而实际进练习时有 6 个字。看到的和用到的不一致，比数字难看更糟。 */
  var s0 = findStu(name);
  if (s0) syncActive(s0);
  renderStuProfile();
}
function closeStuProfile(){
  PROF_NAME = ''; PROF_CH = '';
  $('stuProfile').hidden = true;
  $('stuListView').hidden = false;
  $('stuForm').hidden = true;
  renderStuList();
}
function profStatHTML(cls, n, label){
  return '<div class="prof-stat ' + cls + '"><b>' + n + CLOSE('b') +
    '<span>' + label + CLOSE('span') + CLOSE('div');
}
function renderStuProfile(){
  var s = findStu(PROF_NAME);
  if (!s){ closeStuProfile(); return; }
  var p = stuProfile(s), av = s.photo || s.photoLocal || '';
  setHTML($('profAv'), av ? '<img src="' + esc(av) + '" alt="">' : esc((s.name || '?').slice(0, 1)));
  $('profName').textContent = s.name;
  var meta = [];
  meta.push(s.status);
  meta.push(s.types.length ? s.types.join(' / ') : '没排题型');
  meta.push('字表 ' + p.total + ' 字');
  meta.push('在学 ' + p.act + ' / ' + p.cap);
  meta.push(p.lastAt ? ('最近练习 ' + sinceText(p.lastAt)) : '还没练过');
  $('profMeta').textContent = meta.join(' · ');
  var pb = $('btnProfPause');
  if (pb) pb.textContent = (s.status === '暂停' ? '设为在读' : '设为暂停');

  setHTML($('profStats'),
    profStatHTML('m', p.mastered, '已掌握') +
    profStatHTML('d', p.doing, '练习中') +
    profStatHTML('t', p.tough, '需巩固') +
    profStatHTML('o', p.todo, '待学'));

  setHTML($('profBar'), progSegsHTML(p));
  setHTML($('profLegend'), p.total ? (
    '<span>掌握率 <b>' + p.rate + '%</b>（' + p.mastered + ' / ' + p.total + '）</span>' +
    '<span>在学 <b>' + p.act + '</b> / 上限 ' + p.cap + '</span>' +
    '<span>排队等学 ' + p.standby + ' 个字</span>' +
    (p.learned < p.total ? '<span>还没碰过 ' + (p.total - p.learned) + ' 个字</span>' : '<span>每个字都练过了</span>')
  ) : '<span>这位同学还没有字表，点右上角「编辑资料与字表」选几个字</span>');

  /* 逐字网格 */
  var html = '', i, it, cls, st, m = charMap();
  var actSet = {}, acts = actList(s), locks = lockList(s);
  for (i = 0; i < acts.length; i++) actSet[acts[i]] = 1;
  for (i = 0; i < p.items.length; i++){
    it = p.items[i];
    cls = it.lv === '已掌握' ? 'm' : (it.lv === '练习中' ? 'd' : (it.lv === '需巩固' ? 't' : 'o'));
    st = actSet[it.w] ? '在学' : (it.lv === '已掌握' ? '已掌握' : '待学');
    html += '<button type="button" class="pgc pgc-' + cls + (PROF_CH === it.w ? ' on' : '') +
      (actSet[it.w] ? ' in-act' : '') + (locks.indexOf(it.w) >= 0 ? ' locked' : '') +
      '" data-pw="' + esc(it.w) + '" title="' + esc(it.w + '：' + it.lv + ' · ' + st) + '">' +
      esc(it.w) + (locks.indexOf(it.w) >= 0 ? '<i class="pgc-lk"></i>' : '') + CLOSE('button');
  }
  if (!html){
    html = '<p class="tips" style="grid-column:1/-1;margin:0">' +
      '还没有字表。点右上角「编辑资料与字表」，按册次整组加入或逐字挑。</p>';
  }
  setHTML($('profGrid'), html);
  renderProfDetail(s, p);

  /* 建议先练 */
  var fx = '', fchars = p.focus.slice(0, 12);
  for (i = 0; i < fchars.length; i++){
    it = null;
    for (var j = 0; j < p.items.length; j++){ if (p.items[j].w === fchars[i]) it = p.items[j]; }
    cls = !it ? 'o' : (it.lv === '已掌握' ? 'm' : (it.lv === '练习中' ? 'd' : (it.lv === '需巩固' ? 't' : 'o')));
    fx += '<span class="pf-chip pgc-' + cls + '">' + esc(fchars[i]) + CLOSE('span');
  }
  if (!fchars) fx = '<span class="tips" style="margin:0">' +
    (p.total ? '整张字表都掌握了，可以给他加新字了。' : '先选字表。') + CLOSE('span');
  setHTML($('profFocus'), fx);
  var drill = $('btnProfDrill');
  if (drill){
    drill.disabled = !fchars.length;
    drill.textContent = fchars.length ? ('只练这 ' + fchars.length + ' 个字') : '只练这几个字';
  }
  var start = $('btnProfStart');
  if (start) start.disabled = !p.total;
}
/* 点一个字：看这个字练了几次、独立答对几次、答错几次、有没有靠提示 */
function renderProfDetail(s, p){
  var box = $('profDetail');
  if (!box) return;
  if (!PROF_CH){ box.hidden = true; setHTML(box, ''); return; }
  var it = null, i;
  for (i = 0; i < p.items.length; i++){ if (p.items[i].w === PROF_CH) it = p.items[i]; }
  if (!it){ box.hidden = true; setHTML(box, ''); return; }
  var r = it.r, c = charMap()[it.w] || {};
  var lvCls = it.lv === '已掌握' ? 'g' : (it.lv === '练习中' ? 'b' : (it.lv === '需巩固' ? 'r' : 'gy'));
  var h = '<div class="pd-top"><b>' + esc(it.w) + CLOSE('b') +
    '<span class="pill ' + lvCls + '">' + esc(it.lv) + CLOSE('span') +
    (c.p ? '<span class="pm-txt">' + esc(c.p) + CLOSE('span') : '') +
    (c.words ? '<span class="pm-txt">' + esc(c.words) + CLOSE('span') : '') +
    '<button type="button" class="secondary" id="btnPdClose" style="margin-left:auto">收起</button>' +
    CLOSE('div');
  if (!r || !r.n){
    h += '<p class="pd-tip">还没练过这个字。点下面「只练这几个字」会把它排进去。</p>';
  } else {
    h += '<div class="pd-row">' +
      '<span>练习次数<b>' + r.n + CLOSE('b') + CLOSE('span') +
      '<span>独立答对<b>' + r.alone + CLOSE('b') + CLOSE('span') +
      '<span>提示后答对<b>' + r.hinted + CLOSE('b') + CLOSE('span') +
      '<span>答错<b>' + r.wrong + CLOSE('b') + CLOSE('span') +
      '<span>最近<b>' + esc(sinceText(r.last)) + CLOSE('b') + CLOSE('span') +
    CLOSE('div');
    if (it.lv === '需巩固'){
      h += '<p class="pd-tip">答错 ' + r.wrong + ' 次、还没有独立答对过。建议先只练这一个字，答对 3 次就算掌握。</p>';
    } else if (it.lv === '已掌握'){
      h += '<p class="pd-tip">独立答对 ' + r.alone + ' 次，答错 ' + r.wrong + ' 次，这个字可以过了。</p>';
    } else if (r.prompts >= 2){
      h += '<p class="pd-tip">用了 ' + r.prompts + ' 次提示才答对，说明还没独立认出来，再单独练几轮。</p>';
    } else {
      h += '<p class="pd-tip">独立答对 ' + r.alone + ' 次，再对 ' + Math.max(0, 3 - r.alone) + ' 次就掌握。</p>';
    }
  }
  /* 在学名单的操作：老师可以手动把某个字拉进来 / 推出去 / 锁住不被自动换掉 */
  var inAct = actList(s).indexOf(it.w) >= 0;
  var locked = lockList(s).indexOf(it.w) >= 0;
  h += '<div class="pd-act">' +
    '<span class="pd-stage">' + (inAct ? '在学（手上这批）' :
      (it.lv === '已掌握' ? '已掌握（已退出在学）' : '待学（排队中）')) + '</span>' +
    '<button type="button" class="secondary" data-say="' + esc(it.w) + '">听一听</button>' +
    (inAct
      ? '<button type="button" class="secondary" data-act-out="' + esc(it.w) + '">先移出在学</button>'
      : '<button type="button" class="secondary" data-act-in="' + esc(it.w) + '">加入在学</button>') +
    '<button type="button" class="secondary' + (locked ? ' on' : '') + '" data-act-lock="' +
      esc(it.w) + '">' + (locked ? '已锁定' : '锁定不换') + '</button>' +
  CLOSE('div');
  if (!inAct && actList(s).length >= stuCap(s)){
    h += '<p class="pd-tip">在学已满 ' + stuCap(s) + ' 个。要加这个字，先从上面移出一个。</p>';
  }
  setHTML(box, h);
  box.hidden = false;
}
function drillStudent(name, chars){
  var s = findStu(name);
  if (!s) return;
  if (!chars.length){ toast('这位同学还没有需要抽练的字'); return; }
  if (!s.types.length){ toast('这位同学还没排练习题型，请先编辑资料'); return; }
  STATE.fromTeacher = true;
  QUIZ_FOCUS = chars.slice();
  enterStudent(name);
}
function pauseStudent(name){
  var s = findStu(name);
  if (!s) return;
  s.status = (s.status === '暂停' ? '在读' : '暂停');
  s.edited = Date.now();
  saveSnap();
  renderStuProfile();
  toast(s.name + '：' + s.status);
  /* 暂停/在读会改变选人页显示（暂停的学生不出现在练习入口），这里同步刷新 */
  renderPick();
}
function openStuForm(name){
  EDIT_STU = null; PHOTO_URL = '';
  var i, s = null;
  if (name){
    for (i = 0; i < STATE.students.length; i++){ if (STATE.students[i].name === name) s = STATE.students[i]; }
    if (!s) return;
    EDIT_STU = s;
    PHOTO_URL = s.photo || s.photoLocal || '';
  }
  $('stuFormTitle').textContent = s ? ('编辑：' + s.name) : '新增学生';
  $('fStuName').value = s ? s.name : '';
  $('fStuCount').value = s ? s.count : 8;
  $('stuPhotoName').textContent = PHOTO_URL ? '已有照片，重新选择会替换。' : '照片可以选，也可以先不选（用姓氏字占位）。';
  $('fStuPhoto').value = '';

  var stOpts = optList(STATE.schemaStu, '状态');
  if (!stOpts.length) stOpts = [{ text: '在读' }, { text: '暂停' }];   /* 离线时没 schema，给兜底 */
  var stHtml = '', j;
  for (j = 0; j < stOpts.length; j++){
    var sel = (s ? s.status : '在读') === stOpts[j].text ? ' selected' : '';
    stHtml += '<option value="' + esc(stOpts[j].text) + '"' + sel + '>' + esc(stOpts[j].text) + CLOSE('option');
  }
  setHTML($('fStuStatus'), stHtml);

  var types = TYPE_ORDER, th = '';
  for (j = 0; j < types.length; j++){
    var on = s && (s.types.indexOf(types[j]) >= 0);
    th += '<label class="chk"><input type="checkbox" data-t="1" value="' + esc(types[j]) + '"' + (on ? ' checked' : '') + '>' + esc(types[j]) + CLOSE('label');
  }
  setHTML($('fStuTypes'), th);

  /* 字表：老数据（还没有 chars）在这里按组展开，保证打开表单看到的就是实际出题范围 */
  STU_CHARS = s ? (isArr(s.chars) ? s.chars.slice() : expandGroups(s.groups || [])) : [];
  STU_OPEN = {}; STU_KW = '';
  var sq = $('fStuCharSearch');
  if (sq) sq.value = '';
  bindStuChars();
  renderStuChars();

  $('stuForm').hidden = false;
  /* 从档案点「编辑」进来：先把档案收起来，保存/取消后再回去 */
  if ($('stuProfile') && !$('stuProfile').hidden) $('stuProfile').hidden = true;
  if ($('stuListView')) $('stuListView').hidden = false;
  if (!s) restoreFormCache();          /* 只有「新增」才回填草稿，编辑已有学生不覆盖 */
  revealForm('stuForm', 'fStuName');
  imgRestore('stu').then(function(b){
    if (b){
      $('stuPhotoName').textContent = '上次选的照片还在，直接点保存就会一起上传。';
    }
  });
}
/* 校验没通过时光弹 toast 不够：老师可能正盯着表单下面，一闪就错过。
   把出问题的那个控件滚进视线 + 加红框 + 聚焦，指出到底哪儿要改。 */
function markField(id, blockBox){
  var el = $(id);
  if (!el) return;
  var box = blockBox ? el : (el.parentNode || el);
  try { box.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  catch (e) { try { box.scrollIntoView(false); } catch (e2) {} }
  var cls = blockBox ? 'field-err-box' : 'field-err';
  el.classList.add(cls);
  setTimeout(function(){ el.classList.remove(cls); }, 2400);
  if (!blockBox && el.focus){
    try { el.focus({ preventScroll: true }); } catch (e3) { try { el.focus(); } catch (e4) {} }
  }
}
/* 表单打开后把它滚进视线并聚焦第一个输入框。
   老师是在 700 行的字库里点「新增」的，不滚过去就等于点了没反应。 */
function revealForm(id, focusId){
  var box = $(id);
  if (!box || box.hidden) return;
  var go = function(){
    try { box.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    catch (e) { try { box.scrollIntoView(false); } catch (e2) {} }
    if (!focusId) return;
    setTimeout(function(){
      var f = $(focusId);
      if (!f || !f.focus) return;
      /* preventScroll：否则聚焦会把刚滚好的位置又拽回去 */
      try { f.focus({ preventScroll: true }); } catch (e3) { try { f.focus(); } catch (e4) {} }
    }, 340);
  };
  /* 用 setTimeout 而不是 rAF：headless/后台标签里 rAF 可能一直不跑，滚动就永远不会发生 */
  setTimeout(go, 0);
}
function closeStuForm(){
  EDIT_STU = null; PHOTO_URL = '';
  $('stuForm').hidden = true;
  $('fStuPhoto').value = '';
  clearFormCache();
  if (PROF_NAME && findStu(PROF_NAME)){
    $('stuListView').hidden = true;
    $('stuProfile').hidden = false;
    renderStuProfile();
  }
}
function collected(el, attr){
  var boxes = el.querySelectorAll('input[' + attr + ']'), out = [], i;
  for (i = 0; i < boxes.length; i++){ if (boxes[i].checked) out.push(boxes[i].value); }
  return out;
}
function studentProps(s){
  var props = {}, i, idv;
  props['姓名'] = { text: s.name };
  props['每日题量'] = { number: s.count };
  var ids = [];
  for (i = 0; i < s.types.length; i++){ idv = optId(STATE.schemaStu, '练习题型', s.types[i]); if (idv) ids.push(idv); }
  if (ids.length) props['练习题型'] = { multi_select: ids };
  var gids = [];
  for (i = 0; i < s.groups.length; i++){ idv = optId(STATE.schemaStu, '字组', s.groups[i]); if (idv) gids.push(idv); }
  if (gids.length) props['字组'] = { multi_select: gids };
  var sid = optId(STATE.schemaStu, '状态', s.status);
  if (sid) props['状态'] = { select: sid };
  var url = s.photo || '';
  if (url && url.indexOf('data:') !== 0) props['照片'] = { image: { images: [{ title: s.name + '.jpg', imageUrl: url }] } };
  return props;
}
function saveStudentForm(){
  var name = ($('fStuName').value || '').replace(/^\s+|\s+$/g, '');
  if (!name){ toast('请先填学生姓名'); markField('fStuName'); return; }
  var types = collected($('fStuTypes'), 'data-t');
  if (!types.length){ toast('至少勾一个练习题型，否则这个学生进去看不到练习'); markField('fStuTypes', true); return; }
  var chars = STU_CHARS.slice();
  var groups = groupsOfChars(chars);       /* 来源标签：只用于界面回显与云端镜像，不参与出题 */
  /* v19：这个数从「每日题量」升级成「在学字数」——同时在手上练的就这么多，
     一次练习正好把这几个字过一遍，练会一个自动补一个。范围收紧到 3–10。 */
  var cnt = parseInt($('fStuCount').value, 10);
  if (!cnt || isNaN(cnt)) cnt = STU_CAP_DEF;
  if (cnt < STU_CAP_MIN) cnt = STU_CAP_MIN;
  if (cnt > STU_CAP_MAX) cnt = STU_CAP_MAX;
  var status = $('fStuStatus').value || '在读';
  var btn = $('btnStuSave');
  btn.disabled = true;
  btn.textContent = '保存中…';

  var file = $('fStuPhoto').files && $('fStuPhoto').files[0];
  var photoTask;
  if (file){
    btn.textContent = '处理照片中…';
    photoTask = uploadImageFile(file);
  } else if (PHOTO_URL){
    photoTask = Promise.resolve({
      url: (EDIT_STU && EDIT_STU.photo) || '',
      local: (EDIT_STU && EDIT_STU.photoLocal) || (PHOTO_URL.indexOf('data:') === 0 ? PHOTO_URL : '')
    });
  } else {
    photoTask = imgRestore('stu').then(function(blob){
      if (!blob) return { url: '', local: '' };
      btn.textContent = '处理照片中…';
      var f = (window.File && blob instanceof File) ? blob : new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' });
      return uploadImageFile(f);
    }).catch(function(){ return { url: '', local: '' }; });
  }

  var rec = EDIT_STU;
  var target = null;

  photoTask.then(function(pic){
    pic = pic || { url: '', local: '' };
    if (rec){
      target = rec;
      target.name = name;
      target.types = types;
      target.chars = chars;
      target.groups = groups;
      target.count = cnt;
      target.status = status;
      if (pic.url) target.photo = pic.url;
      if (pic.local) target.photoLocal = pic.local;
      target.edited = Date.now();
    } else {
      target = {
        id: newLocalId(), name: name, photo: pic.url || '', photoLocal: pic.local || '',
        types: types, chars: chars, groups: groups, count: cnt, status: status, edited: Date.now()
      };
      STATE.students.push(target);
    }
    /* 第 1 步：本机落盘 —— 到这里就已经保存成功了 */
    saveSnap();
    imgClear('stu');
    clearFormCache();
    $('stuForm').hidden = true;
    EDIT_STU = null; PHOTO_URL = '';
    renderTeacher();
    toast(chars.length ? (name + ' 已保存') : (name + ' 已保存，但还没选字，进去练不了'));

    /* 第 1 步到此已经保存成功，按钮立刻恢复，不等云端 */
    btn.disabled = false; btn.textContent = '保存';

    /* 第 2 步：云端镜像，失败只影响同步，不影响使用 */
    if (STATE.cloudOk === false) return null;
    return writeStudent(studentProps(target), rec ? rec.id : '').then(function(r){
      if (r && r.ok && r.res && r.res.id && isLocalId(target.id)){
        target.id = r.res.id;
        saveSnap();
      }
      setSync(r && r.ok ? '已同步' : '本机存档', r && r.ok ? '' : 'off');
      return !!(r && r.ok);
    });
  }).catch(function(err){
    try { console.error('[学生] 保存失败：', err); } catch (e) {}
    toast(friendlyErr(err), 5200);
  }).then(function(){ btn.disabled = false; btn.textContent = '保存'; });
}
function deleteStudent(name){
  var s = null, i;
  for (i = 0; i < STATE.students.length; i++){ if (STATE.students[i].name === name) s = STATE.students[i]; }
  if (!s) return;
  if (!window.confirm('确定删除学生「' + name + '」？该生已有的学习记录会保留，不会被删。')) return;
  var idx = STATE.students.indexOf(s);
  if (idx >= 0) STATE.students.splice(idx, 1);
  if (PROF_NAME === name) PROF_NAME = '';      /* 正在看这个人的档案，删完退回名单 */
  saveSnap();
  renderTeacher();
  toast('已删除');
  if (STATE.cloudOk === false) return;
  setSync('同步中', '');
  removeStudent(s.id).then(function(r){
    setSync(r && r.ok ? '已同步' : '本机存档', r && r.ok ? '' : 'off');
  });
}

/* ------------------------- 字库 / 词库 ------------------------- */
function groupOptions(){
  var a = [], i, c;
  for (i = 0; i < STATE.chars.length; i++){
    c = STATE.chars[i];
    if (c.g && a.indexOf(c.g) < 0) a.push(c.g);
  }
  if (!a.length) a = STAGES.slice();
  return a;
}
var _lwQuery = { lib: '', word: '' };   /* 上次渲染用的筛选条件，用来判断该不该保住滚动位置 */
/* 词库永远不是一张空表：内置组词（字库「组词」栏派生，只读）+ 我的词库（老师自建，可编辑） */
function wordRowsHTML(want, kw){
  var bw = builtinWords(), mine = STATE.words, html = '', hit = 0, bHit = 0, mHit = 0;
  var i, p, py, hay, have, mineW = {};
  for (i = 0; i < mine.length; i++){ if (mine[i] && mine[i].w) mineW[mine[i].w] = 1; }
  if (want !== 'mine'){
    for (i = 0; i < bw.list.length; i++){
      p = bw.list[i];
      py = p.py || '';
      hay = (p.w + ' ' + py + ' ' + p.from).toLowerCase();
      if (kw && hay.indexOf(kw) < 0) continue;
      hit++; bHit++;
      have = !!mineW[p.w];
      html += '<tr class="tr-builtin">' +
        '<td><span class="sp-builtin">内置</span>' + esc(p.w) + CLOSE('td') +
        '<td>' + esc(py || '—') + CLOSE('td') +
        '<td>' + esc('字库·' + p.from) + CLOSE('td') +
        '<td class="td-dim">—</td>' +
        '<td class="td-dim">—</td>' +
        '<td class="td-dim">内置</td>' +
        '<td>' + (have
          ? '<span class="td-dim">已在词库</span>'
          : '<button type="button" class="secondary" data-wcopy="' + esc(p.w) + '">收进词库</button>') + CLOSE('td') +
      CLOSE('tr');
    }
  }
  if (want !== 'builtin'){
    for (i = 0; i < mine.length; i++){
      p = mine[i];
      if (!p) continue;
      hay = String(p.w || '') + ' ' + String(p.p || '') + ' ' + String(p.sent || '');
      if (kw && hay.toLowerCase().indexOf(kw) < 0) continue;
      hit++; mHit++;
      html += '<tr>' +
        '<td>' + esc(p.w || '') + CLOSE('td') +
        '<td>' + esc(p.p || '—') + CLOSE('td') +
        '<td>' + esc(p.g || '—') + CLOSE('td') +
        '<td>' + esc(p.sent || '—') + CLOSE('td') +
        '<td>' + esc(p.img ? '已传' : '—') + CLOSE('td') +
        '<td>' + (p.on ? '启用' : '停用') + CLOSE('td') +
        '<td><button type="button" class="secondary" data-wedit="' + esc(p.w) + '" data-kind="词">编辑</button> ' +
            '<button type="button" class="danger" data-wdel="' + esc(p.w) + '" data-kind="词">删除</button>' + CLOSE('td') +
      CLOSE('tr');
    }
  }
  return { html: html, hit: hit, bHit: bHit, mHit: mHit,
           totalB: bw.list.length, totalM: mine.length };
}
function fillWordFilter(keep){
  var sel = $('wdFilter'), opts = [['', '全部'], ['builtin', '内置组词'], ['mine', '我的词库']];
  if (!sel) return;
  var html = '', i;
  for (i = 0; i < opts.length; i++){
    html += '<option value="' + opts[i][0] + '"' +
      (keep === opts[i][0] ? ' selected' : '') + '>' + esc(opts[i][1]) + CLOSE('option');
  }
  setHTML(sel, html);
}
/* 老师端角标：版本号 + 内置词条数。用户说「词库还是空的」时，先看他角上写的是哪个版本、几个词 */
function paintAppVer(){
  var el = $('appVer');
  if (!el) return;
  var bw = builtinWords();
  el.textContent = APP_VER + ' · 内置词 ' + bw.list.length + (bw.fallback ? '（兜底）' : '');
}
function renderWordList(which){
  var isLib = (which === 'lib');
  var host = $(isLib ? 'libTbody' : 'wdTbody');
  var filterEl = $(isLib ? 'libFilter' : 'wdFilter');
  var want = filterEl ? filterEl.value : '';
  var kwEl = $(isLib ? 'libSearch' : 'wdSearch');
  var kw = kwEl ? String(kwEl.value || '').trim().toLowerCase() : '';
  /* 700 行的表在自己滚动：改完第 300 行的字保存后，不该把老师弹回第一行。
     条件没变就留住滚动位置；换了搜索词/分组才回到顶部。 */
  var wrap = host && host.closest ? host.closest('.list-wrap') : null;
  var qkey = want + '\u0001' + kw;
  var keepTop = (_lwQuery[which] === qkey) && wrap ? wrap.scrollTop : 0;
  var html = '', i, w, hit = 0, stat = null;
  if (isLib){
    var src = STATE.chars;
    for (i = 0; i < src.length; i++){
      w = src[i];
      if (want && w.g !== want) continue;
      if (kw){
        var hay = String(w.w || '') + ' ' + String(w.p || '') + ' ' + String(w.words || '');
        if (hay.toLowerCase().indexOf(kw) < 0) continue;
      }
      hit++;
      var pic = w.img ? '已传'
        : ((ART_PACK[w.w] || BUILTIN_ART[w.w]) ? '内置图'
          : (wordOf(w) ? '词语卡' : '无'));
      var t = '<tr>' +
        '<td>' + TAG_LIB_SPAN + esc(w.w) + CLOSE('span') + CLOSE('td') +
        '<td>' + esc(w.p || '—') + CLOSE('td') +
        '<td>' + esc(w.g || '—') + CLOSE('td') +
        '<td>' + esc(w.words || '—') + CLOSE('td') +
        '<td>' + esc(pic) + CLOSE('td') +
        '<td>' + (w.on ? '启用' : '停用') + CLOSE('td') +
        '<td><button type="button" class="secondary" data-wedit="' + esc(w.w) + '" data-kind="字">编辑</button> ' +
            '<button type="button" class="danger" data-wdel="' + esc(w.w) + '" data-kind="字">删除</button>' + CLOSE('td') +
      CLOSE('tr');
      html += t;
    }
  } else {
    stat = wordRowsHTML(want, kw);
    html = stat.html;
    hit = stat.hit;
  }
  if (!html) html = '<tr><td colspan="7" style="color:#8A8578">' +
    (kw ? '没有匹配「' + esc(kw) + '」的' + (isLib ? '字' : '词') + '。'
      : (isLib ? '还没有内容。点上面的按钮添加，或直接导入内置字库。'
        : '还没有自己的词。内置组词就在上面，点「收进词库」就能改成自己的。')) + CLOSE('td') + CLOSE('tr');
  setHTML(host, html);
  if (wrap) wrap.scrollTop = keepTop;
  _lwQuery[which] = qkey;
  var cnt = $(isLib ? 'libCount' : 'wdCount');
  if (cnt){
    if (isLib){
      cnt.textContent = '共 ' + hit + ' 条' + (kw || want ? '（已筛选，全部 ' + STATE.chars.length + ' 条）' : '');
    } else {
      cnt.textContent = '共 ' + stat.hit + ' 条：内置组词 ' + stat.totalB + ' 条 + 我的词库 ' + stat.totalM + ' 条' +
        ((kw || want) ? '（当前筛选命中 ' + stat.hit + '）' : '') +
        (builtinWords().fallback ? '　⚠ 字库「组词」栏是空的，已改用页面内置字表的组词' : '');
    }
  }
  paintAppVer();
  if (isLib) fillFilter('libFilter', want); else fillWordFilter(want);
}
function fillFilter(id, keep){
  var sel = $(id);
  if (!sel) return;
  var groups = groupOptions(), html = '<option value="">全部</option>', i;
  for (i = 0; i < groups.length; i++){
    var s = (keep === groups[i]) ? ' selected' : '';
    html += '<option value="' + esc(groups[i]) + '"' + s + '>' + esc(groups[i]) + CLOSE('option');
  }
  setHTML(sel, html);
}
function openWordForm(kind, word){
  var isLib = (kind === '字');
  var src = isLib ? STATE.chars : STATE.words;
  var item = null, i;
  if (word){ for (i = 0; i < src.length; i++){ if (src[i].w === word) item = src[i]; } }
  if (isLib){ EDIT_LIB = item; LIB_PIC_URL = item ? item.img : ''; }
  else { EDIT_WD = item; WD_PIC_URL = item ? item.img : ''; }

  $(isLib ? 'libFormTitle' : 'wdFormTitle').textContent =
    (item ? '编辑' : '新增') + (isLib ? '汉字' : '词语');
  $(isLib ? 'fLibWord' : 'fWdWord').value = item ? item.w : '';
  $(isLib ? 'fLibPinyin' : 'fWdPinyin').value = item ? item.p : '';
  if (isLib) $('fLibWords').value = item ? item.words : '';
  if (isLib) $('fLibSent').value = item ? item.sent : '';
  if (!isLib) $('fWdSent').value = item ? item.sent : '';
  $(isLib ? 'fLibOn' : 'fWdOn').checked = item ? item.on : true;
  $(isLib ? 'fLibPic' : 'fWdPic').value = '';
  $(isLib ? 'libPicName' : 'wdPicName').textContent = (item && item.img) ? '已有图片，重新选择会替换。' : '图示可以选，不传就用内置简笔画（内置字库里的字都有）。';

  var groups = groupOptions(), gHtml = '', j;
  if (!isLib) groups.push('自建');
  for (j = 0; j < groups.length; j++){
    var s = (item ? item.g : groups[0]) === groups[j] ? ' selected' : '';
    gHtml += '<option value="' + esc(groups[j]) + '"' + s + '>' + esc(groups[j]) + CLOSE('option');
  }
  setHTML($(isLib ? 'fLibGroup' : 'fWdGroup'), gHtml);

  $(isLib ? 'libForm' : 'wdForm').hidden = false;
  if (!item) restoreFormCache();       /* 只有「新增」才回填草稿 */
  revealForm(isLib ? 'libForm' : 'wdForm', isLib ? 'fLibWord' : 'fWdWord');
}
function closeWordForm(kind){
  var isLib = (kind === '字');
  if (isLib){ EDIT_LIB = null; LIB_PIC_URL = ''; $('libForm').hidden = true; }
  else { EDIT_WD = null; WD_PIC_URL = ''; $('wdForm').hidden = true; }
  clearFormCache();
}
function saveWordForm(kind){
  var isLib = (kind === '字');
  var wEl = $(isLib ? 'fLibWord' : 'fWdWord');
  var w = (wEl.value || '').replace(/^\s+|\s+$/g, '');
  if (!w){
    toast('请先填' + kind + '的内容');
    markField(isLib ? 'fLibWord' : 'fWdWord');
    return;
  }
  /* 同一个字/词重复录入会让出题池出现重复项（charMap 按字查），新增时先拦一道 */
  if (!(isLib ? EDIT_LIB : EDIT_WD)){
    var pool0 = isLib ? STATE.chars : STATE.words, dup = null, di;
    for (di = 0; di < pool0.length; di++){ if (pool0[di].w === w) dup = pool0[di]; }
    if (dup){
      toast((isLib ? '字库' : '词库') + '里已经有「' + w + '」了，直接点它的「编辑」改就行', 3600);
      markField(isLib ? 'fLibWord' : 'fWdWord');
      return;
    }
  }
  var grp = $(isLib ? 'fLibGroup' : 'fWdGroup').value;
  var py = $(isLib ? 'fLibPinyin' : 'fWdPinyin').value || '';
  var words = isLib ? $('fLibWords').value || '' : '';
  var sent = isLib ? ($('fLibSent').value || '') : ($('fWdSent').value || '');
  var on = $(isLib ? 'fLibOn' : 'fWdOn').checked;
  var picInput = $(isLib ? 'fLibPic' : 'fWdPic');
  var file = picInput.files && picInput.files[0];
  var cur = isLib ? LIB_PIC_URL : WD_PIC_URL;
  var btn = $(isLib ? 'btnLibSave' : 'btnWdSave');
  btn.disabled = true;
  btn.textContent = file ? '上传图片中…' : '处理中…';

  var picTask = file ? uploadImageFile(file) : Promise.resolve({ url: cur || '', local: '' });
  var rec = isLib ? EDIT_LIB : EDIT_WD;
  var target = null;

  picTask.then(function(pic){
    pic = pic || { url: '', local: '' };
    var url = pic.url || cur || '';
    if (rec){
      target = rec;
      target.w = w; target.p = py; target.g = grp;
      target.words = words; target.sent = sent; target.on = on;
      if (url) target.img = url;
    } else {
      target = {
        id: newLocalId(), kind: isLib ? '字' : '词', w: w, p: py, g: grp,
        img: url, words: words, sent: sent, on: on
      };
      (isLib ? STATE.chars : STATE.words).push(target);
    }
    /* 第 1 步：本机落盘 */
    saveSnap();
    imgClear(isLib ? 'lib' : 'wd');
    clearFormCache();
    $(isLib ? 'libForm' : 'wdForm').hidden = true;
    if (isLib) EDIT_LIB = null; else EDIT_WD = null;
    renderTeacher();
    toast(kind + '「' + w + '」已保存');
    btn.disabled = false; btn.textContent = '保存';

    /* 第 2 步：云端镜像（按钮已恢复，不阻塞） */
    if (STATE.cloudOk === false) return null;
    var props = {};
    props['字词'] = { text: w };
    props['拼音'] = { text: py };
    props['组词'] = { text: words };
    props['例句'] = { text: sent };
    props['启用'] = { checkbox: !!on };
    var tid = optId(STATE.schemaLib, '类型', kind);
    if (tid) props['类型'] = { select: tid };
    var gid = optId(STATE.schemaLib, '分组', grp);
    if (gid) props['分组'] = { select: gid };
    if (url && url.indexOf('data:') !== 0) props['图示'] = { image: { images: [{ title: w + '.png', imageUrl: url }] } };
    return writeWord(props, rec ? rec.id : '').then(function(r){
      if (r && r.ok && r.res && r.res.id && isLocalId(target.id)){
        target.id = r.res.id;
        saveSnap();
      }
      setSync(r && r.ok ? '已同步' : '本机存档', r && r.ok ? '' : 'off');
    });
  }).catch(function(err){
    try { console.error('[字词] 保存失败：', err); } catch (e) {}
    toast(friendlyErr(err), 5200);
  }).then(function(){ btn.disabled = false; btn.textContent = '保存'; });
}
/* 内置词是从字库「组词」栏派生出来的、只读；老师想改它，就复制一份进自己的词库 */
function copyBuiltinWord(w){
  var mine = STATE.words, i, one = null, bw = builtinWords();
  for (i = 0; i < mine.length; i++){
    if (mine[i] && mine[i].w === w){ toast('「' + w + '」已经在你词库里了'); return; }
  }
  for (i = 0; i < bw.list.length; i++){ if (bw.list[i].w === w){ one = bw.list[i]; break; } }
  if (!one){ toast('词库里找不到「' + w + '」'); return; }
  mine.push({
    id: newLocalId(), kind: '词', w: w, p: one.py || '', g: '自建',
    img: '', words: '', sent: '', on: true, edited: Date.now()
  });
  saveSnap();
  renderWordList('word');
  toast('「' + w + '」已收进词库，可以编辑或停用了');
}
function deleteWord(kind, w){
  var isLib = (kind === '字');
  var src = isLib ? STATE.chars : STATE.words;
  var item = null, i;
  for (i = 0; i < src.length; i++){ if (src[i].w === w) item = src[i]; }
  if (!item) return;
  if (!window.confirm('确定从' + (isLib ? '字库' : '词库') + '里删除「' + w + '」？学习记录会保留。')) return;
  var idx = src.indexOf(item);
  if (idx >= 0) src.splice(idx, 1);
  saveSnap();
  renderTeacher();
  toast('已删除');
  if (STATE.cloudOk === false) return;
  setSync('同步中', '');
  removeWord(item.id).then(function(r){
    setSync(r && r.ok ? '已同步' : '本机存档', r && r.ok ? '' : 'off');
  });
}
function seedLibrary(){
  var exist = {}, i, c;
  for (i = 0; i < STATE.chars.length; i++){ exist[STATE.chars[i].w] = true; }
  var todo = [];
  for (i = 0; i < CHARS.length; i++){ if (!exist[CHARS[i].c]) todo.push(CHARS[i]); }
  if (!todo.length){ toast('内置字库已经全部导入过了'); return; }
  if (!window.confirm('把内置的 ' + todo.length + ' 个字（生活语文生字表）加进字库？')) return;

  /* 先本机加，立刻生效；离线也照样可导 */
  var added = [];
  for (i = 0; i < todo.length; i++){
    c = todo[i];
    var rec = {
      id: newLocalId(), kind: '字', w: c.c, p: c.p || '',
      g: c.g || STAGES[c.st] || '未分组', img: '',
      words: c.w || '', sent: c.s || '', on: c.on !== false
    };
    STATE.chars.push(rec);
    added.push(rec);
  }
  saveSnap();
  renderTeacher();
  toast('已导入 ' + added.length + ' 个字');

  /* 云端镜像：有网才补，串行写，避免打爆 QPS */
  if (STATE.cloudOk === false) return;
  var gidMap = {}, groups = groupOptions();
  for (i = 0; i < groups.length; i++){ gidMap[groups[i]] = optId(STATE.schemaLib, '分组', groups[i]); }
  var typeId = optId(STATE.schemaLib, '类型', '字');
  var done = 0, idx = 0;
  setSync('同步 0/' + added.length, '');
  function step(){
    if (idx >= added.length || STATE.cloudOk === false){
      setSync(STATE.cloudOk === false ? '本机存档' : '已同步', STATE.cloudOk === false ? 'off' : '');
      saveSnap();
      return;
    }
    var it = added[idx]; idx++;
    var props = {};
    props['字词'] = { text: it.w };
    props['拼音'] = { text: it.p };
    props['组词'] = { text: it.words };
    props['例句'] = { text: it.sent };
    props['启用'] = { checkbox: true };
    if (typeId) props['类型'] = { select: typeId };
    if (gidMap[it.g]) props['分组'] = { select: gidMap[it.g] };
    writeWord(props, '').then(function(r){
      if (r && r.ok && r.res && r.res.id) it.id = r.res.id;
      done++;
      setSync('同步 ' + done + '/' + added.length, '');
      step();
    }).catch(function(){
      done++;
      step();
    });
  }
  step();
}

/* ------------------------- 备份（本机数据的安全带） ------------------------- */
function exportBackup(){
  var data = JSON.stringify({
    v: 1, ts: new Date().toISOString(),
    students: STATE.students, chars: STATE.chars,
    words: STATE.words, logs: STATE.logs
  }, null, 2);
  try {
    var blob = new Blob([data], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '语文练习台-备份-' + todayKey() + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){
      try { URL.revokeObjectURL(a.href); } catch (e) {}
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 1200);
    toast('备份已导出，存到网盘或发给自己');
  } catch (e) {
    toast('这台浏览器不支持直接下载，请换 Chrome / Edge 试试', 4200);
  }
}
function importBackup(file){
  return new Promise(function(resolve, reject){
    var r = new FileReader();
    r.onload = function(){
      var o = null;
      try { o = JSON.parse(String(r.result)); } catch (e) { reject(new Error('文件不是有效的备份')); return; }
      if (!o || !o.students) { reject(new Error('文件里没有学生数据')); return; }
      if (!window.confirm('导入会覆盖当前这台电脑上的数据（' + STATE.students.length + ' 个学生），确定继续？')) { reject(new Error('已取消')); return; }
      STATE.students = arr(o.students);
      if (arr(o.chars).length) STATE.chars = arr(o.chars);
      STATE.words = arr(o.words);
      STATE.logs = (o.logs && typeof o.logs === 'object') ? o.logs : {};
      repairCharWords();          /* 旧备份可能不带「组词」栏，导完按内置字表补回 */
      saveSnap();
      resolve(true);
    };
    r.onerror = function(){ reject(new Error('读取失败')); };
    r.readAsText(file);
  });
}

/* ------------------------- 进度总览 -------------------------
   v12 重做过口径（分母＝各人字表），但界面还是「6 张一样的数字卡 + 一行行细字」：
   数字都长一样，看不出谁掉队、全班卡在哪，解释文字反而比数据显眼。
   v17 改成先看图再读数：
     ① 大圆环 = 全班掌握率，一条四段横条 = 四个状态的字数占比；
     ② 每个学生一行：名字 + 四段条 + 大号百分比，掉队的条一眼就短；
     ③ 解释文字全部退到 11.5px 的灰字或直接删掉，不再抢数据的位置。
   --------------------------------------------------------- */
function ringHTML(rate){
  var C = 2 * Math.PI * 52;
  var on = (C * Math.max(0, Math.min(100, rate)) / 100).toFixed(1);
  return '<div class="ring-wrap">' +
    '<svg class="ring" viewBox="0 0 120 120" aria-hidden="true">' +
      '<circle class="ring-bg" cx="60" cy="60" r="52"></circle>' +
      '<circle class="ring-fg" cx="60" cy="60" r="52" stroke-dasharray="' + on + ' ' + C.toFixed(1) +
        '" transform="rotate(-90 60 60)"></circle>' +
    CLOSE('svg') +
    '<div class="ring-txt"><b>' + rate + '%</b><span>掌握率</span>' + CLOSE('div') +
  CLOSE('div');
}
/* 四段横条：全班或单人共用一套配色（已掌握绿 / 练习中蓝 / 需巩固红 / 待学灰） */
function stackHTML(p){
  var total = p.total || 0, out = '', i, segs, w;
  if (!total) return '<div class="stack is-empty"></div>';
  segs = [['m', p.mastered], ['d', p.doing], ['t', p.tough], ['o', p.todo]];
  for (i = 0; i < segs.length; i++){
    if (!segs[i][1]) continue;
    w = (segs[i][1] * 100 / total).toFixed(2);
    out += '<i class="pg-' + segs[i][0] + '" style="width:' + w + '%"></i>';
  }
  return '<div class="stack" role="img" aria-label="' + esc(
    '已掌握 ' + p.mastered + '，练习中 ' + (p.doing || 0) + '，需巩固 ' + (p.tough || 0) +
    '，待学 ' + (p.todo || 0)) + '">' + out + CLOSE('div');
}
function renderProgress(){
  var cp = classProfile(), i, s, p, hero, segs;

  if (!STATE.students.length){
    setHTML($('progMeta'), '');
    setHTML($('progStats'), '<div class="prog-empty">还没有学生。先到「学生管理」建档。</div>');
    setHTML($('progMatrix'), '');
    setHTML($('progHard'), '');
    setHTML($('progFocus'), '');
    return;
  }

  /* ① 全班：一圈 + 一条 + 三个小胶囊，不要六张小卡 */
  segs = [['m', '已掌握', cp.mastered], ['d', '练习中', cp.doing],
          ['t', '需巩固', cp.tough], ['o', '待学', cp.todo]];
  hero = ringHTML(cp.rate) + '<div class="hero-main">' + stackHTML(cp) +
    '<div class="stack-legend">';
  for (i = 0; i < segs.length; i++){
    hero += '<div class="slg ' + segs[i][0] + '"><i></i><b>' + segs[i][2] + CLOSE('b') +
      '<span>' + segs[i][1] + CLOSE('span') + CLOSE('div');
  }
  hero += CLOSE('div') + '<div class="hero-pills">' +
    '<span class="hp"><b>' + cp.stu + '</b> 个学生' +
      (cp.live && cp.live !== cp.stu ? '（在读 ' + cp.live + '）' : '') + CLOSE('span') +
    '<span class="hp"><b>' + cp.total + '</b> 个字' + CLOSE('span') +
    '<span class="hp"><b>' + cp.today + '</b> 人今天练过' + CLOSE('span') +
    CLOSE('div') + CLOSE('div');
  setHTML($('progStats'), hero);
  setHTML($('progMeta'), cp.total ? ('练过 ' + cp.learned + ' / ' + cp.total + ' 个字') : '');

  /* ② 每个人一行：名字 + 四段条 + 大号百分比。待学/最近练习缩成名字下面一行小字 */
  var rows = '';
  for (i = 0; i < STATE.students.length; i++){
    s = STATE.students[i];
    p = stuProfile(s);
    rows += '<div class="prow">' +
      '<div class="prow-name">' + avatarHTML(s, 'mini-av') +
        '<span class="pn-txt"><b>' + esc(s.name) + CLOSE('b') + '<em>' +
          (p.total ? esc(sinceText(p.lastAt)) : '还没选字') +
        CLOSE('em') + CLOSE('span') +
      CLOSE('div') +
      (p.total ? progBarHTML(p, 'prog-mini') : '<span class="prow-none">—</span>') +
      '<div class="prow-rate">' +
        (p.total ? '<b>' + p.rate + CLOSE('b') + '<i>%</i>' : '<i>—</i>') +
      CLOSE('div') +
      '<button type="button" class="prow-btn" data-prof="' + esc(s.name) + '">档案</button>' +
    CLOSE('div');
  }
  setHTML($('progMatrix'), rows);

  /* ③ 全班卡住的字：同一个字至少两个孩子卡着，才说明是教法或字本身的问题 */
  var hs = '', h, j, common = [];
  for (i = 0; i < cp.hard.length; i++){
    if (cp.hard[i].n >= 2) common.push(cp.hard[i]);
  }
  for (i = 0; i < common.length; i++){
    h = common[i];
    hs += '<div class="hard-chip" title="' + esc(h.names.join('、')) + '">' +
      '<b>' + esc(h.w) + CLOSE('b') +
      '<em><span>' + h.n + CLOSE('span') + ' 人</em>' + CLOSE('div');
  }
  setHTML($('progHard'), hs ? ('<div class="hard-wrap">' + hs + CLOSE('div')) :
    '<div class="prog-empty">暂时没有</div>');

  /* ④ 今天先抽谁：需巩固 + 靠提示的字，一键抽练 */
  var need = '', j2, it, list, chips, cls, nTough, nHint, dlist;
  for (i = 0; i < STATE.students.length; i++){
    s = STATE.students[i];
    p = stuProfile(s);
    list = []; nTough = 0; nHint = 0;
    for (j2 = 0; j2 < p.items.length; j2++){
      it = p.items[j2];
      if (it.lv === '需巩固'){ list.push({ w: it.w, cls: '' }); nTough++; }
      else if (it.lv === '练习中' && it.r && it.r.prompts >= 2){ list.push({ w: it.w, cls: 'a' }); nHint++; }
    }
    if (!list.length) continue;
    chips = '';
    dlist = [];
    for (j = 0; j < list.length && j < 10; j++){
      chips += '<span class="' + list[j].cls + '">' + esc(list[j].w) + CLOSE('span');
      dlist.push(list[j].w);
    }
    need += '<div class="need-card">' +
      '<div class="need-top"><b>' + esc(s.name) + CLOSE('b') +
        (nTough ? '<span class="pill r">需巩固 ' + nTough + CLOSE('span') : '') +
        (nHint ? '<span class="pill a">靠提示 ' + nHint + CLOSE('span') : '') +
        '<button type="button" class="primary sm" style="margin-left:auto" data-drill="' + esc(s.name) +
          '" data-drill-chars="' + esc(dlist.join(' ')) + '">抽他练这些字</button>' +
      CLOSE('div') +
      '<div class="need-chars">' + chips + (list.length > 10 ? '<span class="a">…等 ' + list.length + ' 个</span>' : '') + CLOSE('div') +
    CLOSE('div');
  }
  setHTML($('progFocus'), need || '<div class="prog-empty">暂时没有</div>');
}

/* ------------------------- 事件绑定 ------------------------- */
function wireEvents(){
  document.addEventListener('click', function(ev){
    var el = ev.target;
    /* 今日字卡：点卡片读这个字；点大按钮开始做题。
       必须排在 .opt 分支之前——预习态 STATE.quiz 是 null，走 .opt 分支会读 answered 报错 */
    var pcard = el.closest ? el.closest('[data-pre]') : null;
    if (pcard){ preSay(pcard.getAttribute('data-pre')); return; }
    var pgo = el.closest ? el.closest('#preGo') : null;
    if (pgo){ preStart(); return; }
    var card = el.closest ? el.closest('.stu-card') : null;
    if (card){ enterStudent(card.getAttribute('data-stu')); return; }
    var tab = el.closest ? el.closest('.type-tab') : null;
    if (tab){ STATE.curType = tab.getAttribute('data-type'); renderTypeTabs(); startQuiz(STATE.curType); return; }
    var opt = el.closest ? el.closest('.opt') : null;
    if (opt && !STATE.quiz.answered){ pickOption(opt.getAttribute('data-c')); return; }
    var tt = el.closest ? el.closest('.tea-tab') : null;
    if (tt){ TEA_TAB = tt.getAttribute('data-tp'); renderTeacher(); return; }
    var ed = el.closest ? el.closest('[data-edit]') : null;
    if (ed){ openStuForm(ed.getAttribute('data-edit')); return; }
    var dl = el.closest ? el.closest('[data-del]') : null;
    if (dl){ deleteStudent(dl.getAttribute('data-del')); return; }
    /* 档案 / 抽练 / 逐字详情 / 试听：都用 data-* 委托，避免每次重渲染后重新绑事件 */
    var pf = el.closest ? el.closest('[data-prof]') : null;
    if (pf){ openStuProfile(pf.getAttribute('data-prof')); return; }
    var dr = el.closest ? el.closest('[data-drill]') : null;
    if (dr){
      var dch = String(dr.getAttribute('data-drill-chars') || '').split(/\s+/);
      var keep = [], q;
      for (q = 0; q < dch.length; q++){ if (dch[q]) keep.push(dch[q]); }
      drillStudent(dr.getAttribute('data-drill'), keep);
      return;
    }
    var pw = el.closest ? el.closest('[data-pw]') : null;
    if (pw){
      var w2 = pw.getAttribute('data-pw');
      PROF_CH = (PROF_CH === w2 ? '' : w2);
      renderStuProfile();
      if (PROF_CH && $('profDetail') && $('profDetail').scrollIntoView){
        $('profDetail').scrollIntoView({ block: 'nearest' });
      }
      return;
    }
    if (el.id === 'btnPdClose'){ PROF_CH = ''; renderStuProfile(); return; }
    var sy = el.closest ? el.closest('[data-say]') : null;
    if (sy){ say(sy.getAttribute('data-say')); return; }
    /* 在学名单：加入 / 移出 / 锁定（T-009）。三个动作都只动这一个学生 */
    var ain = el.closest ? el.closest('[data-act-in]') : null;
    if (ain){
      var sIn = findStu(PROF_NAME), wIn = ain.getAttribute('data-act-in');
      if (sIn && !actAdd(sIn, wIn)){
        toast('在学已经满了（上限 ' + stuCap(sIn) + ' 个），先移出一个再加');
      }
      renderStuProfile();
      return;
    }
    var aout = el.closest ? el.closest('[data-act-out]') : null;
    if (aout){
      var sOut = findStu(PROF_NAME);
      if (sOut) actDel(sOut, aout.getAttribute('data-act-out'));
      renderStuProfile();
      return;
    }
    var alk = el.closest ? el.closest('[data-act-lock]') : null;
    if (alk){
      var sLk = findStu(PROF_NAME);
      if (sLk) actLock(sLk, alk.getAttribute('data-act-lock'));
      renderStuProfile();
      return;
    }
    var we = el.closest ? el.closest('[data-wedit]') : null;
    if (we){ openWordForm(we.getAttribute('data-kind'), we.getAttribute('data-wedit')); return; }
    var wd = el.closest ? el.closest('[data-wdel]') : null;
    if (wd){ deleteWord(wd.getAttribute('data-kind'), wd.getAttribute('data-wdel')); return; }
    var wc = el.closest ? el.closest('[data-wcopy]') : null;
    if (wc){ copyBuiltinWord(wc.getAttribute('data-wcopy')); return; }
  });

  $('btnBackPick').addEventListener('click', function(){
    /* 从老师端「抽练」进来的，点返回就回原来的老师端标签页（档案还开着），
       不把孩子丢在选人页上、也不用老师再长按一次「老师」 */
    if (STATE.fromTeacher){
      var back = STATE.fromTeacher;
      STATE.fromTeacher = '';
      leaveStudent(false);
      TEA_TAB = (back === 'prog' ? 'prog' : 'stu');
      openTeacher();
      return;
    }
    leaveStudent(true);
  });
  if ($('btnProfBack')) $('btnProfBack').addEventListener('click', closeStuProfile);
  if ($('btnProfEdit')) $('btnProfEdit').addEventListener('click', function(){ openStuForm(PROF_NAME); });
  if ($('btnProfPause')) $('btnProfPause').addEventListener('click', function(){ pauseStudent(PROF_NAME); });
  if ($('btnProfDrill')) $('btnProfDrill').addEventListener('click', function(){
    var s = findStu(PROF_NAME);
    if (!s) return;
    drillStudent(PROF_NAME, stuProfile(s).focus.slice(0, 12));
  });
  if ($('btnProfStart')) $('btnProfStart').addEventListener('click', function(){
    var s = findStu(PROF_NAME);
    if (!s) return;
    STATE.fromTeacher = TEA_TAB || 'stu';
    QUIZ_FOCUS = null;
    enterStudent(PROF_NAME);
  });
  $('btnNextStu').addEventListener('click', function(){ leaveStudent(true); toast('已清屏，请下一个同学点头像'); });
  $('btnHint').addEventListener('click', useHint);
  $('btnSkip').addEventListener('click', skipQuestion);
  $('btnRight').addEventListener('click', function(){
    if (STATE.quiz && !STATE.quiz.answered) gradeAnswer(true);
  });
  $('btnExitTeacher').addEventListener('click', function(){
    var back = STATE.prevPhase;
    PROF_NAME = ''; PROF_CH = '';     /* 主动退出老师端就回名单态，下次进来不下钻 */
    TEA_TAB = 'stu';
    leaveStudent(false);
    if (back === 'learn'){ renderLearn(); showScreen('learn'); }
  });
  $('btnStuNew').addEventListener('click', function(){ openStuForm(''); });
  $('btnStuCancel').addEventListener('click', closeStuForm);
  $('btnStuSave').addEventListener('click', saveStudentForm);
  $('btnLibNew').addEventListener('click', function(){ openWordForm('字', ''); });
  $('btnLibCancel').addEventListener('click', function(){ closeWordForm('字'); });
  $('btnLibSave').addEventListener('click', function(){ saveWordForm('字'); });
  $('btnLibSeed').addEventListener('click', seedLibrary);

  $('btnExport').addEventListener('click', exportBackup);
  $('btnImport').addEventListener('click', function(){ $('fImport').click(); });
  $('fImport').addEventListener('change', function(){
    var f = this.files && this.files[0];
    var self = this;
    if (!f) return;
    importBackup(f).then(function(){
      self.value = '';
      renderTeacher();
      toast('备份已导入');
    }).catch(function(err){
      self.value = '';
      var m = (err && err.message) || '文件不对';
      if (m !== '已取消') toast('导入失败：' + m, 4200);
    });
  });
  $('btnWdNew').addEventListener('click', function(){ openWordForm('词', ''); });
  $('btnWdCancel').addEventListener('click', function(){ closeWordForm('词'); });
  $('btnWdSave').addEventListener('click', function(){ saveWordForm('词'); });

  $('libFilter').addEventListener('change', function(){ renderWordList('lib'); });
  $('wdFilter').addEventListener('change', function(){ renderWordList('word'); });
  /* 700 条字库靠搜索找字：输入后 180ms 再渲染，避免每敲一个字重排整张表 */
  (function(){
    var pairs = [['libSearch', 'lib'], ['wdSearch', 'word']];
    for (var i = 0; i < pairs.length; i++){
      (function(id, which){
        var el = $(id), timer = 0;
        if (!el) return;
        el.addEventListener('input', function(){
          if (timer) clearTimeout(timer);
          timer = setTimeout(function(){ timer = 0; renderWordList(which); }, 180);
        });
      })(pairs[i][0], pairs[i][1]);
    }
  })();

  $('fStuPhoto').addEventListener('change', function(){
    var f = this.files && this.files[0];
    if (!f) return;
    $('stuPhotoName').textContent = '已选择：' + f.name + '（保存时上传）';
    imgStore('stu', [f]);
  });
  $('fLibPic').addEventListener('change', function(){
    var f = this.files && this.files[0];
    if (!f) return;
    $('libPicName').textContent = '已选择：' + f.name + '（保存时上传）';
    imgStore('lib', [f]);
  });
  $('fWdPic').addEventListener('change', function(){
    var f = this.files && this.files[0];
    if (!f) return;
    $('wdPicName').textContent = '已选择：' + f.name + '（保存时上传）';
    imgStore('wd', [f]);
  });

  var tea = $('scrTeacher');
  tea.addEventListener('input', scheduleCache);
  tea.addEventListener('change', scheduleCache);

  var entry = $('btnTeacherTop');
  var lp = null;
  function down(){ if (lp) clearTimeout(lp); lp = setTimeout(function(){ lp = null; openTeacher(); }, 900); }
  function up(){ if (lp){ clearTimeout(lp); lp = null; } }
  entry.addEventListener('pointerdown', down);
  entry.addEventListener('pointerup', up);
  entry.addEventListener('pointerleave', up);
  entry.addEventListener('pointercancel', up);
  entry.addEventListener('dblclick', function(){ openTeacher(); });
}

/* ------------------------- 启动 ------------------------- */
function boot(){
  wireEvents();
  wireLearn();
  avLoad();
  spkInit();
  avWire();
  avPaint();
  var last = null;
  try { last = localStorage.getItem(LS_LAST); } catch (e) {}

  /* 先本机秒开：不管云端通不通，页面都立刻可用 */
  if (!loadSnap()){ seedLocalChars(); charsetVerSet(CHARSET_VER); }
  else migrateCharset();          /* 旧版内置字表自动换成生活语文生字表 */
  repairCharWords();              /* 字库组词栏被弄丢时按内置字表补回，否则词库会是空表 */
  migrateStuChars();              /* 老学生只有「字组」，展开成显式字表并写回 */
  migrateCap();                   /* 每日题量收紧到 3–10，并给每个学生补上在学名单 */
  renderPick();
  renderLearn();
  showScreen('learn');
  if (!STATE.students.length && !last){ $('pickEmpty').hidden = false; }
  /* 首屏已经可用：收起加载提示，语音包留到空闲时再解析（4 MB，不挡首屏） */
  var bm = $('bootMask');
  if (bm && bm.parentNode) bm.parentNode.removeChild(bm);
  voicePackWarm();

  if (!dbApi()){
    STATE.cloudOk = false;
    setSync('本机存档', 'off');
    return;
  }
  if (STATE.students.length) setSync('同步中', '');
  loadAllData().then(function(){
    renderPick();
    renderLearn();
    if (STATE.cur) renderPlayHeader();
    if (!$('scrTeacher').hidden) renderTeacher();
    if (!STATE.students.length && !last) $('pickEmpty').hidden = false;
    else if (STATE.students.length) $('pickEmpty').hidden = true;
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
