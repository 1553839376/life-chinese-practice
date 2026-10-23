/* 探针：今日字卡预习（v18）
   验证 ① 点进学生先出字卡不是题目 ② 字单与出题同源 ③ 点卡打勾 ④ 开始练习进答题 ⑤ 抽练收敛 ⑥ 空字表 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const file = path.join(__dirname, '生活语文练习台.html');
const html = fs.readFileSync(file, 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const w = dom.window;
const d = w.document;

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } }

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  await wait(900);
  // 造学生：字都能在字库里查到
  const cs = w.STATE.chars.filter(c => c.on && c.w);
  const names = cs.slice(0, 20).map(c => c.w);
  w.STATE.students = [{ id: 'local_a', name: '小明', types: ['听音找字', '找一样的字'],
    chars: names.slice(), groups: [], count: 8, status: '在读', photo: '' }];
  // 造 3 个已掌握、2 个需巩固
  const now = Date.now();
  names.slice(0, 3).forEach(ch => {
    w.STATE.logs['小明|' + ch] = { id: '', key: '小明|' + ch, stu: '小明', ch,
      n: 6, alone: 6, hinted: 0, wrong: 0, prompts: 0, last: new Date(now).toISOString(), level: '', dirty: false };
  });
  names.slice(3, 5).forEach(ch => {
    w.STATE.logs['小明|' + ch] = { id: '', key: '小明|' + ch, stu: '小明', ch,
      n: 4, alone: 0, hinted: 1, wrong: 3, prompts: 0, last: new Date(now).toISOString(), level: '', dirty: false };
  });

  console.log('\n=== ① 点进学生先出字卡 ===');
  w.enterStudent('小明');
  const stage = d.getElementById('stage');
  ok(!!stage.querySelector('.pre-wrap'), '进度页出现 .pre-wrap 字卡区');
  ok(!stage.querySelector('.opt'), '没有直接出选项（不越过预习）');
  ok(d.getElementById('qNow').textContent === '预习', '题数区显示「预习」：' + d.getElementById('qNow').textContent);
  const cards = stage.querySelectorAll('.pre-card');
  ok(cards.length === 8, '字卡张数 = 每日题量 8：' + cards.length);
  ok(d.getElementById('qTotal').textContent === '8', '总数字显示 8');

  console.log('\n=== ② 字单与出题同源 ===');
  const preChars = Array.from(cards).map(c => c.getAttribute('data-pre'));
  ok(preChars.length === new Set(preChars).size, '字卡不重复：' + preChars.join(''));
  ok(JSON.stringify(w.PRE.list.map(c => c.w)) === JSON.stringify(preChars),
    'PRE.list（渲染时的快照）与 DOM 一致');
  // 需巩固的字必须进字单
  ok(preChars.indexOf(names[3]) >= 0 && preChars.indexOf(names[4]) >= 0,
    '需巩固的字优先进字单：' + names[3] + names[4]);

  console.log('\n=== ③ 四态标签 ===');
  const sts = Array.from(cards).map(c => (c.querySelector('.pre-st') || {}).textContent);
  ok(sts.indexOf('需巩固') >= 0, '有「需巩固」标签：' + sts.join('/'));
  ok(cards[0].querySelector('.pre-char').textContent.length === 1, '每张卡是一个汉字');
  ok(!!cards[0].querySelector('.pre-py'), '卡片带拼音');

  console.log('\n=== ④ 点卡片：打勾 + 朗读 ===');
  const c0 = cards[0].getAttribute('data-pre');
  c0 && cards[0].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const firstNow = stage.querySelector('[data-pre="' + c0 + '"]');
  ok(firstNow.className.indexOf('read') >= 0, '点过的卡加了 .read：' + firstNow.className);
  ok(!!firstNow.querySelector('.pre-tick'), '点过的卡出现「读过了」');
  ok(w.PRE.read[c0] === 1, 'PRE.read 记下了：' + JSON.stringify(w.PRE.read));

  console.log('\n=== ⑤ 开始练习 → 进入答题 ===');
  const go = d.getElementById('preGo');
  ok(!!go, '有开始练习按钮');
  ok(go.textContent.indexOf('开始练习') >= 0, '按钮文案：' + go.textContent);
  go.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await wait(120);
  ok(!!w.STATE.quiz, 'STATE.quiz 已建立');
  ok(!!stage.querySelector('.opt'), '进入答题（出现选项）');
  ok(w.STATE.quiz.qs.length === 8, '题数 8：' + (w.STATE.quiz && w.STATE.quiz.qs.length));
  const qChars = w.STATE.quiz.qs.map(q => q.target.w);
  ok(qChars.every(x => preChars.indexOf(x) >= 0), '出的题全在预习字单里：' + qChars.join(''));

  console.log('\n=== ⑥ 全读过 → 按钮文案变化 ===');
  w.enterStudent('小明');
  const cards2 = d.querySelectorAll('.pre-card');
  cards2.forEach(c => c.dispatchEvent(new w.MouseEvent('click', { bubbles: true })));
  const go2 = d.getElementById('preGo');
  ok(go2.textContent.indexOf('都读过啦') >= 0, '全读过文案：' + go2.textContent);

  console.log('\n=== ⑦ 抽练只预习抽到的字 ===');
  w.enterStudent('小明');
  w.drillStudent('小明', [names[3]]);
  await wait(120);
  const cards3 = d.querySelectorAll('.pre-card');
  ok(cards3.length === 1, '抽练 1 个字 → 1 张卡：' + cards3.length);
  ok(cards3[0] && cards3[0].getAttribute('data-pre') === names[3], '卡片就是抽练的字');
  w.leaveStudent(true);

  console.log('\n=== ⑧ 空字表 ===');
  w.STATE.students.push({ id: 'local_b', name: '空表', types: ['听音找字'], chars: [], groups: [], count: 8, status: '在读', photo: '' });
  w.enterStudent('空表');
  ok(d.getElementById('stage').textContent.indexOf('还没有字表') >= 0, '空字表给明确提示');
  ok(!d.getElementById('preGo'), '空字表不出开始按钮');

  console.log('\n========== 结果：' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
