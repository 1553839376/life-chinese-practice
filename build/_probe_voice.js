/* 盘点「实际会被念出来的声音」：把每句朗读文本拆成片段，看它是不是一句整录，
   还是会退化成逐字念（老师说的「单字组合的很奇怪」）。
   覆盖：8 个题型的题面、4 个游戏的口令、结算页鼓励语、听写词、拼词语的词。 */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const file = process.argv[2] || '生活语文练习台.html';
const html = fs.readFileSync(path.join(__dirname, file), 'utf8');

(async () => {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', resources: undefined });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  await new Promise(r => w.addEventListener('load', r, { once: true }));
  await new Promise(r => setTimeout(r, 400));
  const d = w.document;

  const rows = [];
  const probe = (label, text) => {
    if (!text) return;
    const parts = w.sayParts(text);
    if (!parts || !parts.length) { rows.push([label, text, '——', 'no part']); return; }
    const kinds = parts.map(p => p.k);
    const full = kinds.length === 1 && kinds[0].charAt(0) !== 'u';
    const missing = kinds.filter(k => !w.vaB64(k));
    rows.push([label, text, full ? '整句' : (kinds.length + ' 段: ' + kinds.slice(0, 8).join(',')),
      missing.length ? ('缺 ' + missing.join(',')) : '']);
  };

  // 题型题面
  const chars = w.STATE.chars.slice(0, 40);
  const types = ['听音找字','找一样的字','看拼音写字','图字配对','认读跟读','拼词语','汉字听写','描红汉字'];
  for (const t of types){
    w.STATE.students = [{ id: 'p1', name: '探针', types: [t], chars: chars.map(c => c.w), groups: [], count: 8, status: '在读', photo: '' }];
    w.STATE.cur = w.STATE.students[0];
    w.saveSnap();
    try { w.startQuiz(t); } catch (e) { rows.push([t, '(startQuiz 失败)', String(e.message), '']); continue; }
    const z = w.STATE.quiz;
    if (!z || !z.qs.length){ rows.push([t, '(没有出题)', '', '']); continue; }
    const q = z.qs[0];
    (w.quizSay(t, q) || []).forEach(x => probe(t + ' 题面', x.t));
    if (t === '汉字听写') probe(t + ' 答案词', w.wgAnswerOf(q));
    if (t === '拼词语' && q.words) probe(t + ' 词', q.words.map(x => x.w).join('、'));
  }
  // 游戏口令
  ['bubble','fish','fruit','feed'].forEach(k => {
    (w.gameSay(k, { w: '一' }) || []).forEach(x => probe('游戏 ' + k, x.t));
  });
  // 结算页三种鼓励语 + 描红答对
  ['太棒了！','做得不错，继续加油','再来一次会更好','写好了！','答对了！','再试一试。','朗读打开了','朗读关掉了'].forEach(t => probe('反馈', t));

  const bad = rows.filter(r => r[2] !== '整句' || r[3]);
  const seen = new Set();
  console.log('检查文本', rows.length, '条，异常', bad.length);
  for (const r of bad){
    const k = r[0] + '|' + r[1];
    if (seen.has(k)) continue; seen.add(k);
    console.log('  ' + r[0].padEnd(14) + ' ' + r[1].padEnd(18) + ' ' + r[2] + (r[3] ? '  ' + r[3] : ''));
  }
  w.close();
})();
