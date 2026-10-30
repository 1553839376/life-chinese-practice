/* 量「词难度跟着学生册次走」改得对不对：
   同一份字库，造两张字表 —— 一年级上册 20 字 / 六年级上册-认 20 字，
   看各自出什么词、超纲字的册次差多大。
   用法：node probe_stage.js 生活语文练习台.html [_base_v26.html] */
const fs = require('fs');
const { JSDOM } = require('jsdom');

function run(file, cb) {
  const html = fs.readFileSync(file, 'utf8');
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.test/' });
  const w = dom.window;
  w.addEventListener('load', async () => {
    await new Promise(r => setTimeout(r, 500));
    cb(w);
  }, { once: true });
}

const G1 = '一年级上册', G6 = '六年级上册-认';

function analyze(w, group, n, rounds) {
  const all = w.STATE.chars.filter(c => c.g === group).map(c => c.w);
  const chars = all.slice(0, n);
  const stu = { id: 'local_p', name: '探针' + group, types: ['拼词语'], chars,
                groups: [], count: 12, status: '在读', photo: '', edited: Date.now() };
  w.STATE.students = w.STATE.students.filter(s => s.id !== stu.id).concat([stu]);
  const setIdx = {};
  chars.forEach(c => { setIdx[c] = 1; });
  let groups = 0, w3 = 0, w2 = 0, w1 = 0, gapMax = 0, gapSum = 0, gapN = 0;
  const samples = [], offenders = [];
  for (let r = 0; r < rounds; r++) {
    w.enterStudent(stu.name);
    w.startQuiz('拼词语');
    const z = w.STATE.quiz;
    if (!z || z.type !== '拼词语') continue;
    z.qs.forEach(q => {
      groups++;
      if (q.words.length >= 3) w3++; else if (q.words.length === 2) w2++; else w1++;
      q.words.forEach(x => {
        const ca = !!setIdx[x.a], cb = !!setIdx[x.b];
        const okNow = w.wordFitsStu ? w.wordFitsStu(ca, cb, x.a, x.b) : true;
        const sa = w.charStage ? w.charStage(x.a) : -1;
        const sb = w.charStage ? w.charStage(x.b) : -1;
        const ref = ca && cb ? Math.max(sa, sb) : (ca ? sa : sb);
        const other = ca && cb ? Math.max(sa, sb) : (ca ? sb : sa);
        if (!(ca && cb)) {
          const g = other - ref;
          gapSum += g; gapN++;
          if (g > gapMax) gapMax = g;
        }
        if (!okNow && offenders.length < 8) offenders.push(x.w + '(' + (ca ? x.a : x.b) + '超纲)');
        if (samples.length < 10) samples.push(x.w + (ca && cb ? '' : '·'));
      });
    });
  }
  return { chars: chars.join(''), groups, w3, w2, w1, gapMax,
           gapAvg: gapN ? (gapSum / gapN).toFixed(2) : '-', samples, offenders };
}

function show(tag, a) {
  console.log(`\n【${tag}】字表 ${a.chars.length} 字：${a.chars}`);
  console.log(`  组数 ${a.groups}｜3 词组 ${a.w3}｜2 词组 ${a.w2}｜1 词组 ${a.w1}`);
  console.log(`  超纲字册次差：最大 ${a.gapMax}，平均 ${a.gapAvg}（·=词里有一个字不在字表）`);
  console.log(`  出了这些词：${a.samples.join(' ')}`);
  if (a.offenders.length) console.log(`  ⚠ 超出学生册次：${a.offenders.join(' ')}`);
}

const target = process.argv[2];
const base = process.argv[3];
run(target, w => {
  console.log('=== 新（按册次）===');
  show('一年级上册 20 字', analyze(w, G1, 20, 6));
  show('六年级上册-认 20 字', analyze(w, G6, 20, 6));
  if (base) {
    run(base, w2 => {
      console.log('\n=== 旧（固定难词表）===');
      show('一年级上册 20 字', analyze(w2, G1, 20, 6));
      show('六年级上册-认 20 字', analyze(w2, G6, 20, 6));
      process.exit(0);
    });
  } else process.exit(0);
});
