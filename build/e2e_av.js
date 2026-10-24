/* 读题朗读 + 对错音效 · 专项测试 v3
   重点覆盖本次改动：
   1) 界面出现后要「等一拍」再开口，不能一渲染就念
   2) 指令和目标字之间、字和组词之间要有真实停顿
   3) 题目只念一遍指令 + 一遍字，不再连读两遍
*/
const fs = require('fs');
const { JSDOM } = require('jsdom');
const HTML = fs.readFileSync('生活语文练习台.html', 'utf8');
const wait = ms => new Promise(r => setTimeout(r, ms));
let bad = 0, total = 0;
function ok(cond, msg){ total++; console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) bad++; }

(async () => {
  const played = [];      /* 每次 vaPlay 的片段：[{k, gap}] */
  const systems = [];     /* 回退到系统语音的记录 */
  const peaks = [];       /* 合成音效的峰值增益，用来守「教室里听得见」 */
  const oscTypes = [];    /* 振荡器波形，用来守「错误音要用方波才够穿透」 */
  const freqs = [];       /* 振荡器频率，用来守「别再用小喇叭放不出的低频」 */
  let srcCount = 0;
  let rateSeen = [];

  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://example.com/p/e',
    beforeParse(window){
      window.scrollTo = function(){};

      window.SpeechSynthesisUtterance = function(t){ this.text = t; };
      window.speechSynthesis = {
        speak(u){ systems.push(String(u.text)); },
        cancel(){},
        getVoices(){ return []; },
        addEventListener(){}
      };

      /* Web Audio：decodeAudioData 立刻返回一个 0.5 秒的假音频 */
      window.AudioContext = function(){
        this.state = 'running';
        this.currentTime = 0;
        this.destination = {};
        this.resume = function(){};
        this.createGain = function(){
          return {
            gain: { value: 1, setValueAtTime(){},
              exponentialRampToValueAtTime(v){ if (v > 0.001) peaks.push(v); } },
            connect(){}, disconnect(){}
          };
        };
        this.createBufferSource = function(){
          return {
            buffer: null,
            playbackRate: { value: 1 },
            connect(){}, disconnect(){}, stop(){},
            start(){
              srcCount++;
              rateSeen.push(this.playbackRate.value);
            }
          };
        };
        /* 对错音效已改为现场合成（振荡器），这里也要统计，否则会把"响了"当成"没响" */
        this.createOscillator = function(){
          const osc = {
            type: 'sine',
            frequency: {
              value: 0,
              setValueAtTime(v){ freqs.push(v); },
              exponentialRampToValueAtTime(v){ freqs.push(v); }
            },
            connect(){}, disconnect(){}, stop(){},
            start(){ srcCount++; oscTypes.push(osc.type); }
          };
          return osc;
        };
        this.createBiquadFilter = function(){
          return {
            type: 'lowpass',
            frequency: { value: 0, setValueAtTime(){} },
            Q: { value: 0 },
            connect(){}, disconnect(){}
          };
        };
        this.decodeAudioData = function(buf, onOk){
          onOk({ duration: 0.5, sampleRate: 22050 });
        };
      };
    }
  });
  await wait(1400);
  const w = dom.window, d = w.document;

  const rawPlay = w.vaPlay;
  w.vaPlay = function(parts, onEmpty){
    played.push((parts || []).map(p => ({ k: p.k || '', gap: p.gap || 0 })));
    return rawPlay.call(w, parts, onEmpty);
  };
  const flush = () => { played.length = 0; };
  const flat = () => [].concat.apply([], played.map(seq => seq.map(p => p.k)));
  const keys = seq => seq.map(p => p.k).filter(Boolean);

  /* ---------- 1. 资源包 ---------- */
  ok(typeof w.VOICE_PACK === 'object' && Object.keys(w.VOICE_PACK).length > 600,
     '语音包已内联：' + Object.keys(w.VOICE_PACK).length + ' 条');
  ok(Object.keys(w.SFX_PACK).length === 6, '音效包 6 条：' + Object.keys(w.SFX_PACK).join('/'));
  ok(w.AV.voice === true && w.AV.sfx === true, '默认朗读、音效都开');
  ok(w.AV.rate === 1.0, '默认播放倍率 1.0（基础录音本身已放慢）');

  /* ---------- 2. 句子拼装与停顿 ---------- */
  const hand = w.charKey('手');
  ok(!!w.VOICE_PACK[hand], '「手」有录音');

  let parts = w.sayParts('找出这个字。');
  ok(parts.length === 1 && parts[0].k === 'q_find', '整句命中就用整句录音');

  parts = w.sayParts('找出这个字。手。');
  ok(parts.length === 2 && parts[0].k === 'q_find' && parts[1].k === hand,
     '「找出这个字。手。」拼成 指令 + 字，且只念一遍字');
  ok((parts[0].gap || 0) >= 0.45, '指令和目标字之间有停顿：' + parts[0].gap + 's');

  parts = w.sayParts('手。手。找出这个字。');
  ok((parts[0].gap || 0) >= 0.4,
     '句与句之间不再连读（字后面停了 ' + parts[0].gap + 's，旧版只有 0.06s）');

  parts = w.sayParts('看拼音。找出这个字。');
  ok(parts.length === 1 && parts[0].k === 'q_pinyin', '看拼音用整句、不读汉字（不泄题）');

  /* 词语必须整词合成：逐字拼会一字一顿，这是上一版「生硬」的根源 */
  const wdKey = w.wordKey('小手');
  ok(!!w.VOICE_PACK[wdKey], '整词「小手」有独立录音：' + wdKey);
  ok(Object.keys(w.VOICE_PACK).filter(k => k.charAt(0) === 'w').length > 900,
     '整词录音条数：' + Object.keys(w.VOICE_PACK).filter(k => k.charAt(0) === 'w').length);
  const p2 = w.sayParts('小手');
  ok(p2.length === 1 && p2[0].k === wdKey, '「小手」直接播整词，不再逐字拼');
  /* 没录过的词才回退逐字 */
  const p3 = w.sayParts('鵝鴨');
  ok(p3.length === 2 && p3[0].k.charAt(0) === 'u', '未录制的组合回退单字：' + p3.length + ' 段');

  /* ---------- 3. 学字卡：先停一下，字与词之间再停一下 ---------- */
  /* 挑一个有组词的字，才能验证「字 → 停 → 词」 */
  const pick = w.STATE.chars.find(c => c.on && c.words && c.words.length) || w.STATE.chars[0];
  flush();
  w.openCard(pick);
  await wait(300);
  ok(played.length === 0, '卡片刚弹出时不抢着念，先让孩子看一眼');
  await wait(750);
  ok(played.length > 0 && keys(played[0])[0] === w.charKey(pick.w), '停顿后才念「' + pick.w + '」');
  if (played.length){
    const seq = played[0];
    const ks = keys(seq);
    ok(ks.length > 1, '字后面接着念组词（' + ks.length + ' 段）');
    ok((seq[0].gap || 0) >= 0.6, '字念完停 ' + seq[0].gap + 's 再念组词（不再连读）');
  } else {
    ok(false, '字念完停一下再念组词');
  }
  ok(srcCount > 0, '确实走到了音频播放');
  ok(systems.length === 0, '有录音时不会回退到系统语音');
  ok(d.querySelector('#cardMask .word-card') === null, '字卡里不再出现 56px 的大词卡');
  ok(d.getElementById('sheetWord').textContent.indexOf('组词') >= 0, '组词以小字形式跟在拼音下面');

  /* 没有配图的字：左边壁纸收掉、字居中，不能变成一张词卡 */
  const noArt = w.STATE.chars.find(c => c.on && !w.artOf(c));
  if (noArt){
    w.openCard(noArt);
    await wait(60);
    ok(d.getElementById('sheetLeft').hidden === true, '无图字的字卡不显示左侧图位');
    ok(d.querySelector('.sheet').classList.contains('no-art'), '无图时切到居中样式');
    ok(d.getElementById('sheetWord').textContent.indexOf('组词') >= 0 ||
       !w.wordOf(noArt), '无图时组词仍是小字');
    w.closeCard();
    await wait(80);
  } else {
    ok(false, '字库里应存在无配图的字');
  }
  d.getElementById('sheetClose') ? d.getElementById('sheetClose').click() : w.closeCard();
  await wait(150);

  /* ---------- 4. 进练习台：先渲染，等一下再读题 ---------- */
  w.STATE.students = [{
    id: 's1', name: '小明', on: true,
    types: ['找一样的字'], count: 6,
    groups: ['一年级上册'], photoLocal: ''
  }];
  w.renderPick();
  flush();
  w.enterStudent('小明');
  await wait(300);
  ok(d.getElementById('scrPlay').hidden === false, '进入练习台');
  ok(!!d.querySelector('#stage .pre-wrap'), 'v18 进来先出今日字卡，不直接甩一道题');
  ok(played.length === 0, '预习阶段不自动开口（字卡由人点着读）');
  /* v18：点「开始练习」才进题，读题的停顿从这一刻算起 */
  d.getElementById('preGo').click();
  await wait(60);
  ok(played.length === 0, '进题不立刻开口，先给看题的时间');
  await wait(800);
  ok(played.length > 0, '停顿之后才读题：' + JSON.stringify(flat().slice(0, 3)));
  const q1 = w.curQ();
  const seq1 = keys(played[0] || []);
  ok(seq1.indexOf('q_same') >= 0, '读到了题干「找出一样的字」');
  ok(seq1.filter(k => k === w.charKey(q1.target.w)).length === 1,
     '目标字只念一遍（旧版每句连念两遍）');
  ok(seq1.indexOf('q_same') < seq1.indexOf(w.charKey(q1.target.w)),
     '先说要做什么，再念这个字');
  ok(d.getElementById('qRead') !== null, '题面上有「读题」按钮');

  /* ---------- 5. 点「读题」能再听一遍（手动点不等） ---------- */
  flush();
  d.getElementById('qRead').click();
  await wait(150);
  ok(played.length === 1, '点读题立刻再读一次');

  /* ---------- 6. 选错：音效 + 不判死 + 连错 2 次才念正确字（T-016） ---------- */
  const c0 = srcCount;
  flush();
  const wrong = [...d.querySelectorAll('#stage .opt')].find(el => el.getAttribute('data-c') !== q1.target.w);
  wrong.click();
  await wait(200);
  ok(srcCount > c0, '选错有音效（播了 ' + (srcCount - c0) + ' 段）');
  ok(d.querySelector('#stage .feedback.no') === null, '选错不判死：不出「答错了」反馈块');
  ok(!flat().includes('fb_right'), '选错不会说「答对了」');
  ok(wrong.classList.contains('miss'), '选错的那个变灰（.miss）');
  await wait(600);
  ok(flat().indexOf(w.charKey(q1.target.w)) < 0, '第一次选错不直接念答案（念了就没得试了）');
  /* 再错一个 → 这时才念正确字，目的从「测」变成「教会他」 */
  const wrong2 = [...d.querySelectorAll('#stage .opt')]
    .filter(el => el.getAttribute('data-c') !== q1.target.w && el !== wrong)[0];
  wrong2.click();
  await wait(900);
  const rightEl1 = [...d.querySelectorAll('#stage .opt')].find(el => el.getAttribute('data-c') === q1.target.w);
  ok(rightEl1.classList.contains('glow'), '连错 2 次把正确项亮出来');
  ok(flat().indexOf(w.charKey(q1.target.w)) >= 0, '连错 2 次才念正确的字');

  /* ---------- 7. 选对：音效先响，停一下再说「答对了」 ---------- */
  w.nextQuestion();
  await wait(1000);
  const q2 = w.curQ();
  const c1 = srcCount;
  flush();
  const right = [...d.querySelectorAll('#stage .opt')].find(el => el.getAttribute('data-c') === q2.target.w);
  right.click();
  await wait(180);
  ok(srcCount > c1, '选对有音效（播了 ' + (srcCount - c1) + ' 段）');
  ok(d.querySelector('#stage .feedback.ok') !== null, '选对有文字反馈');
  ok(!flat().includes('fb_right'), '音效响完之前不叠「答对了」');
  await wait(500);
  ok(flat().includes('fb_right'), '音效之后才念「答对了」');

  /* ---------- 7b. 音效响度：教室环境要听得见（旧版峰值 0.075，学生说「反馈声音太小」） ---------- */
  peaks.length = 0;
  w.sfxOk();
  await wait(60);
  const okPeak = Math.max.apply(null, peaks.concat([0]));
  ok(okPeak >= 0.2, '正确音效峰值 ' + okPeak + '（不低于 0.2，旧版 0.075 几乎听不见）');
  peaks.length = 0;
  oscTypes.length = 0;
  freqs.length = 0;
  w.sfxNo();
  await wait(60);
  const noPeak = Math.max.apply(null, peaks.concat([0]));
  ok(noPeak >= 0.30, '错误音效峰值 ' + noPeak + '（不低于 0.30，v21 及以前只有 0.20/0.17）');
  ok(noPeak >= okPeak, '错误音不比正确音轻（旧版方向反了：错 0.20 < 对 0.26）');
  ok(peaks.length >= 3, '错误音是分层下滑（实测 ' + peaks.length + ' 个增益包络）');
  ok(oscTypes.indexOf('square') >= 0,
     '错误音用了方波（v22 全是 triangle/sine，圆润得像叹气；v23 起要有粗糙感）：' +
     oscTypes.join('/'));
  /* v22 的第三层是 98Hz「咚」——平板/笔记本外放 200Hz 以下掉得厉害，教室里等于没响。
     这条守住：错误音不许再用小喇叭放不出的低频当主要信息。 */
  const lo = Math.min.apply(null, freqs.concat([9999]));
  ok(lo >= 100, '错误音最低 ' + lo + 'Hz（不低于 100Hz，小喇叭才放得出来）');
  ok(Math.max.apply(null, freqs.concat([0])) >= 200,
     '错误音主音在 200Hz 以上（泛音顶到中高频，穿透力够）');
  ok(w.VA_SFX_GAIN.gain.value >= 1, '音效总线没被压：' + w.VA_SFX_GAIN.gain.value);

  /* ---------- 8. 四款游戏：指令 → 停顿 → 字 ---------- */
  const h = w.STATE.chars.find(c => c.w === '手') || w.STATE.chars[0];
  const cases = [['bubble', 'g_bubble'], ['fish', 'g_fish'], ['fruit', 'g_fruit'], ['feed', 'g_feed']];
  for (const [kind, key] of cases){
    flush();
    w.startGame(kind, [h]);
    await wait(300);
    ok(played.length === 0, '玩法「' + kind + '」开局先亮场景，不立刻读');
    await wait(750);
    const seq = keys(played[0] || []);
    ok(played.length > 0 && seq.indexOf(key) >= 0, '玩法「' + kind + '」读到 ' + key);
    if (seq.length === 2){
      ok(seq[1] === w.charKey(h.w), '玩法「' + kind + '」只念一遍目标字');
      const p = played[0];
      ok((p[0].gap || 0) >= 0.45, '玩法「' + kind + '」指令后停 ' + p[0].gap + 's 再念字');
    } else {
      ok(false, '玩法「' + kind + '」应是 指令 + 字 两段');
    }
    /* 鱼必须有可动的部件分组，否则孩子以为画面是死的 */
    if (kind === 'fish'){
      const fEl = d.querySelector('#gameField .fish');
      ok(!!fEl && !!fEl.querySelector('.fish-tail') && !!fEl.querySelector('.fish-fin'),
        '鱼的摆尾/划鳍分组都在（游动不是死图）');
    }
    w.quitGame(true);
    await wait(150);
  }

  /* ---------- 9. 声音面板：能单独关 ---------- */
  d.getElementById('btnAV').click();
  await wait(100);
  ok(d.getElementById('avMask').hidden === false, '点喇叭打开声音设置');
  ok(d.getElementById('avTip').textContent.indexOf('内置录音') >= 0, '面板说明了用的是内置录音');
  ok(d.getElementById('avTip').textContent.indexOf('放慢') >= 0, '面板说明了已经放慢');
  d.getElementById('avVoice').click();
  await wait(80);
  ok(w.AV.voice === false, '能关掉读题朗读');
  ok(JSON.parse(w.localStorage.getItem('wb2_av_v1')).voice === false, '朗读开关存到本机');
  flush();
  w.say('测试');
  w.saySeq([{ t: '手', gap: 1 }]);
  await wait(120);
  ok(played.length === 0, '关掉后 say / saySeq 都不再出声');

  d.getElementById('avSfx').click();
  await wait(80);
  ok(w.AV.sfx === false, '能关掉音效');
  const c2 = srcCount;
  w.sfxOk();
  await wait(100);
  ok(srcCount === c2, '关掉后不再响');

  /* 语速：录音用播放倍率变速 */
  d.getElementById('avVoice').click();
  d.getElementById('avSfx').click();
  await wait(80);
  flush();
  d.querySelectorAll('#avRate button')[0].click();
  await wait(200);
  ok(Math.abs(w.AV.rate - 0.85) < 0.01, '语速能切到「慢」：' + w.AV.rate);
  const lastRate = rateSeen[rateSeen.length - 1];
  ok(Math.abs(lastRate - 0.85) < 0.01, '播放倍率真的应用到了音频上：' + lastRate);
  ok(d.getElementById('avMask').hidden === false, '面板不会自己关掉');
  d.getElementById('avClose').click();
  await wait(80);
  ok(d.getElementById('avMask').hidden === true, '能关掉面板');

  /* ---------- 10. 旧设置迁移：任意旧值都吸附到现有三档 ---------- */
  w.localStorage.setItem('wb2_av_v1', JSON.stringify({ voice: true, sfx: true, rate: 0.68 }));
  w.avLoad();
  ok(Math.abs(w.AV.rate - 1.0) < 0.01, '老系统语音语速 0.68 → 吸附到 1.0：' + w.AV.rate);
  w.localStorage.setItem('wb2_av_v1', JSON.stringify({ voice: true, sfx: true, rate: 0.84 }));
  w.avLoad();
  ok(Math.abs(w.AV.rate - 0.85) < 0.01, '旧倍率 0.84 → 吸附到 0.85：' + w.AV.rate);

  /* ---------- 11. 游戏顶部音效按钮 ---------- */
  w.startGame('fruit', [h]);
  await wait(200);
  const btn = d.getElementById('gameMute');
  ok(btn.textContent === '音效开', '游戏顶部按钮初始显示「音效开」');
  btn.click();
  await wait(80);
  ok(btn.textContent === '音效关' && w.AV.sfx === false, '点一下变「音效关」并真关掉');

  /* ---------- 12. 拼词语：读题不许念答案，拼对才念整词 ---------- */
  w.STATE.students = [{
    id: 's2', name: '拼词生', on: true,
    types: ['拼词语'], count: 6,
    chars: ['大', '人', '太', '阳', '木', '头'],
    groups: [], photoLocal: ''
  }];
  w.renderPick();
  /* 上一节开过游戏，还有一句延迟朗读在队列里（PACE.ready 之后才触发），
     先停掉并等它把定时器走完，否则会被算成本题的语音 */
  w.sayStop();
  await wait(1500);
  flush();
  w.enterStudent('拼词生');
  await wait(300);
  ok(played.length === 0, '预习阶段不开口');
  d.getElementById('preGo').click();
  await wait(60);
  ok(played.length === 0, '拼词语进题也不立刻开口');
  await wait(900);
  const wq = w.curQ();
  ok(!!wq && !!wq.words, '拼词语出题成功：' + (wq ? wq.words.map(x => x.w).join('/') : '无'));
  const ws = keys(played[0] || []);
  ok(ws.indexOf('q_word') >= 0, '读到题干「找出下面的词语」：' + ws.join(','));
  /* 答案绝不能念出来：一组里的词一个都不能出现在读题片段里 */
  let leaked = '';
  ws.forEach(k => { wq.words.forEach(wd => { if (k === w.wordKey(wd.w)) leaked = wd.w; }); });
  ok(!leaked, '读题不念答案，没提前把词念出来' + (leaked ? '：' + leaked : ''));

  const wbTile = ch => [...d.querySelectorAll('#stage .wb-tile')]
    .filter(t => t.textContent === ch && !t.classList.contains('used'))[0];

  /* 拼错 → 说「再试一试」，不念任何一个词 */
  const wbChars = [...new Set(wq.words.reduce((a, x) => a.concat([x.a, x.b]), []))];
  let wbPair = null;
  for (let i = 0; i < wbChars.length && !wbPair; i++) {
    for (let j = i + 1; j < wbChars.length; j++) {
      const a = wbChars[i], b = wbChars[j];
      if (wq.words.some(x => x.w === a + b || x.w === b + a)) continue;
      if (!w.wordBank().byW[a + b] && !w.wordBank().byW[b + a]) { wbPair = [a, b]; break; }
    }
  }
  if (wbPair) {
    flush();
    wbTile(wbPair[0]).click();
    wbTile(wbPair[1]).click();
    await wait(600);
    ok(flat().indexOf('fb_again') >= 0, '拼错时说「再试一试」：' + flat().join(','));
    const leakedWrong = wq.words.some(x => flat().indexOf(w.wordKey(x.w)) >= 0);
    ok(!leakedWrong, '拼错时也不念正确答案');
  }

  /* 拼对一个词 → 整词念一遍（不是逐字拼） */
  flush();
  const wbFirst = wq.words[0].w;
  wbTile(wbFirst.charAt(0)).click();
  wbTile(wbFirst.charAt(1)).click();
  await wait(600);
  ok(flat().indexOf(w.wordKey(wbFirst)) >= 0,
    '拼对后把整个词念一遍：' + wbFirst + ' → ' + flat().join(','));

  console.log('\n========== 结果：' + (total - bad) + ' 通过 / ' + bad + ' 失败 ==========');
  process.exit(bad ? 1 : 0);
})();
