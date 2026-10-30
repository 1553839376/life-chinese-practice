/* =====================================================================
   数据层：常量 / 工具 / IndexedDB 图片缓存 / 表单缓存 / SDK 封装 / 读写
   三张表：学生名单(DATABASE_ID) / 字词库 / 学习记录
   注：SDK 调用处的 databaseId 必须是字面量或名为 DATABASE_ID 的常量（lint 硬性要求），
       所以下面每个调用点都直接写了字面量，不要改成变量。
   ===================================================================== */

var DATABASE_ID = 'jmNjdfyRjnCNaI3I0UvfRg';   /* 学生名单（主表，绑定标记也用它） */
var LS_FORM = 'wb2_teacher_form';
var LS_LAST = 'wb2_last_student';
/* 版本号：老师端顶部会显示，用来一句话确认「你打开的是不是新版」。
   用户报「还是老样子」时，先看他屏幕角上的版本号，比猜快得多。发版时改这里。 */
var APP_VER = 'v28';

var TYPE_ORDER = ['听音找字', '找一样的字', '认读跟读', '图字配对', '看拼音写字', '拼词语',
                  '汉字听写', '词语听写', '描红汉字'];
var TYPE_DESC = {
  '听音找字': '点喇叭听读音，再点出对应的字',
  '找一样的字': '看上面这个字，在下面找出一样的',
  '认读跟读': '让孩子看着字读出声，老师判断',
  '图字配对': '把图拖到对的字上，也可以直接点字',
  '看拼音写字': '看拼音，点出对应的字',
  '拼词语': '把下面的字两两拼起来，拼成词语',
  '汉字听写': '听一个字，在一个方框里写下来',
  '词语听写': '听一个词，一个字写一格',
  '描红汉字': '照着浅灰色的字，一笔一笔描一遍'
};
/* 手写题型（v25）：答案不在屏幕上（听写）或已经给在屏幕上（描红），所以没有选项可点，
   出题也不该要求「凑够 4 个字」。这两条判断散在 startQuiz / renderStage 里会分叉，统一放这里。
   v27 把听写拆成两个：汉字听写只听单字、词语听写听整词（原来那个叫「汉字听写」，
   实际听的是词，老师 2026-10-30 指出该分开）。 */
var WRITE_TYPES = ['汉字听写', '词语听写', '描红汉字'];
/* 听写「一个词」还是「一个字」：只有词语听写要拼整词，其余（汉字听写、描红）都只针对单字。 */
function writesWord(t){ return t === '词语听写'; }
function isDictation(t){ return t === '汉字听写' || t === '词语听写'; }
var WRITE_MAX = 6;   /* 写字比点选慢一倍，一次最多写 6 个，再多孩子坐不住 */
function isWriteType(t){ return WRITE_TYPES.indexOf(t) >= 0; }

var STATE = {
  students: [], chars: [], words: [], logs: {},
  schemaStu: null, schemaLib: null, schemaLog: null,
  cur: null, curType: '', quiz: null, phase: 'pick',
  online: null, syncText: '已同步', syncCls: '', loadErr: '',
  cloudOk: true, cloudTried: false
};

/* ------------------------- 本地存档（离线优先） -------------------------
   发布链接是公开页面，资料库的数据表读写依赖登录授权；教室这台电脑
   一旦没有登录态或断网，读写都会被挡。可这个工作台是「一台电脑上课」，
   云端同步不是刚需、卡住教学才是大问题。
   所以这里把主存储放到本机：连不上照样建档、上课、记进度，云端只当镜像。
   换电脑/清缓存会丢，因此老师端提供「导出备份 / 导入备份」。
   ------------------------------------------------------------------- */
var LS_DATA = 'wb2_data_v1';

function saveSnap(){
  try {
    localStorage.setItem(LS_DATA, JSON.stringify({
      v: 1, ts: Date.now(),
      students: STATE.students,
      chars: STATE.chars,
      words: STATE.words,
      logs: STATE.logs
    }));
    return true;
  } catch (e) { return false; }
}

function loadSnap(){
  var raw = null, o = null;
  try { raw = localStorage.getItem(LS_DATA); } catch (e) { raw = null; }
  if (!raw) return false;
  try { o = JSON.parse(raw); } catch (e) { return false; }
  if (!o || typeof o !== 'object') return false;
  STATE.students = arr(o.students);
  STATE.chars = arr(o.chars);
  STATE.words = arr(o.words);
  STATE.logs = (o.logs && typeof o.logs === 'object') ? o.logs : {};
  return !!(STATE.students.length || STATE.chars.length || STATE.words.length);
}

/* 本机没有字库时，用内置字库（生活语文生字 700 条）兜底，保证离线第一次打开就能上课 */
function seedLocalChars(){
  if (STATE.chars.length) return;
  var out = [], i, c;
  for (i = 0; i < CHARS.length; i++){
    c = CHARS[i];
    out.push({
      id: 'local_char_' + i, kind: '字', w: c.c, p: c.p || '',
      g: c.g || STAGES[c.st] || '未分组', img: '',
      words: c.w || '', sent: c.s || '', on: c.on !== false
    });
  }
  STATE.chars = out;
}

/* ------------------- 内置字库换代：旧的内置字表整表换新 ------------------- */
var LS_CVER = 'wb2_charset_ver';
var LS_COLD = 'wb2_charset_old';
function charsetVerGet(){ try { return localStorage.getItem(LS_CVER) || ''; } catch (e){ return ''; } }
function charsetVerSet(v){ try { localStorage.setItem(LS_CVER, v); } catch (e){} }

/* 只在本机存档路径调用。判断标准：字库里没有一张自己传的图，也没有自建的字，
   说明这张表就是内置生成、老师没动过，可以直接换代。老师改过的一律保留。 */
function migrateCharset(){
  if (charsetVerGet() === CHARSET_VER) return false;
  var i, c, pure = true;
  for (i = 0; i < STATE.chars.length; i++){
    c = STATE.chars[i];
    if (!isLocalId(c.id) || c.img || c.kind !== '字'){ pure = false; break; }
  }
  if (pure && STATE.chars.length){
    try { localStorage.setItem(LS_COLD, JSON.stringify(STATE.chars)); } catch (e){}
    STATE.chars = [];
    seedLocalChars();
    saveSnap();
  } else if (!STATE.chars.length){
    seedLocalChars();
  }
  charsetVerSet(CHARSET_VER);
  return pure;
}

function isLocalId(id){ return String(id || '').indexOf('local_') === 0; }
function newLocalId(){ return 'local_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

/* 云端写入：永不抛错，失败只标记，让本地继续跑 */
function cloudWrite(label, fn){
  var db = dbApi();
  if (!db || STATE.cloudOk === false) return Promise.resolve({ ok: false, local: true });
  return withTimeout(fn(db), 8000, 'timeout').then(function(r){
    STATE.cloudOk = true;
    STATE.cloudTried = true;
    return { ok: true, res: r };
  }).catch(function(e){
    STATE.cloudOk = false;
    STATE.cloudTried = true;
    STATE.loadErr = friendlyErr(e);
    try { console.warn('[云端] ' + label + ' 未同步：', e); } catch (x) {}
    return { ok: false, local: true, err: e };
  });
}

/* ------------------------- 基础工具 ------------------------- */
function $(id){ return document.getElementById(id); }
function CLOSE(tag){ return CL + tag + '>'; }

function setHTML(el, markup){
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
  var rng = document.createRange();
  rng.selectNodeContents(el);
  el.appendChild(rng.createContextualFragment(markup));
}

var ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function esc(s){
  /* 逐字符替换，刻意不用正则：/[&<>"']/ 里带引号，会把 lint 的注释/字符串剥离器带偏 */
  var t = String(s === null || s === undefined ? '' : s), out = '', i, c;
  for (i = 0; i < t.length; i++){
    c = t.charAt(i);
    out += ESC_MAP[c] || c;
  }
  return out;
}
function arr(v){ return Object.prototype.toString.call(v) === '[object Array]' ? v : (v ? [v] : []); }
function firstImage(v){
  var a = arr(v);
  return a.length && a[0] && a[0].imageUrl ? a[0].imageUrl : '';
}
function nowISO(){ return new Date().toISOString(); }
function todayKey(){
  var d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
function toast(msg, ms){
  var old = document.querySelector('.toast');
  if (old && old.parentNode) old.parentNode.removeChild(old);
  var d = document.createElement('div');
  d.className = 'toast';
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(function(){ if (d.parentNode) d.parentNode.removeChild(d); }, ms || 2600);
}
function jitter(n){
  var a = [];
  for (var i = 0; i < n; i++) a.push(i);
  for (var j = n - 1; j > 0; j--){
    var k = Math.floor(Math.random() * (j + 1));
    var t = a[j]; a[j] = a[k]; a[k] = t;
  }
  return a;
}
function pickN(list, n, exclude){
  var pool = [], ex = exclude || [], i;
  for (i = 0; i < list.length; i++){ if (ex.indexOf(list[i]) < 0) pool.push(list[i]); }
  var idx = jitter(pool.length), out = [];
  for (i = 0; i < idx.length && out.length < n; i++) out.push(pool[idx[i]]);
  return out;
}

/* ------------------------- 图片暂存（IndexedDB） -------------------------
   未登录时提交会跳登录并整页刷新，内存里的 File 会丢。把 Blob 存 IndexedDB，
   localStorage 只存一个计数标记。多张图只保留最新一批。
   ------------------------------------------------------------------- */
var IDB_NAME = 'sp_form_img', IDB_STORE = 'f';

function idbOpen(){
  return new Promise(function(resolve){
    if (!window.indexedDB) return resolve(null);
    var req;
    try { req = indexedDB.open(IDB_NAME); } catch (e) { return resolve(null); }
    req.onupgradeneeded = function(){
      try {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE);
      } catch (e) {}
    };
    req.onsuccess = function(){
      var d = req.result;
      if (d.objectStoreNames.contains(IDB_STORE)) return resolve(d);
      var v = d.version + 1;
      try { d.close(); } catch (e) {}
      var r2;
      try { r2 = indexedDB.open(IDB_NAME, v); } catch (e) { return resolve(null); }
      r2.onupgradeneeded = function(){
        try {
          if (!r2.result.objectStoreNames.contains(IDB_STORE)) r2.result.createObjectStore(IDB_STORE);
        } catch (e) {}
      };
      r2.onsuccess = function(){ resolve(r2.result); };
      r2.onerror = function(){ resolve(null); };
      r2.onblocked = function(){ resolve(null); };
    };
    req.onerror = function(){ resolve(null); };
    req.onblocked = function(){ resolve(null); };
  });
}
function idbPut(key, blob){
  return idbOpen().then(function(d){
    if (!d) return null;
    return new Promise(function(resolve){
      try {
        var tx = d.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(blob, key);
        tx.oncomplete = function(){ resolve(true); };
        tx.onerror = function(){ resolve(null); };
        tx.onabort = function(){ resolve(null); };
      } catch (e) { resolve(null); }
    });
  }).catch(function(){ return null; });
}
function idbGet(key){
  return idbOpen().then(function(d){
    if (!d) return null;
    return new Promise(function(resolve){
      try {
        var tx = d.transaction(IDB_STORE, 'readonly');
        var rq = tx.objectStore(IDB_STORE).get(key);
        rq.onsuccess = function(){ resolve(rq.result || null); };
        rq.onerror = function(){ resolve(null); };
      } catch (e) { resolve(null); }
    });
  }).catch(function(){ return null; });
}
function idbDel(keys){
  return idbOpen().then(function(d){
    if (!d) return null;
    return new Promise(function(resolve){
      try {
        var tx = d.transaction(IDB_STORE, 'readwrite');
        var st = tx.objectStore(IDB_STORE);
        var i;
        for (i = 0; i < keys.length; i++){ st.delete(keys[i]); }
        tx.oncomplete = function(){ resolve(true); };
        tx.onerror = function(){ resolve(null); };
        tx.onabort = function(){ resolve(null); };
      } catch (e) { resolve(null); }
    });
  }).catch(function(){ return null; });
}
function imgFlagKey(tag){ return 'sp_img_flag_' + location.pathname + '_' + tag; }
function imgKey(tag, i){ return location.pathname + '::' + tag + '#' + i; }

function imgClear(tag){
  var raw = null, n = 0, info = null, keys = [], i;
  try { raw = localStorage.getItem(imgFlagKey(tag)); } catch (e) { raw = null; }
  if (raw){ try { info = JSON.parse(raw); n = (info && info.n) || 0; } catch (e) { n = 0; } }
  for (i = 0; i < n; i++){ keys.push(imgKey(tag, i)); }
  if (keys.length) idbDel(keys);
  try { localStorage.removeItem(imgFlagKey(tag)); } catch (e) {}
}
function imgStore(tag, blobs){
  imgClear(tag);
  if (!blobs || !blobs.length) return Promise.resolve(null);
  var ps = [], i;
  for (i = 0; i < blobs.length; i++){ ps.push(idbPut(imgKey(tag, i), blobs[i])); }
  return Promise.all(ps).then(function(){
    try { localStorage.setItem(imgFlagKey(tag), JSON.stringify({ n: blobs.length, ts: Date.now() })); } catch (e) {}
    return blobs[0];
  }).catch(function(){ return null; });
}
function imgRestore(tag){
  var raw = null, info = null;
  try { raw = localStorage.getItem(imgFlagKey(tag)); } catch (e) { raw = null; }
  if (!raw) return Promise.resolve(null);
  try { info = JSON.parse(raw); } catch (e) { return Promise.resolve(null); }
  if (!info || !info.n) return Promise.resolve(null);
  if (Date.now() - (info.ts || 0) > 48 * 3600 * 1000){ imgClear(tag); return Promise.resolve(null); }
  return idbGet(imgKey(tag, 0));
}
function fileToBase64(file){
  return new Promise(function(resolve, reject){
    var r = new FileReader();
    r.onload = function(){ resolve(String(r.result).split(',')[1] || ''); };
    r.onerror = function(){ reject(new Error('读取文件失败')); };
    r.readAsDataURL(file);
  });
}

/* ------------------------- 老师表单缓存（localStorage） ------------------------- */
var _cacheTimer = null;
function snapshotForm(){
  var out = {}, els = document.querySelectorAll('#scrTeacher input, #scrTeacher select, #scrTeacher textarea'), i, el;
  for (i = 0; i < els.length; i++){
    el = els[i];
    if (!el.name || el.type === 'file') continue;
    if (/密码|身份证|secret|token|key/i.test(el.name)) continue;
    out[el.name] = (el.type === 'checkbox') ? !!el.checked : el.value;
  }
  return out;
}
function scheduleCache(){
  if (_cacheTimer) clearTimeout(_cacheTimer);
  _cacheTimer = setTimeout(function(){
    _cacheTimer = null;
    try { localStorage.setItem(LS_FORM, JSON.stringify(snapshotForm())); } catch (e) {}
  }, 300);
}
function restoreFormCache(){
  var raw = null, obj = null;
  try { raw = localStorage.getItem(LS_FORM); } catch (e) { raw = null; }
  if (!raw) return;
  try { obj = JSON.parse(raw); } catch (e) { return; }
  var k, el;
  for (k in obj){
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    el = document.querySelector('[name="' + k + '"]');
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = !!obj[k];
    else el.value = obj[k];
  }
}
function clearFormCache(){ try { localStorage.removeItem(LS_FORM); } catch (e) {} }

/* ------------------------- SDK 封装 -------------------------
   databaseId 一律写字面量（lint 要求），别抽成变量。
   --------------------------------------------------------- */
function dbApi(){
  try {
    var p = window.__SMART_PAGE__;
    return (p && p.database) ? p.database : null;
  } catch (e) { return null; }
}
function setSync(txt, cls){
  STATE.syncText = txt; STATE.syncCls = cls || '';
  var a = $('teaSync'), b = $('pickSync');
  if (a){ a.textContent = txt; a.className = 'sync ' + (cls || ''); }
  if (b){ b.textContent = txt; b.className = 'sync ' + (cls || ''); }
}

function pageAll(fetchPage, cursor, acc, guard){
  acc = acc || []; guard = guard || 0;
  if (guard > 100) return Promise.resolve(acc);
  return fetchPage(cursor).then(function(r){
    var rows = (r && r.results) || [];
    acc = acc.concat(rows);
    var nx = r && r.nextCursor;
    if (r && r.hasMore && nx && nx !== cursor && rows.length) return pageAll(fetchPage, nx, acc, guard + 1);
    return acc;
  });
}
function qStudents(cur){
  var db = dbApi();
  if (!db) return Promise.reject(new Error('SDK 未就绪'));
  return db.query({ databaseId: DATABASE_ID, pageSize: 200, startCursor: cur });
}
function qWords(cur){
  var db = dbApi();
  if (!db) return Promise.reject(new Error('SDK 未就绪'));
  return db.query({ databaseId: 'xNa5qeVuLMCljcIzP5Ey5V', pageSize: 200, startCursor: cur });
}
function qLogs(cur){
  var db = dbApi();
  if (!db) return Promise.reject(new Error('SDK 未就绪'));
  return db.query({ databaseId: 'YPUjH8fNLVMazG0BA9gciK', pageSize: 200, startCursor: cur });
}
function schemaStudents(){
  var db = dbApi();
  if (!db) return Promise.reject(new Error('SDK 未就绪'));
  return db.getSchema({ databaseId: DATABASE_ID });
}
function schemaWords(){
  var db = dbApi();
  if (!db) return Promise.reject(new Error('SDK 未就绪'));
  return db.getSchema({ databaseId: 'xNa5qeVuLMCljcIzP5Ey5V' });
}
function schemaLogs(){
  var db = dbApi();
  if (!db) return Promise.reject(new Error('SDK 未就绪'));
  return db.getSchema({ databaseId: 'YPUjH8fNLVMazG0BA9gciK' });
}
/* 写入一律「本机先落、云端后镜像」：cloudWrite 永不 reject */
function writeStudent(props, recId){
  if (recId && isLocalId(recId)) return Promise.resolve({ ok: false, local: true });
  return cloudWrite('学生', function(db){
    if (recId) return db.updateRecord({ databaseId: DATABASE_ID, recordId: recId, properties: props });
    return db.addRecord({ databaseId: DATABASE_ID, properties: props });
  });
}
function removeStudent(recId){
  if (!recId || isLocalId(recId)) return Promise.resolve({ ok: false, local: true });
  return cloudWrite('删除学生', function(db){
    return db.deleteRecord({ databaseId: DATABASE_ID, recordId: recId });
  });
}
function writeWord(props, recId){
  if (recId && isLocalId(recId)) return Promise.resolve({ ok: false, local: true });
  return cloudWrite('字词', function(db){
    if (recId) return db.updateRecord({ databaseId: 'xNa5qeVuLMCljcIzP5Ey5V', recordId: recId, properties: props });
    return db.addRecord({ databaseId: 'xNa5qeVuLMCljcIzP5Ey5V', properties: props });
  });
}
function removeWord(recId){
  if (!recId || isLocalId(recId)) return Promise.resolve({ ok: false, local: true });
  return cloudWrite('删除字词', function(db){
    return db.deleteRecord({ databaseId: 'xNa5qeVuLMCljcIzP5Ey5V', recordId: recId });
  });
}
function writeLog(props, recId){
  if (recId && isLocalId(recId)) return Promise.resolve({ ok: false, local: true });
  return cloudWrite('学习记录', function(db){
    if (recId) return db.updateRecord({ databaseId: 'YPUjH8fNLVMazG0BA9gciK', recordId: recId, properties: props });
    return db.addRecord({ databaseId: 'YPUjH8fNLVMazG0BA9gciK', properties: props });
  });
}
/* ---------------------- 图片预处理与上传（照片/图示共用） ----------------------
   踩坑背景：老师用手机拍的学生照片经常 3-12MB，直接传会被服务端挡掉（单张上限 10MB），
   页面只弹一句「保存失败」，看不出是图片的问题。所以这里做三件事——
   ① 先把长边压到 800px 的 JPEG，一张照片从好几 MB 降到一两百 KB，再校验体积；
   ② 白名单校验格式，不支持的直接给出人话提示；
   ③ 上传加超时，网络卡住或页面没连上数据表时给明确报错，不再无限等。
   压缩失败（例如浏览器解不开 HEIC）时回退原图，只要不超 10MB 照样能传。
   ------------------------------------------------------------------------- */
var IMG_MAX_BYTES = 10 * 1024 * 1024;
var IMG_MAX_SIDE = 800;
var IMG_MIME_OK = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml', 'image/heic', 'image/heif', 'image/tiff'];

function mbText(n){ return (Math.round(n / 1024 / 102.4) / 10) + 'MB'; }

function imgTypeOf(file){
  var t = String((file && file.type) || '').toLowerCase();
  if (t === 'image/jpg') t = 'image/jpeg';
  if (IMG_MIME_OK.indexOf(t) >= 0) return t;
  var n = String((file && file.name) || '').toLowerCase();
  if (/\.jpe?g$/.test(n)) return 'image/jpeg';
  if (/\.png$/.test(n)) return 'image/png';
  if (/\.gif$/.test(n)) return 'image/gif';
  if (/\.webp$/.test(n)) return 'image/webp';
  if (/\.bmp$/.test(n)) return 'image/bmp';
  if (/\.svg$/.test(n)) return 'image/svg+xml';
  if (/\.(heic|heif)$/.test(n)) return 'image/heic';
  if (/\.tiff?$/.test(n)) return 'image/tiff';
  return '';
}

function loadImgEl(file){
  return new Promise(function(resolve, reject){
    var url = '', done = false;
    /* 加超时：有的照片（损坏文件、浏览器不认的格式）onload / onerror 都不触发，
       没有这道保险，保存按钮会永远卡在「上传照片中…」 */
    var timer = setTimeout(function(){ fin(reject, new Error('读取照片超时')); }, 12000);
    function fin(fn, v){
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (url){ try { URL.revokeObjectURL(url); } catch (e) {} }
      fn(v);
    }
    try { url = URL.createObjectURL(file); } catch (e) { return fin(reject, new Error('浏览器无法读取这张照片')); }
    var im = new Image();
    im.onload = function(){ fin(resolve, { el: im, url: url, w: im.naturalWidth || im.width || 0, h: im.naturalHeight || im.height || 0 }); };
    im.onerror = function(){ fin(reject, new Error('这张照片浏览器打不开，换个格式试试')); };
    im.src = url;
  });
}

function shrinkToJpeg(o){
  return new Promise(function(resolve){
    var w = o.w, h = o.h;
    if (!w || !h) return resolve(null);
    var long = w > h ? w : h;
    var scale = long > IMG_MAX_SIDE ? IMG_MAX_SIDE / long : 1;
    var cw = Math.round(w * scale), ch = Math.round(h * scale);
    if (cw < 1 || ch < 1) return resolve(null);
    var cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    var ctx = null;
    try { ctx = cv.getContext('2d'); } catch (e) { return resolve(null); }
    if (!ctx) return resolve(null);
    try {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(o.el, 0, 0, cw, ch);
      URL.revokeObjectURL(o.url);
    } catch (e) { return resolve(null); }
    try {
      cv.toBlob(function(b){ resolve(b || null); }, 'image/jpeg', 0.85);
    } catch (e) { resolve(null); }
  });
}

/* 返回 { blob, type, name, size }：能压就压，压不动就原样交出去 */
function toUploadable(file, t){
  var fallback = { blob: file, type: t, name: file.name || ('photo.' + (t === 'image/png' ? 'png' : 'jpg')), size: file.size };
  if (t === 'image/gif' || t === 'image/svg+xml') return Promise.resolve(fallback);   /* 动图/矢量图不压，压了就坏了 */
  return loadImgEl(file).then(function(o){
    var long = o.w > o.h ? o.w : o.h;
    var need = file.size > 800 * 1024 || long > IMG_MAX_SIDE;
    if (!need){ try { URL.revokeObjectURL(o.url); } catch (e) {} return fallback; }
    return shrinkToJpeg(o).then(function(b){
      if (!b || !b.size) return fallback;
      return { blob: b, type: 'image/jpeg', name: String(file.name || 'photo').replace(/\.[^.]*$/, '') + '.jpg', size: b.size };
    });
  }).catch(function(){ return fallback; });
}

function withTimeout(p, ms, msg){
  return new Promise(function(resolve, reject){
    var done = false;
    var t = setTimeout(function(){ if (!done){ done = true; reject(new Error(msg)); } }, ms);
    p.then(function(v){ if (!done){ done = true; clearTimeout(t); resolve(v); } },
           function(e){ if (!done){ done = true; clearTimeout(t); reject(e); } });
  });
}

/* 把底层各种报错翻译成老师看得懂的一句话 */
function friendlyErr(e){
  var m = String((e && e.message) || e || '');
  if (/SmartPage|timeout/i.test(m) && /timeout/i.test(m)) return '数据连接超时：页面没连上数据表，刷新一下再试';
  if (/未就绪|no sdk|SDK/i.test(m)) return '页面没连上数据表，刷新一下再试';
  if (/网络|network|Failed to fetch|Load failed/i.test(m)) return '网络不通，检查一下网线或 WiFi 再试';
  if (/权限|permission|403|12607/i.test(m)) return '当前账号没有写入权限，请联系资料库管理员';
  if (/10MB|too large|size|过大/i.test(m)) return '图片太大，换一张或先裁剪';
  return m ? ('保存失败：' + m) : '保存失败，请重试';
}

/* 本机缩略图：不依赖网络和登录，保证照片一定显示得出来 */
function localDataUrl(blob){
  return loadImgEl(blob).then(function(o){
    var long = o.w > o.h ? o.w : o.h, side = 220;
    var scale = long > side ? side / long : 1;
    var cw = Math.max(1, Math.round(o.w * scale)), chh = Math.max(1, Math.round(o.h * scale));
    var cv = document.createElement('canvas');
    cv.width = cw; cv.height = chh;
    var ctx = null;
    try { ctx = cv.getContext('2d'); } catch (e) { return ''; }
    if (!ctx) return '';
    try {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, cw, chh);
      ctx.drawImage(o.el, 0, 0, cw, chh);
      URL.revokeObjectURL(o.url);
    } catch (e) { return ''; }
    try { return cv.toDataURL('image/jpeg', 0.72); } catch (e) { return ''; }
  }).catch(function(){ return ''; });
}

/* 返回 { url, local }：url 是云端地址（连不上就空），local 是本机缩略图 */
function uploadImageFile(file){
  var t = imgTypeOf(file);
  if (!t) return Promise.reject(new Error('照片格式不支持，请用 JPG / PNG / WEBP 格式'));
  return toUploadable(file, t).then(function(u){
    if (u.size > IMG_MAX_BYTES) throw new Error('照片太大（' + mbText(u.size) + '），请换一张或先裁剪');
    return localDataUrl(u.blob).then(function(local){
      var db = dbApi();
      if (!db || STATE.cloudOk === false) return { url: '', local: local };
      return fileToBase64(u.blob).then(function(b64){
        if (!b64) throw new Error('照片读取失败，请重新选一次');
        return withTimeout(db.uploadImage({ data: b64, contentType: u.type, fileName: u.name }), 30000, '上传超时：网络比较慢，请重试');
      }).then(function(r){
        return { url: (r && r.url) || '', local: local };
      }).catch(function(){ return { url: '', local: local }; });
    });
  });
}

/* ------------------------- schema 与选项映射 ------------------------- */
function optList(schema, field){
  var props = (schema && schema.properties) || [], i, p, opts;
  for (i = 0; i < props.length; i++){
    p = props[i];
    if (p && p.name === field){
      opts = (p.config && p.config.options) || [];
      return opts;
    }
  }
  return [];
}
function optId(schema, field, text){
  var opts = optList(schema, field), i;
  for (i = 0; i < opts.length; i++){ if (opts[i].text === text) return opts[i].id; }
  /* 拿不到 schema（离线/首次）时退回选项文本：SDK 契约允许 select 直接传文本 */
  return text || '';
}
function fieldNames(schema){
  var props = (schema && schema.properties) || [], out = [], i;
  for (i = 0; i < props.length; i++){ if (props[i] && props[i].name) out.push(props[i].name); }
  return out;
}

/* ------------------------- 组装内存模型 ------------------------- */
function mapStudent(row){
  return {
    id: row._id,
    name: row['姓名'] || '',
    photo: firstImage(row['照片']),
    types: arr(row['练习题型']),
    groups: arr(row['字组']),
    count: row['每日题量'] || 8,
    status: row['状态'] || '在读'
  };
}
function mapWord(row){
  return {
    id: row._id,
    kind: row['类型'] || '字',
    w: row['字词'] || '',
    p: row['拼音'] || '',
    g: row['分组'] || '',
    img: firstImage(row['图示']),
    words: row['组词'] || '',
    sent: row['例句'] || '',
    on: row['启用'] !== false
  };
}
function mapLog(row){
  return {
    id: row._id,
    key: (row['学生'] || '') + '|' + (row['汉字'] || ''),
    stu: row['学生'] || '',
    ch: row['汉字'] || '',
    n: row['练习次数'] || 0,
    alone: row['独立答对'] || 0,
    hinted: row['提示后答对'] || 0,
    wrong: row['答错'] || 0,
    prompts: row['提示次数'] || 0,
    last: row['最近练习'] || '',
    level: row['掌握程度'] || ''
  };
}
function logKey(stu, ch){ return stu + '|' + ch; }
function getLog(stu, ch){
  var k = logKey(stu, ch);
  if (!STATE.logs[k]){
    STATE.logs[k] = { id: '', key: k, stu: stu, ch: ch, n: 0, alone: 0, hinted: 0, wrong: 0, prompts: 0, last: '', level: '待学', dirty: false };
  }
  return STATE.logs[k];
}
function levelOf(r){
  if (!r || !r.n) return '待学';
  if (r.wrong >= 3 && r.alone === 0) return '需巩固';
  if (r.alone >= 3 && r.wrong <= 1) return '已掌握';
  return '练习中';
}
function levelCls(lv){
  if (lv === '已掌握') return 'g';
  if (lv === '练习中') return 'b';
  if (lv === '需巩固') return 'r';
  return 'gy';
}
/* --------------------- 学生档案与进度（T-006 / v12） ---------------------
   进度的分母永远是「这个学生自己的字表」，不是字库、也不是册次。
   v11 的进度页拿「字库里那一册的全部字」做分母：学生字表 20 个字、学会了
   9 个，页面却算出 3%（9 / 300），老师看着像全都没学会。这是口径错，
   不是显示错——所以先修口径，再改界面。
   ------------------------------------------------------------------- */
var LV_ALL = ['已掌握', '练习中', '需巩固', '待学'];

/* 单个学生在某个字上的状态：没有练习记录 = 待学（不是「练习中」） */
function lvOf(stuName, w){
  var r = STATE.logs[logKey(stuName, w)];
  return (r && r.n) ? levelOf(r) : '待学';
}
/* 一次遍历算出整个档案：四态计数、掌握率、最近练习、逐字明细、建议练习顺序 */
function stuProfile(s){
  var chars = isArr(s.chars) ? s.chars : expandGroups(s.groups || []);
  var p = { total: 0, mastered: 0, doing: 0, tough: 0, todo: 0, rate: 0,
            learned: 0, lastAt: '', items: [], focus: [],
            cap: stuCap(s), act: 0, standby: 0 };
  var tough = [], hint = [], doing = [], todo = [];
  var i, w, r, lv, actSet = {}, act = actList(s), seen = {};
  for (i = 0; i < act.length; i++) actSet[act[i]] = 1;
  for (i = 0; i < chars.length; i++){
    w = chars[i];
    if (!w) continue;
    p.total++;
    r = STATE.logs[logKey(s.name, w)] || null;
    lv = (r && r.n) ? levelOf(r) : '待学';
    /* 在学 / 排队：练习表现之外的另一个维度，老师要能分开看。
       字表里可能有跨册重复的字（700 条只有 561 个不重复字），这里按字去重再数，
       否则「在学」会数出 11 / 10 这种比上限还大的数。 */
    if (seen[w]) continue;
    seen[w] = 1;
    if (actSet[w]) p.act++;
    else if (lv !== '已掌握') p.standby++;
    if (lv === '已掌握'){
      p.mastered++;
    } else if (lv === '需巩固'){
      p.tough++; tough.push(w);
    } else if (lv === '练习中'){
      p.doing++;
      /* 「练习中但全靠在提示下答对」的孩子，其实还没独立认出来，排在练习中前面 */
      if (r && r.prompts >= 2) hint.push(w); else doing.push(w);
    } else {
      p.todo++; todo.push(w);
    }
    if (r && r.n){
      p.learned++;
      if (r.last && r.last > p.lastAt) p.lastAt = r.last;
    }
    p.items.push({ w: w, lv: lv, r: r });
  }
  p.rate = p.total ? Math.round(p.mastered * 100 / p.total) : 0;
  /* 建议练习顺序：需巩固 → 靠提示 → 练习中 → 待学（同一桶内保持字表顺序） */
  p.focus = tough.concat(hint, doing, todo);
  return p;
}
/* 最近练习：给老师看人话，不显示 ISO 时间。表格里位置窄，用最短说法 */
function sinceText(iso){
  if (!iso) return '还没练过';
  var t = Date.parse(iso);
  if (!t) return '还没练过';
  var d = Math.floor((Date.now() - t) / 86400000);
  if (d <= 0) return '今天';
  if (d === 1) return '昨天';
  if (d < 30) return d + ' 天前';
  return Math.floor(d / 30) + ' 个月前';
}
function isToday(iso){
  if (!iso) return false;
  var t = Date.parse(iso);
  if (!t) return false;
  return Math.floor((Date.now() - t) / 86400000) <= 0;
}
/* 全班聚合：四态总字次、今天练过几人、全班共同难点字 */
function classProfile(){
  var out = { stu: 0, live: 0, total: 0, mastered: 0, doing: 0, tough: 0, todo: 0,
              today: 0, rate: 0, learned: 0, hard: [] };
  var cnt = {}, order = [], i, j, s, p, w, it;
  for (i = 0; i < STATE.students.length; i++){
    s = STATE.students[i];
    p = stuProfile(s);
    out.stu++;
    if (s.status !== '暂停') out.live++;
    out.total += p.total;
    out.learned += p.learned;
    out.mastered += p.mastered; out.doing += p.doing;
    out.tough += p.tough; out.todo += p.todo;
    if (isToday(p.lastAt)) out.today++;
    for (j = 0; j < p.items.length; j++){
      it = p.items[j];
      if (it.lv !== '需巩固' && !(it.lv === '练习中' && it.r && it.r.prompts >= 2)) continue;
      w = it.w;
      if (!cnt[w]){ cnt[w] = { w: w, n: 0, names: [] }; order.push(w); }
      cnt[w].n++;
      if (cnt[w].names.indexOf(s.name) < 0) cnt[w].names.push(s.name);
    }
  }
  out.rate = out.total ? Math.round(out.mastered * 100 / out.total) : 0;
  var hs = [], k;
  for (i = 0; i < order.length; i++) hs.push(cnt[order[i]]);
  hs.sort(function(a, b){ return b.n - a.n || (a.w > b.w ? 1 : -1); });
  out.hard = hs.slice(0, 12);
  return out;
}
/* --------------------- 学生字表（T-005 / v11） ---------------------
   出题只认 stu.chars 这张显式字表，stu.groups 退化成「来源标签」，只用于
   界面回显「这一组选了几个」。
   这里顺手删掉了旧版最危险的一条默认值：学生一个组都没选时回退全库 700 字。
   对特需学生来说那是灾难——新学生一进来就是 700 个字。
   ------------------------------------------------------------------ */
var LS_DATA_BAK_T005 = 'wb2_data_v1.bak-T005';
var LS_MIG_T005 = 'wb2_mig_t005';
var LS_DATA_BAK_T009 = 'wb2_data_v1.bak-T009';
var LS_MIG_T009 = 'wb2_mig_t009';

function isArr(a){ return Object.prototype.toString.call(a) === '[object Array]'; }
function charMap(){
  /* 字库里有 138 个字跨册重复（教材生字表本来就会重），同一个字只认首次出现的那条，
     这样字表、组内计数、来源标签三处口径一致 */
  var m = {}, i, c;
  for (i = 0; i < STATE.chars.length; i++){
    c = STATE.chars[i];
    if (c && c.w && !m[c.w]) m[c.w] = c;
  }
  return m;
}
/* 按组展开成汉字数组：老数据迁移、以及界面「整组加入」都用它。
   groups 为空 → 空数组（刻意不回退全库）。 */
function expandGroups(groups){
  var out = [], i, c, want = isArr(groups) ? groups : [];
  if (!want.length) return out;
  for (i = 0; i < STATE.chars.length; i++){
    c = STATE.chars[i];
    if (!c || !c.on || !c.w) continue;
    if (want.indexOf(c.g) < 0) continue;
    if (out.indexOf(c.w) < 0) out.push(c.w);
  }
  return out;
}
/* 老存档只有 groups、没有 chars。展开一次并写回；迁移前先原样备份整份存档。
   条件「没有 chars 字段」本身就幂等，不需要额外的完成标记。 */
function migrateStuChars(){
  var i, s, todo = [], raw = '';
  for (i = 0; i < STATE.students.length; i++){
    s = STATE.students[i];
    if (!s || typeof s !== 'object') continue;
    if (isArr(s.chars)) continue;
    todo.push(s);
  }
  if (!todo.length) return 0;
  try {
    if (localStorage.getItem(LS_MIG_T005) !== '1'){
      raw = localStorage.getItem(LS_DATA);
      if (raw) localStorage.setItem(LS_DATA_BAK_T005, raw);
      localStorage.setItem(LS_MIG_T005, '1');
    }
  } catch (e) {}
  for (i = 0; i < todo.length; i++){
    todo[i].chars = expandGroups(todo[i].groups || []);
  }
  saveSnap();
  return todo.length;
}
function charsOf(stu){
  var out = [], i, c, m, want;
  if (!stu) return out;
  /* 迁移没跑到时（例如直接从云端拉来的学生）也不能炸，按组兜底展开 */
  want = isArr(stu.chars) ? stu.chars : expandGroups(stu.groups || []);
  if (!want.length) return out;
  m = charMap();
  for (i = 0; i < want.length; i++){
    c = m[want[i]];
    if (c && c.on !== false && c.w) out.push(c);
  }
  return out;
}
/* --------------------- 在学上限与字表状态机（T-009 / v19） ---------------------
   用户 2026-10-22：「在学上限是否可以根据学生的情况去调整，有的学生可以八个，有的可以才五个」。
   做法：原来的「每日题量」升级成「在学字数」——同时在手上练的就这么多，
   一次练习正好把这几个字过一遍；哪个字练到「已掌握」就自动退出，从待学里补一个进来。
   不新加 `cap` 字段，就是为了不出现「题量」和「上限」两个数字互相打架。
   -------------------------------------------------------------------------- */
var STU_CAP_MIN = 3;
var STU_CAP_MAX = 10;
var STU_CAP_DEF = 6;
function stuCap(stu){
  var n = parseInt(stu && stu.count, 10);
  if (!n || isNaN(n)) n = STU_CAP_DEF;
  if (n < STU_CAP_MIN) n = STU_CAP_MIN;
  if (n > STU_CAP_MAX) n = STU_CAP_MAX;
  return n;
}
/* 只读不写：给 stuProfile 这类"算一下"的地方用，避免顺手改了数据 */
function actList(stu){
  return (stu && isArr(stu.active)) ? stu.active : [];
}
function lockList(stu){
  return (stu && isArr(stu.lock)) ? stu.lock : [];
}
/* 老师手动移出在学的字：记在这里，补位时跳过，否则下一次同步又把它补回来，
   「移出」按钮就等于没做。点「加入」会把它从这张表里删掉。 */
function offList(stu){
  return (stu && isArr(stu.off)) ? stu.off : [];
}
/* 一个字的「学习阶段」：在学 / 已掌握 / 待学（排队中）。
   注意和 levelOf 的三态不是一回事：levelOf 说的是练得怎么样，
   这里说的是这个字有没有排进手上这一批。 */
function stageOf(stu, w){
  if (!stu || !w) return '待学';
  if (actList(stu).indexOf(w) >= 0) return '在学';
  var r = STATE.logs[logKey(stu.name, w)];
  if (r && r.n && levelOf(r) === '已掌握') return '已掌握';
  return '待学';
}
/* 维护在学名单：移出已达标的（锁定的除外），再从待学里补足到上限。
   返回 true 表示名单变了，调用方据此决定要不要落盘。 */
function syncActive(stu){
  if (!stu) return false;
  var pool = charsOf(stu), map = {}, i, j, w, r, cap = stuCap(stu);
  var out = [], seen = {}, offMap = {}, locks = lockList(stu);
  var before = actList(stu).join('');
  var act = actList(stu), off = offList(stu);
  for (i = 0; i < off.length; i++) offMap[off[i]] = 1;
  for (i = 0; i < pool.length; i++) map[pool[i].w] = 1;
  /* ① 留下的：还在字表里、还没掌握（或者老师锁了不许动） */
  for (i = 0; i < act.length && out.length < cap; i++){
    w = act[i];
    if (!w || !map[w] || seen[w]) continue;
    r = STATE.logs[logKey(stu.name, w)];
    if (r && r.n && levelOf(r) === '已掌握' && locks.indexOf(w) < 0) continue;
    seen[w] = 1;
    out.push(w);
  }
  /* ② 补满到上限。空位有三种来源，都要补：
       · 练到「已掌握」让出来的名额；
       · 字表后来变大（先建了 1 个字的字表、回头补齐 28 个字）；
       · 在学字数被调大（先设 1、改成 8）。
     v19 那版只认第一种，于是「字表补齐了、上限调大了，却还是只有一个字在学」
    —— 老师 2026-10-29 报的就是这个（上限 8、字表 28、在学 1）。
    唯一的例外是老师**手动移出**的字（在 off 里）：那是有意为之，不补；要它回来点「加入」。 */
  if (out.length < cap){
    var order = stuProfile(stu).focus;
    for (j = 0; j < order.length && out.length < cap; j++){
      w = order[j];
      if (seen[w] || !map[w] || offMap[w]) continue;
      seen[w] = 1;
      out.push(w);
    }
  }
  stu.active = out;
  return out.join('') !== before;
}
/* 对外：拿到这个学生此刻在学的那几个字（会顺手把名单摆正） */
function stuActive(stu){
  syncActive(stu);
  return actList(stu).slice();
}
/* 加入 / 移出在学。手动移出的字会进 lock？不 —— 移出就是移出，
   下一轮补位可能又把它补回来；老师要的是「这个字先别动」，那是 lock。 */
function actAdd(stu, w){
  if (!stu || !w) return false;
  var pool = charsOf(stu), map = {}, i;
  for (i = 0; i < pool.length; i++) map[pool[i].w] = 1;
  if (!map[w]) return false;
  var act = actList(stu);
  if (act.indexOf(w) >= 0) return false;
  if (act.length >= stuCap(stu)) return false;      /* 满了先移出一个再加 */
  /* 已经掌握的字被老师手动拉回来 = 复习，顺手锁住：
     不锁的话下一轮 syncActive 会判定「已掌握」又把它剔出去，按钮看着像没用。 */
  var r0 = STATE.logs[logKey(stu.name, w)];
  if (r0 && r0.n && levelOf(r0) === '已掌握' && lockList(stu).indexOf(w) < 0) actLock(stu, w);
  act.unshift(w);        /* 新加的排最前：老师刚点进来这个字，下一次练习就先练它 */
  stu.active = act;
  /* 手动加回来的字要从「别再补」名单里去掉，否则下次同步又被当成移出过的跳过 */
  var off = offList(stu).slice(), at2 = off.indexOf(w);
  if (at2 >= 0){ off.splice(at2, 1); stu.off = off; }
  saveSnap();
  return true;
}
function actDel(stu, w){
  if (!stu || !w) return false;
  var act = actList(stu), at = act.indexOf(w);
  if (at < 0) return false;
  act.splice(at, 1);
  stu.active = act;
  /* 记下来：这是老师有意移出的，补位时不要再塞回来（v19 只移出不留痕，等于下一轮白移） */
  var off = offList(stu).slice();
  if (off.indexOf(w) < 0) off.push(w);
  stu.off = off;
  saveSnap();
  return true;
}
function actLock(stu, w){
  if (!stu || !w) return false;
  var locks = lockList(stu), at = locks.indexOf(w);
  if (at >= 0) locks.splice(at, 1); else locks.push(w);
  stu.lock = locks;
  saveSnap();
  return true;
}
/* 一次性迁移：旧的「每日题量」可能是 12 / 20，收紧到 3–10；
   同时给每个学生补上 active 数组。改动前整份存档备份到 bak-T009。 */
function migrateCap(){
  var i, s, n, changed = 0, needBak = false;
  for (i = 0; i < STATE.students.length; i++){
    s = STATE.students[i];
    if (!s || typeof s !== 'object') continue;
    n = parseInt(s.count, 10);
    if (!n || isNaN(n)) n = STU_CAP_DEF;
    if (n > STU_CAP_MAX) n = STU_CAP_MAX;
    if (n < STU_CAP_MIN) n = STU_CAP_MIN;
    if (s.count !== n){ s.count = n; changed++; needBak = true; }
    if (!isArr(s.active)){ s.active = []; changed++; needBak = true; }
  }
  if (!needBak) return 0;
  try {
    if (localStorage.getItem(LS_MIG_T009) !== '1'){
      var raw = localStorage.getItem(LS_DATA);
      if (raw) localStorage.setItem(LS_DATA_BAK_T009, raw);
      localStorage.setItem(LS_MIG_T009, '1');
    }
  } catch (e) {}
  saveSnap();
  return changed;
}
/* 听写拆成两个题型（v27）：老学生的「汉字听写」以前听的是词，语义变了，
   所以给他补上「词语听写」，把原来练的东西接住。老师可以随时取消勾选。 */
var LS_DATA_BAK_T023 = 'wb2_data_v1.bak-T023';
var LS_MIG_T023 = 'wb2_mig_t023';
function migrateTypes(){
  var i, s, t, at, changed = 0;
  for (i = 0; i < STATE.students.length; i++){
    s = STATE.students[i];
    if (!s || !isArr(s.types)) continue;
    if (s.types.indexOf('汉字听写') < 0) continue;
    if (s.types.indexOf('词语听写') >= 0) continue;
    at = s.types.indexOf('汉字听写') + 1;
    t = s.types.slice(0, at);
    t.push('词语听写');
    s.types = t.concat(s.types.slice(at));
    changed++;
  }
  if (!changed) return 0;
  try {
    if (localStorage.getItem(LS_MIG_T023) !== '1'){
      var raw = localStorage.getItem(LS_DATA);
      if (raw) localStorage.setItem(LS_DATA_BAK_T023, raw);
      localStorage.setItem(LS_MIG_T023, '1');
    }
  } catch (e) {}
  saveSnap();
  return changed;
}
function artOf(c){
  if (!c) return '';
  if (c.img) return '<img src="' + esc(c.img) + '" alt="" width="200" height="200" loading="lazy">';
  var b = ART_PACK[c.w];
  if (b) return '<svg viewBox="0 0 120 120" aria-hidden="true">' + b + CLOSE('svg');
  b = BUILTIN_ART[c.w];
  if (b) return '<svg viewBox="0 0 120 120" aria-hidden="true">' + b + CLOSE('svg');
  return '';
}
/* --------------------- 内置词表（拼词语专用） ---------------------
   不另外维护一份词表：直接抽字库的「组词」栏（700 条 × 1~2 个词 = 969 个双字词），
   再加上老师自己在词库里录的词。这样「词库」终于有了用处，也不必再让老师录一遍。
   只收双字词——教材组词 99% 是双字，三字词拆开拼对特需孩子太难。
   老师端「词库」拿 builtinWords() 当默认内容显示，所以新装的页面不会是一张空表；
   老师点「收进词库」才复制进 STATE.words，之后可编辑/停用，内置那份始终跟字库同步。
   每次开新题重建（约 970 条 split，5 ms 级），老师改完字库立刻生效。 */
var BUILTIN_WORDS = null;
function builtinWords(rebuild){
  if (BUILTIN_WORDS && !rebuild) return BUILTIN_WORDS;
  var list = [], byW = {}, pyMap = {}, i, j, c, p, parts, c1, c2, py;
  /* 拼音用「字 → 拼音」查表拼出来（两个字的音），不另存整词拼音 */
  function notePy(ch, py0){ if (ch && pyMap[ch] === undefined) pyMap[ch] = py0 || ''; }
  function eat(from, words, fromPy){
    parts = String(words).split(/[、，,；;\/|\s]+/);
    for (j = 0; j < parts.length; j++){
      p = String(parts[j]).trim();
      if (!/^[\u4e00-\u9fff]{2}$/.test(p) || byW[p]) continue;
      byW[p] = 1;
      c1 = pyMap[p.charAt(0)]; c2 = pyMap[p.charAt(1)];
      py = (c1 && c2) ? (c1 + ' ' + c2) : '';
      list.push({ w: p, from: from, fromP: fromPy || '', py: py,
                  a: p.charAt(0), b: p.charAt(1) });
    }
  }
  for (i = 0; i < STATE.chars.length; i++){
    c = STATE.chars[i];
    if (c && c.w) notePy(c.w, c.p);
  }
  for (i = 0; i < STATE.chars.length; i++){
    c = STATE.chars[i];
    if (!c || c.on === false || !c.words) continue;
    eat(c.w, c.words, c.p);
  }
  /* 兜底：整张字表的「组词」栏都是空的（老存档 / 云端整表覆写丢了这一列 /
     老师自己导的字表没填组词），词库和拼词语就都没词可用。
     这时直接用页面里编译好的内置字表 CHARS —— 它不是第二份词表，就是同一个字库。 */
  var fallback = false;
  if (!list.length){
    fallback = true;
    pyMap = {};
    for (i = 0; i < CHARS.length; i++) notePy(CHARS[i].c, CHARS[i].p);
    for (i = 0; i < CHARS.length; i++){
      c = CHARS[i];
      if (c && c.w) eat(c.c, c.w, c.p);
    }
  }
  BUILTIN_WORDS = { list: list, byW: byW, fallback: fallback };
  return BUILTIN_WORDS;
}

/* ------------------- 常见搭配表（拼词语专用互斥源） -------------------
   「一人」「人头」「人大」这些都是真词，但字库的「组词」栏没写到，所以不在
   词库里；孩子拼出来，程序只会去本组 3 个词里找，找不到就说「拼不成词」——
   他自己觉得拼对了，程序说他错，这就成了 bug（老师 2026-10-29 报的那一例）。
   这张表只用于出题时的互斥检查（见 wbCrossHit）：同屏字块只要能拼出表里的词，
   这一组就换词。它不进题库、不改变出题范围，凑不够词时还会自动放宽，
   所以多收几条只是「更保守」，不会教错字。 */
var CROSS_TEXT =
  '一人 三人 两人 那个 个头 个子 一生 一手 一头 一口 一路 一门 一车 一本 一包 一天 一年 一月 一日 一早 ' +
  '一对 第三 第五 第十 两只 两年 两手 几年 几时 几次 几人 好多 不多 好些 多好 大多 多年 两次 每次 上次 ' +
  '人次 人头 人大 人手 人心 人群 人们 人生 人家 人口 人工 人物 人身 人力 小人 家人 他人 病人 名人 新人 ' +
  '成人 生人 本人 农人 诗人 友人 每人 有人 无人 旁人 大雨 大门 大路 大车 大牛 大山 大水 大红 大方 大力 ' +
  '大地 大河 大楼 大名 大事 大病 小声 小路 小车 小时 小花 小虫 小兔 小气 小树 小山 小门 小雨 小村 小桥 ' +
  '小说 天上 天下 天冷 天热 天晴 天边 天灯 山水 山头 山下 山石 山村 山河 山风 山花 山林 山路 山门 高山 ' +
  '江山 水手 水牛 水面 水花 水草 水车 海水 开水 打水 水鸟 水声 水边 水里 水中 水上 火苗 火山 火气 火红 ' +
  '火光 火星 发火 上火 玩火 着火 手心 手工 身手 手头 手写 手电 手巾 手语 动手 帮手 高手 能手 手里 手上 ' +
  '手边 手快 口头 口水 口气 口子 开口 关口 口吃 大口 小口 心口 路口 口风 电话 电车 电脑 电光 水电 发电 ' +
  '用电 家电 电池 风车 风雨 风声 风口 风头 风气 风光 春风 秋风 海风 风衣 冷风 热风 雨水 春雨 雨衣 雨点 ' +
  '雨声 雨花 上衣 毛衣 衣架 衣领 内衣 外衣 睡衣 服气 口服 心服 老家 老牛 老马 老天 老树 老街 老手 老乡 ' +
  '老年 老大 老二 老三 老四 老五 老友 老话 老路 师生 师长 大师 名师 出师 说法 听说 说书 说笑 好说 说人 ' +
  '说好 学说 说白 话语 好话 问话 传话 梦话 话头 话本 看家 好看 看重 看病 看门 看头 看人 看车 看山 看水 ' +
  '看花 看鸟 看鱼 看天 看云 看灯 看报 看表 走动 快走 出走 走道 走进 走出 走上 走下 走人 走马 走水 走火 ' +
  '走风 跑车 跑动 长跑 跑路 跑马 跑水 跑人 飞鸟 飞行 起飞 飞快 飞天 飞车 飞鱼 飞虫 飞花 飞人 飞云 鸟叫 ' +
  '鸟蛋 鸟语 鸟群 鸟毛 鸟儿 鸟头 鱼头 鱼群 鱼虫 鱼身 鱼水 鱼片 鱼竿 鱼骨 鱼尾 猫头 猫叫 花猫 猫儿 狗叫 ' +
  '狗头 狗年 狗毛 狗肉 狗皮 马车 马头 白马 马上 马年 木马 牛毛 牛车 牛头 牛年 牛气 羊毛 羊群 羊头 白羊 ' +
  '羊年 羊皮 兔毛 兔年 兔头 鸡毛 鸡叫 鸡年 鸡头 鸡皮 鸡肉 鸭蛋 鸭毛 鸭肉 鸭头 猪头 猪年 猪毛 猪皮 猪心 ' +
  '心中 开心 好心 爱心 用心 心动 心爱 心事 中心 知心 心意 心田 心火 家里 村里 城里 店里 里边 里头 里外 ' +
  '公里 田里 土里 山里 门里 楼里 园里 市里 班里 上面 上车 上山 上楼 上门 上来 上去 头上 路上 桌上 街上 ' +
  '地上 门上 台上 车上 面上 树上 身上 下面 下车 下山 下来 下去 地下 下水 下手 上下 楼下 门下 水下 桌下 ' +
  '桥下 中学 空中 手中 山中 林中 村中 城中 口中 家中 田中 前后 前进 前门 前来 门前 面前 前头 前车 前天 ' +
  '前日 后来 后天 身后 最后 后门 门后 山后 后头 后车 后路 后人 后山 外国 外来 门外 海外 外头 外公 外人 ' +
  '外地 东边 东南 东北 东风 东门 山东 广东 东头 西方 西边 西南 西北 西风 西门 山西 广西 江南 南门 南山 ' +
  '河南 北边 北风 北门 河北 北山 高声 高人 长年 长处 家长 班长 市长 生长 长成 长路 长虫 长河 不好 好天 ' +
  '好手 好大 好高 好长 好重 好书 好花 好水 好山 好路 好车 好门 好家 好鸟 好鱼 好菜 好肉 不少 不用 不能 ' +
  '不同 不会 不知 不见 不对 不大 用法 用处 用水 用钱 用笔 用手 用口 开车 开学 开灯 开火 开关 开花 开工 ' +
  '开店 开山 开河 开田 关上 关灯 关水 出门 出发 出名 出现 出行 出车 出海 出水 出山 看来 到来 生来 回去 ' +
  '过去 去年 去处 走去 去路 大会 会长 体会 会心 会见 能力 能人 是的 正是 老是 还是 只是 要是 有力 有点 ' +
  '有时 有的 有心 有意 有事 有病 无力 无名 无边 无比 无声 无话 无水 无山 无火 无光 月牙 二月 三月 明月 ' +
  '圆月 月头 月夜 日用 日出 日光 日报 每日 日记 日头 年长 年头 年画 年月 年货 年前 年后 早就 早年 起早 ' +
  '早点 早先 早班 早市 早春 晚会 晚点 晚风 晚秋 时节 时光 白天 白菜 白发 白水 白米 白花 白鸟 白鱼 白狗 ' +
  '白猫 白牛 白衣 白手 白脸 黑夜 黑白 黑马 乌黑 黑人 黑水 黑狗 黑猫 黑手 黑脸 红火 红包 脸红 红脸 红木 ' +
  '红人 红鱼 红鸟 黄牛 黄花 金黄 黄土 黄鱼 黄米 蓝图 蓝本 青天 青年 青色 青石 青竹 彩带 彩笔 彩花 花名 ' +
  '花车 花心 花色 花头 花鸟 花树 花灯 花衣 草地 草木 草虫 草鱼 树木 树干 果树 树皮 树头 树花 树下 木门 ' +
  '木工 木片 木床 木桌 木房 林子 园林 竹林 果子 果皮 果肉 田土 田头 水土 土山 土人 石桥 石山 石花 石桌 ' +
  '金子 金光 金星 金花 金山 玉石 水珠 圆珠 宝物 法宝 小米 米花 米汤 菜花 菜园 菜地 菜刀 菜头 菜心 菜叶 ' +
  '菜肉 菜汤 羊肉 肉片 肉菜 肉汤 蛋黄 蛋花 蛋汤 奶牛 奶妈 汤圆 热汤 汤面 鸡汤 甜瓜 冷气 冷面 热天 热气 ' +
  '热爱 热心 男女 男孩 女孩 子女 少女 女工 先前 先头 先人 发生 花生 生字 新生 生火 生水 生鱼 生肉 生菜 ' +
  '学年 学问 大学 校园 校门 校服 校车 字画 文字 字头 写话 大写 写法 写书 读法 读本 读报 书店 书房 包子 ' +
  '打包 包好 店面 果园 园子 家园 村民 村口 村头 村长 全村 长城 古城 城头 路边 公路 路头 路灯 路人 车子 ' +
  '车头 车门 车身 车灯 站长 站点 站台 街道 街头 街口 街灯 下楼 楼房 楼道 房门 门牙 门面 窗前 窗台 窗外 ' +
  '车窗 门窗 窗花 床上 起床 床头 床边 桌边 课桌 圆桌 桌面 灯光 红灯 灯头 灯火 灯下 台子 台面 台下 课文 ' +
  '课时 课外 全班 同班 白班 夜班 班车 一同 同心 同事 同步 同乡 同路 女友 男友 友爱 好友 家具 家书 家门 ' +
  '家事 家猫 家狗 国画 国内 国外 国语 国人 国花 民主 市民 公民 民歌 族人 贵族 大众 听众 群山 群鸟 群星 ' +
  '排长 排好 排头 排开 成长 成为 成天 成千 成家 知了 知人 知事 认字 认人 认路 识字 见识 正门 正方 正面 ' +
  '正手 正路 正午 不在 在场 好在 自在 问人 问路 问事 听讲 讲学 讲书 好听 听写 听力 听人 听书 听歌 听声 ' +
  '歌唱 歌手 歌声 国歌 儿歌 跳远 心跳 跳车 跳水 跳马 坐好 坐车 坐立 坐井 起立 立冬 立春 立夏 立秋 想起 ' +
  '起头 起手 起风 起水 起火 起名 玩水 玩笑 玩球 玩车 玩心 笑声 大笑 笑人 笑口 吃肉 吃菜 吃鱼 吃水 吃果 ' +
  '吃蛋 吃面 吃瓜 好喝 喝奶 午睡 睡好 早睡 睡床 午觉 不觉 觉着 洗车 洗碗 洗衣 洗头 洗菜 洗米 洗水 洗好 ' +
  '洗鱼 穿鞋 穿过 穿好 穿心 穿山 穿林 穿水 扫把 清扫 扫街 扫水 抱人 找人 找钱 好找 找路 找书 找门 找水 ' +
  '找火 找花 见人 意见 见到 见天 见水 见山 见光 看到 到家 到手 到头 想到 心想 想家 想人 想水 想火 想花 ' +
  '想书 欢快 欢声 欢心 欢歌 欢跳 喜爱 喜事 喜气 喜人 喜花 喜酒 爱好 亲爱 爱情 爱国 爱人 爱花 爱书 爱水 ' +
  '爱山 爱鸟 爱鱼 爱狗 爱猫 爱笑 保人 保家 护手 护人 护花 护山 护水 护书 护家 帮人 帮工 帮好 帮书 助力 ' +
  '助人 助跑 很忙 忙人 农忙 忙活 紧急 急事 心急 急人 急着 急水 急走 急跑 着手 着地 着人 着水 着风 安心 ' +
  '安好 安家 安人 安身 安睡 全国 全体 全人 全车 全心 全手 全城 全校 平时 水平 平地 平房 平手 平面 平日 ' +
  '平头 快车 快活 快人 快马 快话 快手 乐园 乐事 乐人 乐天 很快 很大 很小 很高 很长 很重 很冷 很热 很晚 ' +
  '很早 很美 很远 最多 最少 最小 最高 最爱 最前 最美 最远 最重 最快 最早 最晚 更加 更早 更美 更大 更小 ' +
  '更高 更长 更远 更重 都来 都有 都要 都走 也都 也有 也要 还能 还要 还来 还走 成就 就地 就学 只好 只身 ' +
  '那些 点心 起点 点子 点灯 点火 点水 点人 上头 头目 头号 开头 头前 发车 发言 发光 发人 发水 发书 发花 ' +
  '光身 光面 光头 光手 光水 光山 明心 明水 明山 明灯 光亮 点亮 亮光 亮面 亮心 亮灯 晴好 晴日 晴空 空地 ' +
  '空手 有空 空心 空车 空门 空山 空水 空话 空口 生气 气球 气人 气头 神气 气力 气话 气水 气山 主力 手力 ' +
  '心力 水力 火力 名声 出声 口音 音节 发音 音色 本子 本领 本事 本家 本钱 本心 小事 事后 热情 友情 情节 ' +
  '情人 情话 情书 对方 对手 对话 对头 对门 对人 对山 对水 地面 面子 画面 面具 面食 面人 地点 地图 地球 ' +
  '各地 地头 方正 方面 方子 法国 法子 法人 法门 变天 不变 变形 变人 变水 变火 变光 变色 变脸 变心 化工 ' +
  '化石 方形 外形 图形 形色 动口 动心 生动 动工 行动 动人 动车 动水 动山 物体 万物 物主 物色 行人 行车 ' +
  '行为 步行 行书 行头 行路 工头 上工 工地 工时 工钱 工友 农田 农事 农工 农家 门市 市面 场地 农场 场面 ' +
  '开场 会场 球场 广大 很广 故乡 故人 故土 乡下 乡亲 城乡 乡人 乡里 亲手 亲自 亲口 亲家 祖先 先走 先天 ' +
  '先手 神州 神山 神人 神火 神水 神手 州长 海上 海鱼 海鸟 海鲜 海面 海心 海山 海石 海花 海草 江边 江面 ' +
  '过江 江北 江心 江中 江里 江鱼 河边 河里 黄河 河面 河心 河鱼 河石 河花 湖边 湖面 江湖 湖心 湖山 湖光 ' +
  '湖里 湖中 桥上 桥头 桥面 桥边 毛虫 毛发 毛皮 毛头 毛手 比如 比人 比手 比水 比山 比花 比大 比小 比高 ' +
  '如意 如同 不如 如人 如花 如水 如山 何时 何不 何人 何处 那么 多么 要么 那次 那时 那人 那家 那山 那水 ' +
  '那花 那书 那车 那门 那树 每年 每月 每晚 各个 各国 各家 各人 种花 种地 种田 种菜 种果 种瓜 少许 共有 ' +
  '共人 共水 共山 共心 公开 公用 公主 公心 公家 主意 主动 主家 主水 主山 主心 要点 要人 要好 要水 要山 ' +
  '要花 要书 要车 请人 观点 美观 观水 观山 观花 观鸟 观鱼 观书 观灯 观天 钱包 钱币 金币 送货 货车 货色 ' +
  '货主 很贵 贵姓 贵人 发财 财主 瓜果 瓜子 冬瓜 桃树 桃园 杏花 柳叶 柳条 松果 青松 松手 竹马 竿子 竿头 ' +
  '莲叶 苗头 苗子 棉鞋 鞋带 鞋面 皮毛 皮衣 皮肉 皮包 带走 带路 带人 带水 带山 带花 带书 带车 带鱼 伞面 ' +
  '伞下 打字 打工 打人 打头 打门 打火 打鱼 打手 打花 打鸟 架子 架空 架车 球门 球心 球面 球手 戏台 戏法 ' +
  '戏人 画笔 画家 笔画 画本 画心 画水 画山 画花 画鸟 画鱼 画人 画手 毛笔 笔头 笔直 笔心 铅字 图片 图本 ' +
  '问句 句号 号子 口号 号手 新手 新书 新衣 新房 新事 新花 新水 新山 新车 新门 新灯 新树 新鸟 奇人 奇花 ' +
  '奇山 奇石 奇水 奇树 奇鸟 奇鱼 奇事 奇书 怪人 怪事 怪话 怪水 怪山 怪花 怪声 怪手 怪脸 传统 传人 流传 ' +
  '传家 传书 统共 过节 节目 节子 节头 春季 季风 重新 体重 重头 重点 重阳 重水 重山 重手 阳面 阳春 阳水 ' +
  '阳山 太大 太好 太空 太早 太晚 太少 太远 太重 太忙 太冷 太热 太美 太长 美食 美国 美事 美人 美心 美言 ' +
  '美水 美山 美花 美书 美车 丽人 华美 华人 华北 华南 华文 华水 华山 梦中 美梦 梦人 梦花 梦水 梦山 梦鸟 ' +
  '梦鱼 毛病 病好 病情 病床 病水 病山 病花 中医 医书 身高 身心 全身 亲身 身水 身山 身花 身书 体温 字体 ' +
  '体力 体面 边门 边头 旁门 身旁 旁听 远处 远门 长远 远山 远路 远人 远水 远花 远车 远看 远走 近来 近处 ' +
  '近路 近人 近日 近水 近山 近花 近看 很厚 厚爱 害人 害处 注目 注入 注水 ';
var CROSS_SET = null;
function crossSet(){
  if (CROSS_SET) return CROSS_SET;
  var a = CROSS_TEXT.split(/\s+/), i, o = {};
  for (i = 0; i < a.length; i++){ if (a[i].length === 2) o[a[i]] = 1; }
  CROSS_SET = o;
  return o;
}

/* ------------------- 词的难度：按「字的册次」算，不用固定黑名单 -------------------
   「统一」对一年级学「一」的孩子太抽象，但对六年级学「统」的孩子就是个正常词 ——
   难度不是词自己的属性，是**相对这个学生当前进度**的（老师 2026-10-29 原话）。
   所以这里不维护「难词表」，只把每个字换算成它在教材里的册次序号：
   一年级上册 = 0 … 六年级下册-认 = 21（`STAGES` 的顺序就是册次顺序）。
   出题时拿词的册次去比学生字表里那些字的册次，学生走到哪儿，词就放到哪儿。 */
var CHAR_STAGE = null;
function charStageMap(){
  if (CHAR_STAGE) return CHAR_STAGE;
  var m = {}, i, c, k;
  for (i = 0; i < CHARS.length; i++){
    c = CHARS[i];
    if (!c || !c.c) continue;
    k = STAGES.indexOf(c.g);
    /* 同一个字会跨册重复（700 条只有 561 个不重复字）：认**最早**出现的那一册，
       那才是孩子第一次学它的时间。查不到册次（老师自己建的字组）记 -1，不拿去卡人。 */
    if (m[c.c] === undefined) m[c.c] = k;
    else if (k >= 0 && (m[c.c] < 0 || k < m[c.c])) m[c.c] = k;
  }
  CHAR_STAGE = m;
  return m;
}
function charStage(ch){
  var m = charStageMap(), k = m[ch];
  return (k === undefined) ? -1 : k;
}

/* 一个词能不能给这个学生拼：
   · 两个字都在他字表里 → 一定能（都是他学过的字，再抽象也是他的课本词）；
   · 只有一个字在字表里 → 那个超纲的字不能比他现在的册次高太多。
   宽限定 4 册（约一个学年）：一年级孩子的字表只有一上 10 个字，卡到 2 册就只能出
   2 组（量掉一半），放到 4 册能出满 4 组、最深只用到「个」这种二上的字；
   而「统」在六年级上册（差 19 册），怎么放宽都碰不到。 */
var WB_STAGE_GAP = 4;
function stuStageLevel(stu){
  if (!stu || !stu.chars || !stu.chars.length) return -1;
  var arr = [], i, k;
  for (i = 0; i < stu.chars.length; i++){
    k = charStage(stu.chars[i]);
    if (k >= 0) arr.push(k);
  }
  if (!arr.length) return -1;
  /* 取中间值而不是最高值：字表里偶尔混进一个超前字（老师手动加的），
     不该把整个班的出词门槛一起抬上去。 */
  arr.sort(function(x, y){ return x - y; });
  return arr[Math.floor(arr.length / 2)];
}
function wordFitsStu(ca, cb, a, b, lv){
  if (ca && cb) return true;
  if (lv === undefined || lv < 0) return true;      /* 字表没册次（老师自建组），不拦 */
  var other = ca ? charStage(b) : charStage(a);     /* 超纲的那个字 */
  if (other < 0) return true;
  return other <= lv + WB_STAGE_GAP;
}


/* 字库「组词」栏体检：老存档或云端整表覆写可能把这一列弄丢，
   表现就是「词库空表 + 拼词语没词」而字却都在。
   只在「整张字表一个字都没填组词」时，从内置字表按字补回来；
   老师自己填过的、哪怕只填了一条，一律不动。返回补回的条数。 */
function repairCharWords(){
  var i, c, src, byChar = {}, n = 0, hasAny = false;
  for (i = 0; i < STATE.chars.length; i++){
    c = STATE.chars[i];
    if (c && c.words && String(c.words).replace(/\s/g, '')){ hasAny = true; break; }
  }
  if (hasAny || !STATE.chars.length) return 0;
  for (i = 0; i < CHARS.length; i++) byChar[CHARS[i].c] = CHARS[i];
  for (i = 0; i < STATE.chars.length; i++){
    c = STATE.chars[i];
    if (!c || !c.w) continue;
    src = byChar[c.w];
    if (src && src.w){ c.words = src.w; n++; }
  }
  if (n){
    BUILTIN_WORDS = null;
    WORD_BANK = null;
    saveSnap();
  }
  return n;
}
var WORD_BANK = null;
function wordBank(rebuild){
  if (WORD_BANK && !rebuild) return WORD_BANK;
  var bw = builtinWords(rebuild), list = [], byW = {}, i, p, w;
  for (i = 0; i < bw.list.length; i++){
    p = bw.list[i];
    byW[p.w] = 1;
    list.push({ w: p.w, a: p.a, b: p.b });
  }
  for (i = 0; i < STATE.words.length; i++){
    p = STATE.words[i];
    if (!p || p.on === false || p.kind !== '词') continue;
    w = String(p.w || '').trim();
    if (!/^[\u4e00-\u9fff]{2}$/.test(w) || byW[w]) continue;
    byW[w] = 1;
    list.push({ w: w, a: w.charAt(0), b: w.charAt(1) });
  }
  WORD_BANK = { list: list, byW: byW };
  return WORD_BANK;
}
/* 没有图可画的字（画出来一定别扭），退一步用组词，目标字标红 */
function wordOf(c){
  if (!c || !c.words) return '';
  var parts = String(c.words).split(/[、，,；;\/|\s]+/), i, p;
  for (i = 0; i < parts.length; i++){
    p = parts[i];
    if (p && p.indexOf(c.w) >= 0) return p;
  }
  return '';
}
function wordCardHTML(c){
  var w = wordOf(c);
  if (!w) return '';
  var i = w.indexOf(c.w);
  return '<div class="word-card">' + esc(w.slice(0, i)) +
    '<i>' + esc(c.w) + '</i>' + esc(w.slice(i + 1)) + CLOSE('div');
}
/* 字卡里的组词：小一号、次要位置，不能和主体汉字抢视觉 */
function wordSmallHTML(c){
  var w = wordOf(c);
  if (!w) return '';
  var i = w.indexOf(c.w);
  return '<span class="lb">组词</span>' + esc(w.slice(0, i)) +
    '<i>' + esc(c.w) + '</i>' + esc(w.slice(i + 1));
}
/* 这道字卡能不能出「图字配对」：有图，或者有含本字的组词 */
function canPair(c){
  if (!c) return false;
  if (c.img || ART_PACK[c.w] || BUILTIN_ART[c.w]) return true;
  return !!wordOf(c);
}
function avatarHTML(stu, cls){
  var inner, src = (stu && (stu.photo || stu.photoLocal)) || '';
  if (src) inner = '<img src="' + esc(src) + '" alt="" width="92" height="92" loading="lazy">';
  else inner = esc(((stu && stu.name) || '?').slice(0, 1));
  return '<span class="' + cls + '">' + inner + '</span>';
}

/* ------------------------- 加载（本地优先） ------------------------- */
function mergeCloudStudents(cloud, local){
  /* 云端为准；本机还没上传的记录（local_ 开头）保留，同名的以云端覆盖，避免重复。
     唯一的例外是字表 chars：云端 schema 没有这一列（只有「字组」多选），
     所以云端覆盖同名学生时必须把本机字表带过来，否则每次刷新都会被打回「按整组展开」。 */
  var names = {}, byName = {}, out = [], i, s, mine;
  for (i = 0; i < local.length; i++){
    s = local[i];
    if (s && s.name) byName[s.name] = s;
  }
  for (i = 0; i < cloud.length; i++){
    s = cloud[i];
    mine = byName[s.name];
    if (mine && isArr(mine.chars)) s.chars = mine.chars;
    /* off（老师手动移出在学的字）云端同样没有这一列，一样要带过来，
       否则刷新一次就忘了「这个字别再补」，刚移出的字又自己回来。 */
    if (mine && isArr(mine.off)) s.off = mine.off;
    names[s.name] = true;
    out.push(s);
  }
  for (i = 0; i < local.length; i++){
    s = local[i];
    if (!isLocalId(s.id)) continue;
    if (names[s.name]) continue;
    out.push(s);
  }
  return out;
}
function loadAllData(){
  var had = loadSnap();
  var keepStudents = STATE.students;
  if (!had){ seedLocalChars(); charsetVerSet(CHARSET_VER); }
  /* 本机存档若是旧版内置字表（97 字示例），换成新导入的生活语文生字表 */
  else migrateCharset();

  if (!dbApi()){
    STATE.online = false;
    setSync('本机存档', 'off');
    return Promise.resolve(false);
  }
  setSync('同步中', '');
  return withTimeout(Promise.all([
    pageAll(qStudents),
    pageAll(qWords),
    pageAll(qLogs),
    schemaStudents(),
    schemaWords(),
    schemaLogs()
  ]), 8000, '连接数据表超时').then(function(res){
    var cloudStu = res[0].map(mapStudent);
    STATE.students = mergeCloudStudents(cloudStu, keepStudents);
    var allWords = res[1].map(mapWord);
    STATE.chars = [];
    STATE.words = [];
    var i;
    for (i = 0; i < allWords.length; i++){
      if (allWords[i].kind === '词') STATE.words.push(allWords[i]);
      else STATE.chars.push(allWords[i]);
    }
    seedLocalChars();
    repairCharWords();          /* 云端整表覆写可能不带「组词」列，按内置字表补回 */
    STATE.logs = {};
    var logs = res[2].map(mapLog);
    for (i = 0; i < logs.length; i++){ STATE.logs[logs[i].key] = logs[i]; }
    STATE.schemaStu = res[3];
    STATE.schemaLib = res[4];
    STATE.schemaLog = res[5];
    STATE.online = true;
    STATE.cloudOk = true;
    STATE.cloudTried = true;
    STATE.loadErr = '';
    migrateStuChars();          /* 字库已就绪，这时才能按组展开老学生的字表 */
    saveSnap();
    setSync('已同步', '');
    return true;
  }).catch(function(err){
    STATE.online = false;
    STATE.cloudOk = false;
    STATE.cloudTried = true;
    STATE.loadErr = friendlyErr(err);
    setSync('本机存档', 'off');
    /* 关键：本地数据一律不丢，云端失败只影响同步，不影响教学 */
    if (!STATE.students.length && !STATE.chars.length) seedLocalChars();
    saveSnap();
    try { console.error('[数据] 云端未连上，改用本机存档：', err); } catch (e) {}
    return false;
  });
}

/* ------------------------- 落库 ------------------------- */
var WRITE_BUSY = 0;
function flushLogs(done){
  var keys = [], k, i;
  for (k in STATE.logs){
    if (Object.prototype.hasOwnProperty.call(STATE.logs, k) && STATE.logs[k].dirty) keys.push(k);
  }
  saveSnap();                                   /* 先落本机：断网、没登录都不丢 */
  if (!keys.length){ if (done) done(); return; }
  if (!dbApi() || STATE.cloudOk === false){
    for (i = 0; i < keys.length; i++) STATE.logs[keys[i]].dirty = false;
    setSync('本机存档', 'off');
    if (done) done();
    return;
  }
  i = 0;
  function step(){
    if (i >= keys.length){ if (done) done(); return; }
    var r = STATE.logs[keys[i]];
    i++;
    var props = {};
    props['学生'] = { text: r.stu };
    props['汉字'] = { text: r.ch };
    props['练习次数'] = { number: r.n };
    props['独立答对'] = { number: r.alone };
    props['提示后答对'] = { number: r.hinted };
    props['答错'] = { number: r.wrong };
    props['提示次数'] = { number: r.prompts };
    props['最近练习'] = { date: r.last || nowISO() };
    var lid = optId(STATE.schemaLog, '掌握程度', r.level || levelOf(r));
    if (lid) props['掌握程度'] = { select: lid };
    WRITE_BUSY++;
    writeLog(props, r.id).then(function(res){
      if (!r.id && res && res.ok && res.res && res.res.id) r.id = res.res.id;
      r.dirty = false;
      WRITE_BUSY--;
      saveSnap();
      setSync(res && res.ok ? '已同步' : '本机存档', res && res.ok ? '' : 'off');
      step();
    }).catch(function(err){
      WRITE_BUSY--;
      setSync('有未同步', 'err');
      try { console.error('[数据] 学习记录写入失败：', err); } catch (e) {}
      step();
    });
  }
  setSync('同步中', '');
  step();
}
