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
var APP_VER = 'v24';

var TYPE_ORDER = ['听音找字', '找一样的字', '认读跟读', '图字配对', '看拼音写字', '拼词语'];
var TYPE_DESC = {
  '听音找字': '点喇叭听读音，再点出对应的字',
  '找一样的字': '看上面这个字，在下面找出一样的',
  '认读跟读': '让孩子看着字读出声，老师判断',
  '图字配对': '把图拖到对的字上，也可以直接点字',
  '看拼音写字': '看拼音，点出对应的字',
  '拼词语': '把下面的字两两拼起来，拼成词语'
};

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
  var out = [], seen = {}, locks = lockList(stu), before = actList(stu).join('');
  var act = actList(stu), first = (act.length === 0), dropped = 0;
  for (i = 0; i < pool.length; i++) map[pool[i].w] = 1;
  /* ① 留下的：还在字表里、还没掌握（或者老师锁了不许动） */
  for (i = 0; i < act.length && out.length < cap; i++){
    w = act[i];
    if (!w || !map[w] || seen[w]) continue;
    r = STATE.logs[logKey(stu.name, w)];
    if (r && r.n && levelOf(r) === '已掌握' && locks.indexOf(w) < 0){ dropped++; continue; }
    seen[w] = 1;
    out.push(w);
  }
  /* ② 补位额度：第一次建名单补满；之后**只补「因为学会而让出来的」名额**。
     老师手动「先移出在学」留出的空位不补 —— 一补就等于这个按钮没做。 */
  var quota = first ? cap : dropped;
  if (quota > 0){
    var order = stuProfile(stu).focus;
    for (j = 0; j < order.length && out.length < cap && quota > 0; j++){
      w = order[j];
      if (seen[w] || !map[w]) continue;
      seen[w] = 1;
      out.push(w);
      quota--;
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
  saveSnap();
  return true;
}
function actDel(stu, w){
  if (!stu || !w) return false;
  var act = actList(stu), at = act.indexOf(w);
  if (at < 0) return false;
  act.splice(at, 1);
  stu.active = act;
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
