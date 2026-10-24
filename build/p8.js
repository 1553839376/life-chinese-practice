/* =====================================================================
   语音与音效层 v2
   1) 读题朗读：改用「预生成录音 + 内联播放」
      - 语音素材由中文神经语音预先生成，压缩成 24kbps 单声道后内联进页面
      - 运行时零网络请求，**也不依赖设备是否装了中文语音**
      - 句子 = 单字录音 + 固定句录音拼起来，可任意组合
      - 全部缺失时才回退系统 speechSynthesis，再不行提示老师来读
   2) 对错音效：换成开源音效包（uisfx, MIT 代码 / CC0 音频）
      - organic 包：木、水、呼吸、小石头的质感，适合儿童与安静场景
      - rubber 包：弹性质感的完成音，用在通关
      - 解码失败时回退到 Web Audio 现场合成，不会静音
   两项可分别开关，设置存本机。
   ===================================================================== */

var LS_AV = 'wb2_av_v1';
var AV = { voice: true, sfx: true, rate: 1.0 };

/* 基础录音本身已经是慢速（生成时 -30%），这里的倍率只做微调。
   调太慢会让 playbackRate 降调，声音发闷，所以下限只到 0.9。 */
var AV_RATES = [
  { v: 0.85, label: '慢' },
  { v: 1.0, label: '正常' },
  { v: 1.12, label: '快' }
];

/* 朗读节奏：特需学生需要时间看清屏幕、听完反应过来，不能一连串往下读。
   ready     —— 界面出现到开口的等待
   afterAsk  —— 读完指令到念目标字之间的停顿
   afterChar —— 读完字到念组词之间的停顿
   afterOk   —— 对错音效响完到念反馈语之间的停顿 */
var PACE = {
  ready: 0.55,
  afterAsk: 0.55,
  afterChar: 0.7,
  afterOk: 0.3
};

function avLoad(){
  var raw = null, o = null, i, snap = AV_RATES[1].v;
  try { raw = localStorage.getItem(LS_AV); } catch (e) { raw = null; }
  if (!raw) return;
  try { o = JSON.parse(raw); } catch (e) { return; }
  if (!o || typeof o !== 'object') return;
  if (typeof o.voice === 'boolean') AV.voice = o.voice;
  if (typeof o.sfx === 'boolean') AV.sfx = o.sfx;
  if (typeof o.rate === 'number' && o.rate > 0.4 && o.rate < 2){
    AV.rate = o.rate;
    /* 老版本存过系统语音语速（0.52/0.68/0.88）和旧倍率（0.84），统一吸附到当前档位 */
    for (i = 0; i < AV_RATES.length; i++){
      if (Math.abs(AV_RATES[i].v - o.rate) < 0.08){ snap = AV_RATES[i].v; break; }
    }
    AV.rate = snap;
  }
}
function avSave(){
  try {
    localStorage.setItem(LS_AV, JSON.stringify({ voice: AV.voice, sfx: AV.sfx, rate: AV.rate }));
  } catch (e) {}
}

/* ------------------------- 音频上下文 ------------------------- */
var VA_CTX = null, VA_VOICE_GAIN = null, VA_SFX_GAIN = null;

function vaCtx(){
  if (VA_CTX) return VA_CTX;
  var C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  try {
    VA_CTX = new C();
    VA_VOICE_GAIN = VA_CTX.createGain();
    VA_VOICE_GAIN.gain.value = 1;
    VA_VOICE_GAIN.connect(VA_CTX.destination);
    VA_SFX_GAIN = VA_CTX.createGain();
    /* 音效原本只有语音的十分之一左右，学生在教室里根本听不见。
       拉满这一级，靠每个音的 vol 参数控制力度，别在这里压。 */
    VA_SFX_GAIN.gain.value = 1;
    VA_SFX_GAIN.connect(VA_CTX.destination);
  } catch (e) { VA_CTX = null; }
  return VA_CTX;
}
/* 浏览器要求先有用户手势才能出声，第一次点屏幕时唤醒 */
function avUnlock(){
  var c = vaCtx();
  if (c && c.state === 'suspended'){
    try { c.resume(); } catch (e) {}
  }
}

/* ------------------------- 录音解码与缓存 ------------------------- */
var VA_BUF = {};      /* key -> AudioBuffer */
var VA_WAIT = {};     /* key -> 等待回调队列 */
var VA_ORDER = [];    /* 解码顺序，用于上限淘汰 */
var VA_LIVE = [];     /* 正在播放的 source */
var VA_GEN = 0;       /* 播放代次，切题时作废旧的时间轴 */
var VA_MAX_BUF = 260;

/* 语音包放在 <script type="application/json" id="voicePack"> 里：
   4 MB 数据不参与脚本编译，首屏不用等它；第一次要用（或页面空闲）时再 JSON.parse。 */
var VOICE_PACK = null;
function voicePackLoad(){
  if (VOICE_PACK) return VOICE_PACK;
  var el = document.getElementById('voicePack');
  if (!el) return null;
  try { VOICE_PACK = JSON.parse(el.textContent); }
  catch (e) { VOICE_PACK = {}; }
  return VOICE_PACK;
}
function voicePackWarm(){
  var run = function(){ try { voicePackLoad(); } catch (e) {} };
  if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 1800 });
  else setTimeout(run, 120);
}
function vaB64(key){
  var v = null;
  if (!VOICE_PACK) voicePackLoad();
  if (VOICE_PACK) v = VOICE_PACK[key];
  if (!v && typeof SFX_PACK !== 'undefined' && SFX_PACK) v = SFX_PACK[key];
  return v || '';
}
function vaBin(b64){
  var bin = window.atob(b64), n = bin.length, u = new Uint8Array(n), i;
  for (i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
}
function vaDecode(key, cb){
  if (VA_BUF[key]){ cb(VA_BUF[key]); return; }
  if (VA_WAIT[key]){ VA_WAIT[key].push(cb); return; }
  var ctx = vaCtx(), raw = vaB64(key);
  if (!ctx || !raw){ cb(null); return; }
  var q = VA_WAIT[key] = [cb];
  function done(buf){
    var list = VA_WAIT[key] || [], i;
    delete VA_WAIT[key];
    if (buf){
      VA_BUF[key] = buf;
      VA_ORDER.push(key);
      if (VA_ORDER.length > VA_MAX_BUF){
        var drop = VA_ORDER.splice(0, 60);
        for (i = 0; i < drop.length; i++) delete VA_BUF[drop[i]];
      }
    }
    for (i = 0; i < list.length; i++){ try { list[i](buf); } catch (e) {} }
  }
  try {
    ctx.decodeAudioData(vaBin(raw), done, function(){ done(null); });
  } catch (e) { done(null); }
}
/* 预解码，用来消除第一次点击的等待 */
function vaWarm(keys){
  var i;
  if (!keys) return;
  for (i = 0; i < keys.length; i++){ if (keys[i]) vaDecode(keys[i], function(){}); }
}

/* ------------------------- 播放 ------------------------- */
/* parts: [{k: 键, gap: 之后的停顿秒}] 或 {gap: 只停顿} */
function vaPlay(parts, onEmpty){
  if (!parts || !parts.length){ if (onEmpty) onEmpty(); return false; }
  var ctx = vaCtx();
  if (!ctx){ if (onEmpty) onEmpty(); return false; }

  vaStop();
  var gen = VA_GEN;
  var n = parts.length, got = [], left = n, i;

  for (i = 0; i < n; i++){ got.push(null); }

  function go(){
    if (gen !== VA_GEN) return;
    var any = false, k;
    for (k = 0; k < n; k++){ if (got[k]) { any = true; break; } }
    if (!any){ if (onEmpty) onEmpty(); return; }
    if (ctx.state === 'suspended'){ try { ctx.resume(); } catch (e) {} }
    var t = ctx.currentTime + 0.05, rate = AV.rate, b, src;
    for (k = 0; k < n; k++){
      b = got[k];
      if (b){
        src = ctx.createBufferSource();
        src.buffer = b.buf;
        src.playbackRate.value = rate;
        src.connect(VA_VOICE_GAIN);
        try { src.start(t); } catch (e) {}
        VA_LIVE.push(src);
        t += b.buf.duration / rate;
      }
      t += (parts[k] && parts[k].gap) || 0;
    }
  }

  for (i = 0; i < n; i++){
    (function(idx){
      var p = parts[idx];
      if (!p || !p.k){ if (--left === 0) go(); return; }
      vaDecode(p.k, function(buf){
        got[idx] = buf ? { buf: buf } : null;
        if (--left === 0) go();
      });
    })(i);
  }
  return true;
}

function vaStop(){
  VA_GEN++;
  var i, s;
  for (i = 0; i < VA_LIVE.length; i++){
    s = VA_LIVE[i];
    try { s.stop(0); } catch (e) {}
    try { s.disconnect(); } catch (e) {}
  }
  VA_LIVE = [];
  try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
}

/* ------------------------- 文本 → 片段 -------------------------
   整句命中就直接用整句录音（停顿最自然）；
   否则按句号感叹号问号切块，块命中用块录音，剩下的逐字拼。 */

var SENT_FULL = {
  '找出这个字。': 'q_find',
  '找出一样的字。': 'q_same',
  '看拼音。找出这个字。': 'q_pinyin',
  '看看图。这是什么。找出它的名字。': 'q_pic',
  '看看红色的那个字。找出它。': 'q_picw',
  '找出下面的词语。': 'q_word',
  '把这个字戳掉。': 'g_bubble',
  '把这个字钓上来。': 'g_fish',
  '把这个字摘下来。': 'g_fruit',
  '小动物要吃这个字，喂给它。': 'g_feed',
  '太棒了！': 'fb_win',
  '做得不错，继续加油': 'fb_mid',
  '再来一次会更好': 'fb_low',
  '再试一试。': 'fb_again',
  '答对了！': 'fb_right',
  '朗读打开了': 'av_on',
  '朗读关掉了': 'av_off'
};
/* 句子里的标点去掉后再对一次，避免标点写法不一致对不上 */
var SENT_BARE = (function(){
  var o = {}, k;
  for (k in SENT_FULL){
    if (!Object.prototype.hasOwnProperty.call(SENT_FULL, k)) continue;
    o[k.replace(/[。！？，,]/g, '')] = SENT_FULL[k];
  }
  return o;
})();

function isHan(ch){
  var c = ch.charCodeAt(0);
  return c >= 0x4e00 && c <= 0x9fff;
}
function charKey(ch){
  var h = ch.charCodeAt(0).toString(16);
  while (h.length < 4) h = '0' + h;
  return 'u' + h;
}
/* 整词的录音键：每个字 4 位十六进制拼起来。词语整词合成，不再逐字拼，
   否则「小手」会读成「小——手」，一字一顿。 */
function wordKey(txt){
  var out = 'w', i, h;
  for (i = 0; i < txt.length; i++){
    h = txt.charCodeAt(i).toString(16);
    while (h.length < 4) h = '0' + h;
    out += h;
  }
  return out;
}

/* 一段不含句末标点的文字 → 片段 */
function textParts(txt, charGap, dotGap){
  var out = [], i = 0, ch, k, n, sub;
  while (i < txt.length){
    ch = txt.charAt(i);
    if (isHan(ch)){
      /* 优先整词录音：从长到短试，命中就用，听起来才连得自然 */
      k = '';
      for (n = 3; n >= 2; n--){
        if (i + n > txt.length) continue;   /* 剩余长度不够就试短一点的，不能直接放弃 */
        sub = txt.substr(i, n);
        if (!isHan(sub.charAt(n - 1))) continue;
        if (vaB64(wordKey(sub))){ k = wordKey(sub); break; }
      }
      if (!k) k = charKey(ch);
      out.push({ k: k, gap: charGap });
      i += (k.charAt(0) === 'w') ? (k.length - 1) / 4 : 1;
    } else if (ch === '，' || ch === ',') {
      out.push({ gap: dotGap * 0.6 });
      i++;
    } else if (ch === '。' || ch === '！' || ch === '？' || ch === '!' || ch === '?') {
      out.push({ gap: dotGap });
      i++;
    } else {
      i++;
    }
  }
  return out;
}

/* 句子之间的停顿（秒）。念完一句就停一下，等孩子反应过来 */
var PACE_GAP = 0.45;

function sayParts(text){
  var t = String(text || '').trim();
  if (!t) return null;
  var whole = SENT_FULL[t] || SENT_BARE[t.replace(/[。！？，,]/g, '')];
  if (whole && vaB64(whole)) return [{ k: whole, gap: 0 }];

  /* 按句末标点切成若干块；块之间必须补停顿，否则会连成一串念完 */
  var chunks = t.split(/[。！？!?]/), out = [], i, c, bare, k, seg;
  for (i = 0; i < chunks.length; i++){
    c = chunks[i];
    if (!c) continue;
    bare = c.replace(/[，,]/g, '');
    k = SENT_BARE[bare] || SENT_FULL[c + '。'];
    seg = (k && vaB64(k)) ? [{ k: k, gap: 0 }] : textParts(c, 0.05, 0.28);
    if (!seg.length) continue;
    if (out.length) out[out.length - 1].gap = PACE_GAP;
    out = out.concat(seg);
  }
  return out.length ? out : null;
}

/* 分段朗读：list = [{t: 文本, gap: 这句念完停多久}]
   用来明确控制「先读字 → 停 1 秒 → 再读组词」这种节奏。 */
function saySeq(list){
  if (!AV.voice || !list || !list.length) return false;
  var parts = [], fallback = '', i, j, seg;
  for (i = 0; i < list.length; i++){
    if (!list[i] || !list[i].t) continue;
    fallback += String(list[i].t) + '。';
    seg = sayParts(list[i].t);
    if (!seg || !seg.length) continue;
    for (j = 0; j < seg.length; j++){
      parts.push({
        k: seg[j].k,
        gap: (j === seg.length - 1) ? (list[i].gap || 0) : seg[j].gap
      });
    }
  }
  if (!parts.length) return saySystem(fallback);
  var ctx = vaCtx();
  if (!ctx) return saySystem(fallback);
  var fell = false;
  vaPlay(parts, function(){ fell = true; saySystem(fallback); });
  return !fell;
}

/* ------------------------- 对外接口 ------------------------- */
/* 返回 true 表示已交给播放器（可能是异步解码后才出声） */
function say(text){
  if (!AV.voice) return false;
  var parts = sayParts(text);
  var ctx = vaCtx();
  if (!parts || !ctx){
    return saySystem(text);
  }
  var fell = false;
  vaPlay(parts, function(){
    fell = true;
    saySystem(text);
  });
  return !fell;
}
function sayStop(){ vaStop(); }

/* 兜底：系统语音。录制语音齐全时走不到这里 */
var SPK = { ready: false, zh: null, list: [], why: '' };
function spkAvailable(){
  return !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
}
function spkPick(){
  if (!spkAvailable()){ SPK.why = '这台设备不支持朗读'; return; }
  var list = [], i, v, lg, best = null;
  try { list = window.speechSynthesis.getVoices() || []; } catch (e) { list = []; }
  for (i = 0; i < list.length; i++){
    v = list[i];
    lg = (v.lang || '').toLowerCase();
    if (lg.indexOf('zh') !== 0 && lg.indexOf('cmn') !== 0) continue;
    if (!best) best = v;
    if (lg.indexOf('zh-cn') === 0 || lg.indexOf('zh_cn') === 0){ best = v; break; }
  }
  SPK.zh = best;
  SPK.list = list;
  SPK.ready = true;
  if (!best && list.length) SPK.why = '这台设备没装中文语音';
  else if (!best && !list.length) SPK.why = '这台设备还没准备好语音';
  else SPK.why = '';
}
function spkInit(){
  if (!spkAvailable()){ SPK.why = '这台设备不支持朗读'; return; }
  spkPick();
  try {
    window.speechSynthesis.addEventListener('voiceschanged', spkPick);
  } catch (e) {
    try { window.speechSynthesis.onvoiceschanged = spkPick; } catch (e2) {}
  }
  setTimeout(spkPick, 400);
  setTimeout(spkPick, 1500);
}
function saySystem(text){
  if (!AV.voice || !text) return false;
  if (!spkAvailable()) return false;
  try {
    window.speechSynthesis.cancel();
    var u = new window.SpeechSynthesisUtterance(String(text));
    u.lang = 'zh-CN';
    if (SPK.zh) u.voice = SPK.zh;
    u.rate = AV.rate < 0.95 ? 0.55 : (AV.rate > 1.05 ? 0.82 : 0.68);
    u.pitch = 1.02;
    window.speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}

/* 页面某个位置显示「读不出来，请老师读」的兜底提示 */
function readHint(el, ok, fallbackText){
  if (!el) return;
  if (!AV.voice){ el.textContent = ''; el.hidden = true; return; }
  if (ok){ el.textContent = ''; el.hidden = true; return; }
  if (!spkAvailable()){
    el.textContent = '这段还没有录音，请老师读：' + (fallbackText || '');
    el.hidden = false;
    return;
  }
  /* 系统语音能出声，但设备没中文语音时会读成英文腔，提醒一下 */
  if (SPK.zh || !SPK.list.length){ el.textContent = ''; el.hidden = true; return; }
  el.textContent = '这台设备没装中文语音，请老师读：' + (fallbackText || '');
  el.hidden = false;
}

/* ------------------------- 音效 ------------------------- */
function sfxPlay(name){
  if (!AV.sfx) return;
  var ctx = vaCtx();
  if (!ctx) return;
  vaDecode(name, function(buf){
    if (!AV.sfx) return;
    if (!buf){ sfxSynth(name); return; }
    var src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(VA_SFX_GAIN);
    src.onended = function(){
      var i = VA_LIVE.indexOf(src);
      if (i >= 0) VA_LIVE.splice(i, 1);
    };
    try { src.start(ctx.currentTime + 0.01); } catch (e) {}
    VA_LIVE.push(src);
  });
}
/* 音效文件解码不出来时的兜底合成（短促、不刺耳） */
function sfxSynth(name){
  if (!AV.sfx) return;
  var ctx = vaCtx();
  if (!ctx) return;
  function tone(freq, at, dur, vol){
    try {
      var o = ctx.createOscillator(), g = ctx.createGain();
      var t = ctx.currentTime + at;
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(VA_SFX_GAIN);
      o.start(t); o.stop(t + dur + 0.04);
    } catch (e) {}
  }
  if (name === 'ok'){ tone(700, 0, 0.1, 0.18); tone(940, 0.09, 0.14, 0.16); }
  else if (name === 'no'){ tone(320, 0, 0.13, 0.15); tone(240, 0.13, 0.18, 0.13); }
  else if (name === 'tap'){ tone(880, 0, 0.04, 0.10); }
  else if (name === 'pop'){ tone(760, 0, 0.05, 0.12); tone(1040, 0.05, 0.05, 0.09); }
  else if (name === 'win' || name === 'streak'){
    tone(523, 0, 0.12, 0.16); tone(659, 0.12, 0.12, 0.16);
    tone(784, 0.24, 0.12, 0.16); tone(1046, 0.37, 0.28, 0.16);
  }
}

/* 合成一个短音。type 用 triangle 亮、sine 柔；bendTo 给出滑音终点。
   现场合成的好处：点下去就响，不用等 base64 解码，也不受采样音色拖累。 */
function synthTone(ctx, freq, at, dur, vol, type, bendTo){
  try {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'triangle';
    o.frequency.setValueAtTime(freq, at);
    if (bendTo) o.frequency.exponentialRampToValueAtTime(bendTo, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + Math.min(0.014, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(VA_SFX_GAIN);
    o.start(at); o.stop(at + dur + 0.03);
    return o;
  } catch (e) { return null; }
}

/* 粗糙音：两只方波差 beatHz 同时响，会互相打拍子，耳朵听到的是「嗡嗡」的颗粒感。
   方波泛音一直排到高频，手机、平板那种小喇叭也能放得出来；
   纯 sine/triangle 的低音（v22 那记 98Hz）在小喇叭上基本没有声压，等于白加。
   vol 是主音增益，伴音固定取 0.38 倍，两路各自过自己的 gain，峰值可控不糊。 */
function synthBuzz(ctx, freq, at, dur, vol, beatHz, bendTo){
  try {
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    var g1 = ctx.createGain(), g2 = ctx.createGain();
    var ramp = Math.min(0.012, dur * 0.3);
    o1.type = 'square'; o2.type = 'square';
    o1.frequency.setValueAtTime(freq, at);
    o2.frequency.setValueAtTime(freq + (beatHz || 10), at);
    if (bendTo){
      o1.frequency.exponentialRampToValueAtTime(bendTo, at + dur);
      o2.frequency.exponentialRampToValueAtTime(bendTo + (beatHz || 10) * 0.6, at + dur);
    }
    g1.gain.setValueAtTime(0.0001, at);
    g1.gain.exponentialRampToValueAtTime(vol, at + ramp);
    g1.gain.setValueAtTime(vol, at + dur * 0.72);
    g1.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    g2.gain.setValueAtTime(0.0001, at);
    g2.gain.exponentialRampToValueAtTime(vol * 0.38, at + ramp);
    g2.gain.setValueAtTime(vol * 0.38, at + dur * 0.72);
    g2.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o1.connect(g1); g1.connect(VA_SFX_GAIN);
    o2.connect(g2); g2.connect(VA_SFX_GAIN);
    o1.start(at); o1.stop(at + dur + 0.03);
    o2.start(at); o2.stop(at + dur + 0.03);
    return g1;
  } catch (e) { return null; }
}

/* 对了：明亮的「叮—咚」，E5-G#5-B5 大三和弦快速上行，最后一颗 E6 收尾。
   原来的采样音偏低偏闷、尾音还拖，孩子听着像"没答对"。
   现在现场合成：点下去 10ms 内出声，音高明确往上走，一听就知道是"对了"。 */
function sfxOk(){
  if (!AV.sfx) return;
  var ctx = vaCtx();
  if (!ctx) return;
  var t = ctx.currentTime + 0.005;
  synthTone(ctx, 659.25, t, 0.20, 0.26, 'triangle');
  synthTone(ctx, 830.61, t + 0.055, 0.20, 0.24, 'triangle');
  synthTone(ctx, 987.77, t + 0.11, 0.24, 0.21, 'triangle');
  synthTone(ctx, 1318.51, t + 0.17, 0.32, 0.18, 'sine');
}
/* 错了：两级下滑的「嗡嗡」，最后收一口闷响。
   为什么换掉 v22（A♭4→F4、C♯4→B♭3 + 98Hz「咚」）——老师两次反馈「还是不明显」，
   查下来是两个真原因，不是音量不够大：
   ① 98Hz 在小喇叭上没有声压。平板/笔记本外放 200Hz 以下掉得厉害，那一记「咚」
      在教室里几乎等于没响，白占了 0.26 的增益预算；
   ② triangle 太圆润。下行 + 柔和音色听起来是「叹气」，和正确音的「明亮上行」
      只是旋律方向相反，闭着眼仍然可能混。
   现在：方波（泛音多、穿透力强）+ 双路打拍（嗡嗡的粗糙感）+ 两次往下滑（走向明确向下），
   音区从 233Hz 落到 130Hz，全部落在小喇叭放得出的范围里，收尾再补 147Hz 的短闷响。
   总长约 0.62s，比 v22（0.56s）略长，给孩子留出「这题不对」的反应时间。 */
function sfxNo(){
  if (!AV.sfx) return;
  var ctx = vaCtx();
  if (!ctx) return;
  var t = ctx.currentTime + 0.005;
  synthBuzz(ctx, 233.08, t, 0.26, 0.32, 12, 174.61);
  synthBuzz(ctx, 174.61, t + 0.24, 0.26, 0.30, 10, 130.81);
  synthTone(ctx, 146.83, t + 0.46, 0.16, 0.30, 'triangle', 110.00);
}
/* 连对：音高随连击往上抬，越玩越顺，比每关都一样的老虎机音更有节奏 */
function sfxStreak(level){
  if (!AV.sfx) return;
  var ctx = vaCtx();
  if (!ctx) return;
  var step = Math.min(Math.max(level, 3), 9) - 3;
  var f = 1046.50 * Math.pow(2, step / 12);
  var t = ctx.currentTime + 0.005;
  synthTone(ctx, f, t, 0.09, 0.18, 'triangle');
  synthTone(ctx, f * 1.5, t + 0.07, 0.13, 0.16, 'triangle');
}
/* 轻点 */
function sfxTap(){ sfxPlay('tap'); }
/* 气泡破 / 提示 */
function sfxPop(){ sfxPlay('pop'); }
/* 通关：完成音 + 一串小奖励音，错开播有层次 */
function sfxWin(){
  sfxPlay('win');
  setTimeout(function(){ sfxPlay('streak'); }, 150);
}

/* ------------------------- 设置面板 ------------------------- */
function avRateIndex(){
  var i;
  for (i = 0; i < AV_RATES.length; i++){
    if (Math.abs(AV_RATES[i].v - AV.rate) < 0.06) return i;
  }
  return 1;
}
function avPaint(){
  var v = $('avVoice'), s = $('avSfx'), seg = $('avRate'), i, b;
  if (!v) return;
  v.setAttribute('aria-checked', AV.voice ? 'true' : 'false');
  v.className = 'av-sw' + (AV.voice ? ' on' : '');
  v.textContent = AV.voice ? '开' : '关';
  s.setAttribute('aria-checked', AV.sfx ? 'true' : 'false');
  s.className = 'av-sw' + (AV.sfx ? ' on' : '');
  s.textContent = AV.sfx ? '开' : '关';
  if (seg){
    for (i = 0; i < seg.children.length; i++){
      b = seg.children[i];
      if (i === avRateIndex()) b.classList.add('on'); else b.classList.remove('on');
    }
  }
  var tip = $('avTip');
  if (tip){
    var hasPack = !!document.getElementById('voicePack') ||
      (VOICE_PACK && Object.keys(VOICE_PACK).length > 100);
    if (hasPack){
      tip.textContent = '朗读用的是内置录音，已经放慢过，句子之间也留了停顿。点「试听」听听看。';
    } else if (!spkAvailable()){
      tip.textContent = '这台设备不支持朗读，读题时会提示老师来读。';
    } else if (SPK.why){
      tip.textContent = SPK.why + '，可以在系统设置里装一个中文语音。';
    } else {
      tip.textContent = '点「读题」可以再听一遍；读不出来时会提示老师来读。';
    }
  }
  var nav = $('btnAV');
  if (nav){
    if (AV.voice || AV.sfx) nav.classList.remove('off');
    else nav.classList.add('off');
  }
}
function openAV(){
  var m = $('avMask');
  if (!m) return;
  avPaint();
  m.hidden = false;
  sfxTap();
}
function closeAV(){
  var m = $('avMask');
  if (m) m.hidden = true;
}
function avTry(){
  var model = (typeof CARD_CH !== 'undefined' && CARD_CH && CARD_CH.w) ? CARD_CH.w : '手';
  /* 试听也按真实节奏走：先指令、停一下、再念字，听到的就是孩子听到的 */
  var ok = saySeq([{ t: '找出这个字。', gap: PACE.afterAsk }, { t: model }]);
  if (!ok) readHint($('avTip'), false, '找出这个字。' + model);
  else if ($('avTip')) $('avTip').textContent = '正在试读，注意听句子中间的停顿和整体语速。';
}
function avWire(){
  var b = $('btnAV');
  if (b) b.addEventListener('click', openAV);
  var c = $('avClose');
  if (c) c.addEventListener('click', closeAV);
  var m = $('avMask');
  if (m) m.addEventListener('click', function(ev){ if (ev.target === m) closeAV(); });
  var v = $('avVoice');
  if (v) v.addEventListener('click', function(){
    AV.voice = !AV.voice;
    avSave(); avPaint();
    if (AV.voice) say('朗读打开了'); else sayStop();
  });
  var s = $('avSfx');
  if (s) s.addEventListener('click', function(){
    AV.sfx = !AV.sfx;
    avSave(); avPaint();
    if (AV.sfx) sfxOk();
  });
  var seg = $('avRate');
  if (seg){
    var i, btn;
    for (i = 0; i < seg.children.length; i++){
      btn = seg.children[i];
      btn.setAttribute('data-i', String(i));
      btn.addEventListener('click', function(ev){
        var k = parseInt(ev.currentTarget.getAttribute('data-i'), 10) || 0;
        AV.rate = AV_RATES[k].v;
        avSave(); avPaint(); avTry();
      });
    }
  }
  var t = $('avTry');
  if (t) t.addEventListener('click', avTry);
}

/* 第一次点屏幕时唤醒音频（浏览器要求用户手势后才能出声） */
try {
  document.addEventListener('pointerdown', avUnlock, { passive: true });
} catch (e) {
  try { document.addEventListener('pointerdown', avUnlock, false); } catch (e2) {}
}
/* 切走页面时停掉朗读，免得回来还在念 */
try {
  document.addEventListener('visibilitychange', function(){
    if (document.hidden) sayStop();
  });
} catch (e) {}
/* 音效文件小，启动就解码好，第一次点击不会有延迟 */
setTimeout(function(){ vaWarm(['ok', 'no', 'tap', 'pop', 'win', 'streak']); }, 260);
