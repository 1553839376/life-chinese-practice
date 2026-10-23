/* 探针：在学上限与字表状态机（T-009 / v19）
   验证 ① 老数据迁移钳制 ② 在学名单按上限生成 ③ 掌握自动退出+补位
        ④ 锁定不退出 ⑤ 手动加入/移出/满员拒绝 ⑥ 档案页显示 ⑦ 只影响该学生 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '生活语文练习台.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const w = dom.window;
const d = w.document;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await wait(900);
  /* 字库 700 条里只有 561 个不重复字，测试字表必须先按字去重，否则计数会虚高 */
  const pool = Array.from(new Set(
    w.STATE.chars.filter(c => c.on && c.w).map(c => c.w))).slice(0, 30);
  const now = new Date().toISOString();
  const mkLog = (stu, ch, o) => {
    w.STATE.logs[stu + '|' + ch] = Object.assign({
      id: '', key: stu + '|' + ch, stu, ch, last: now,
      n: 0, alone: 0, hinted: 0, wrong: 0, prompts: 0, level: '', dirty: false
    }, o);
  };

  console.log('\n=== ① 老数据迁移：题量 20 → 10，并补上在学名单 ===');
  w.STATE.students = [
    { id: 'a', name: '老生', types: ['听音找字'], chars: pool.slice(), groups: [], count: 20, status: '在读', photo: '' },
    { id: 'b', name: '小班', types: ['听音找字'], chars: pool.slice(0, 12), groups: [], count: 2, status: '在读', photo: '' }
  ];
  w.STATE.logs = {};
  w.saveSnap();                       /* 先落一次盘，迁移才有东西可备份 */
  const n = w.migrateCap();
  ok(n > 0, '迁移有改动：' + n);
  ok(w.STATE.students[0].count === 10, '20 收到上限 10：' + w.STATE.students[0].count);
  ok(w.STATE.students[1].count === 3, '2 抬到下限 3：' + w.STATE.students[1].count);
  ok(Array.isArray(w.STATE.students[0].active), '补出 active 数组');
  ok(!!w.localStorage.getItem('wb2_data_v1.bak-T009'), '迁移前留了 bak-T009 备份');

  console.log('\n=== ② 在学名单按上限生成 ===');
  const s0 = w.STATE.students[0];
  let act = w.stuActive(s0);
  ok(act.length === 10, '在学 10 个：' + act.length + ' → ' + act.join(''));
  ok(act.length === w.stuCap(s0), '在学数量 = 上限');
  ok(new Set(act).size === act.length, '在学名单不重复');
  ok(act.every(x => pool.indexOf(x) >= 0), '全部来自字表');

  console.log('\n=== ③ 掌握一个 → 自动退出 + 补一个 ===');
  const first = act[0];
  mkLog('老生', first, { n: 6, alone: 6, wrong: 0 });
  const act2 = w.stuActive(s0);
  ok(act2.indexOf(first) < 0, '已达标的字退出在学：' + first);
  ok(act2.length === 10, '名额补齐到 10：' + act2.length);
  ok(act2.indexOf(act[10]) >= 0 || act2.some(x => act.indexOf(x) < 0), '补进来一个新字');

  console.log('\n=== ④ 锁定后不退出 ===');
  const second = act2[0];
  w.actLock(s0, second);
  mkLog('老生', second, { n: 8, alone: 8, wrong: 0 });
  const act3 = w.stuActive(s0);
  ok(act3.indexOf(second) >= 0, '锁定的字学会了也留在在学：' + second);
  w.actLock(s0, second);
  const act3b = w.stuActive(s0);
  ok(act3b.indexOf(second) < 0, '解锁后下一轮退出');
  ok(w.lockList(s0).length === 0, '解锁后锁定表清空');

  console.log('\n=== ⑤ 手动加入 / 移出 / 满员拒绝 ===');
  const cur = w.stuActive(s0);
  const outside = pool.filter(x => cur.indexOf(x) < 0)[0];
  ok(!w.actAdd(s0, outside), '在学已满时拒绝加入：' + outside);
  const drop = cur[cur.length - 1];
  ok(w.actDel(s0, drop), '移出一个：' + drop);
  ok(w.stuActive(s0).length === 9, '移出后 9 个');
  ok(w.actAdd(s0, outside), '空出名额后能加入：' + outside);
  ok(w.stuActive(s0).indexOf(outside) >= 0, '新字已在在学名单里');
  ok(w.lockList(s0).indexOf(outside) >= 0, '已掌握的字被手动拉回时自动锁定（否则下一轮又被剔出）');
  ok(!w.actAdd(s0, outside), '已在名单里的不重复加');

  console.log('\n=== ⑥ 今日字卡 = 在学名单 ===');
  w.enterStudent('老生');
  await wait(150);
  const cards = Array.from(d.querySelectorAll('#stage .pre-card')).map(c => c.getAttribute('data-pre'));
  const actNow = w.stuActive(s0);
  ok(cards.length === actNow.length, '字卡张数 = 在学个数：' + cards.length + ' / ' + actNow.length);
  ok(cards.every(x => actNow.indexOf(x) >= 0), '字卡全在在学名单里');

  console.log('\n=== ⑦ 档案页显示在学 / 排队 ===');
  w.openStuProfile('老生');
  await wait(120);
  const meta = d.getElementById('profMeta').textContent;
  ok(meta.indexOf('在学') >= 0, '档案顶部写在学：' + meta);
  const lg = d.getElementById('profLegend').textContent;
  ok(lg.indexOf('在学') >= 0 && lg.indexOf('排队') >= 0, '图例写清在学与排队：' + lg);
  ok(d.querySelectorAll('#profGrid .pgc.in-act').length === actNow.length,
    '网格里在学的字有标记：' + d.querySelectorAll('#profGrid .pgc.in-act').length);

  console.log('\n=== ⑧ 明细里的加入/移出按钮 ===');
  const outCh = pool.filter(x => actNow.indexOf(x) < 0)[0];
  const cell = d.querySelector('#profGrid [data-pw="' + outCh + '"]');
  cell.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await wait(80);
  ok(!!d.querySelector('[data-act-in="' + outCh + '"]'), '排队中的字给「加入在学」按钮');
  const inCh = actNow[0];
  d.querySelector('#profGrid [data-pw="' + inCh + '"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await wait(80);
  ok(!!d.querySelector('[data-act-out="' + inCh + '"]'), '在学的字给「先移出在学」按钮');
  ok(!!d.querySelector('[data-act-lock="' + inCh + '"]'), '有锁定按钮');

  console.log('\n=== ⑨ 上限只影响该学生 ===');
  ok(w.STATE.students[1].count === 3, '另一个学生还是 3：' + w.STATE.students[1].count);
  ok(w.stuActive(w.STATE.students[1]).length === 3, '他的在学是 3 个');
  s0.count = 5;
  ok(w.stuActive(s0).length === 5, '改上限后立即收到 5：' + w.stuActive(s0).length);
  ok(w.STATE.students[1].count === 3, '改一个人的上限不影响别人');

  console.log('\n========== 结果：' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
