const fs = require('fs');
const { JSDOM } = require('jsdom');
const HTML = fs.readFileSync('生活语文练习台.html', 'utf8');
const wait = ms => new Promise(r => setTimeout(r, ms));
let bad = 0;
function ok(cond, msg){ console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) bad++; }

(async () => {
  const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.com/p/e' });
  dom.window.scrollTo = function(){};
  await wait(700);
  const w = dom.window, d = w.document;

  /* ---------- 1. 首页就是认字乐园 ---------- */
  ok(d.getElementById('scrLearn').hidden === false, '打开就是认字乐园');
  ok(d.getElementById('scrPick').hidden === true, '练习台退到第二屏');
  ok(d.getElementById('mainNav').hidden === false, '主导航显示');
  const cards = [...d.querySelectorAll('#charGrid .ch-card')];
  console.log('  首屏字卡 ' + cards.length + ' 张 | 册次条 ' + d.querySelectorAll('.stage-chip').length + ' 个 | ' +
    d.querySelectorAll('.grp').length + ' 个年级分段 | ' + d.getElementById('learnCount').textContent);
  ok(cards.length > 100, '首屏铺开各年级的字');
  ok(d.querySelectorAll('.stage-chip').length >= 20, '册次条覆盖各年级');

  /* ---------- 2. 切册次 ---------- */
  const chips = [...d.querySelectorAll('.stage-chip')];
  const c2 = chips[3];
  c2.click(); await wait(150);
  const n2 = d.querySelectorAll('#charGrid .ch-card').length;
  console.log('  切到「' + c2.textContent + '」→ ' + d.getElementById('learnCount').textContent);
  ok(n2 > 0 && n2 !== cards.length, '切换册次换了一批字');

  /* ---------- 3. 搜索（拼音不带声调） ---------- */
  const si = d.getElementById('learnSearch');
  si.value = 'hu';
  si.dispatchEvent(new w.Event('input', { bubbles: true }));
  await wait(300);
  const res = [...d.querySelectorAll('#charGrid .ch-card .ch-big')].map(x => x.textContent);
  console.log('  搜 hu → ' + res.join(' ') + ' | ' + d.getElementById('learnCount').textContent);
  ok(res.indexOf('虎') >= 0, '拼音 hu 能搜到「虎」');
  si.value = '老虎';
  si.dispatchEvent(new w.Event('input', { bubbles: true }));
  await wait(300);
  ok(d.querySelectorAll('#charGrid .ch-card').length >= 1, '组词「老虎」能搜到字');
  d.getElementById('learnClear').click();
  await wait(250);
  ok(d.getElementById('learnSearch').value === '', '清空搜索恢复册次');

  /* ---------- 4. 点字弹出学字卡 ---------- */
  const card0 = d.querySelector('#charGrid .ch-card');
  const ch0 = d.querySelector('#charGrid .ch-card .ch-big').textContent;
  card0.click(); await wait(150);
  ok(d.getElementById('cardMask').hidden === false, '点字卡弹出学字卡');
  ok(d.getElementById('sheetChar').textContent === ch0, '学字卡显示「' + ch0 + '」');
  ok(d.querySelectorAll('[data-gk]').length === 4, '学字卡有 4 个玩法入口');

  /* ---------- 5. 四款游戏都能起来 ---------- */
  const kinds = [['bubble', '戳泡泡'], ['fish', '钓鱼'], ['fruit', '摘果子'], ['feed', '喂小动物']];
  for (const [k, name] of kinds) {
    d.querySelector('[data-gk="' + k + '"]').click();
    await wait(220);
    const items = [...d.querySelectorAll('#gameField .g-item')];
    const q = w.GAME.queue[w.GAME.i];
    const right = items.filter(x => x.getAttribute('data-w') === q.w);
    const extra = k === 'feed' ? d.querySelectorAll('#feedAnimal svg').length
      : k === 'fish' ? d.querySelectorAll('.fish-svg').length : 0;
    ok(d.getElementById('scrGame').hidden === false && items.length === 4 && right.length === 1,
      name + '：目标「' + q.w + '」4 个选项、恰 1 个正确' + (extra ? '，形象 ' + extra + ' 个' : ''));
    ok(d.getElementById('mainNav').hidden === true, name + '：游戏时隐藏主导航，孩子不会误点');
    // 点错的反馈
    const wrong = items.filter(x => x.getAttribute('data-w') !== q.w)[0];
    wrong.click(); await wait(80);
    ok(wrong.classList.contains('miss'), name + '：点错变灰、不禁用继续找');
    // 退出
    d.getElementById('gameQuit').click(); await wait(120);
    ok(d.getElementById('scrLearn').hidden === false, name + '：能退回乐园');
    d.querySelector('#charGrid .ch-card').click(); await wait(120);
  }

  /* ---------- 6. 完整一轮 + 结算 ---------- */
  d.querySelector('[data-gk="bubble"]').click(); await wait(220);
  for (let i = 0; i < 4; i++) {
    const q = w.GAME.queue[w.GAME.i];
    const el = [...d.querySelectorAll('#gameField .g-item')].filter(x => x.getAttribute('data-w') === q.w)[0];
    el.click();
    await wait(960);
  }
  ok(d.getElementById('gameOverBox') !== null, '答完 4 题出现结算页');
  console.log('  结算：' + d.getElementById('gameOverBox').textContent.replace(/\s+/g, ' ').trim());
  d.querySelector('#gameOverBox .primary').click(); await wait(250);
  ok(d.getElementById('gameOverBox') === null && w.GAME.i === 0, '「再玩一次」重置回第 1 题');
  d.getElementById('gameQuit').click(); await wait(150);

  /* ---------- 7. 全班一起玩 ---------- */
  d.getElementById('btnPlayAll').click(); await wait(250);
  ok(w.GAME.queue.length >= 6, '全班一起玩：一轮 ' + w.GAME.queue.length + ' 题');
  ok(['bubble', 'fish', 'fruit', 'feed'].indexOf(w.GAME.kind) >= 0, '玩法随机抽到「' + w.GAME.kind + '」');
  d.getElementById('gameQuit').click(); await wait(150);

  /* ---------- 8. 原练习台还在 ---------- */
  d.querySelector('[data-nav="pick"]').click(); await wait(200);
  ok(d.getElementById('scrPick').hidden === false, '第二栏「练习」能切过去');
  ok(d.querySelector('[data-nav="pick"]').classList.contains('on'), '导航高亮跟着走');
  d.querySelector('[data-nav="learn"]').click(); await wait(200);
  ok(d.getElementById('scrLearn').hidden === false, '能切回认字乐园');
  ok(d.querySelectorAll('#charGrid .ch-card').length > 0, '切回来字卡还在');

  console.log('\n' + (bad ? bad + ' 项失败' : '全部通过'));
  process.exit(bad ? 1 : 0);
})();
