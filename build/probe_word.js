/* 拼词语探针：出题、点选、判对/判错、整组完成、记录落库 */
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('生活语文练习台.html', 'utf8');
const errs = [];
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.test/',
  beforeParse(w){ w.addEventListener('error', e => errs.push('E: ' + (e.message || e))); } });
const w = dom.window, d = w.document;
const wait = ms => new Promise(r => setTimeout(r, ms));
const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));

(async () => {
  await new Promise(r => w.addEventListener('load', r, { once: true }));
  await wait(400);
  console.log('字库', w.STATE.chars.length, '词表', w.wordBank(true).list.length);

  const stu = { id: 'local_t', name: '拼词生', types: ['拼词语'], chars: ['大', '人', '太', '阳', '木', '头'],
                groups: [], count: 8, status: '在读', photo: '', edited: Date.now() };
  w.STATE.students.push(stu);
  w.saveSnap();
  w.enterStudent('拼词生');
  await wait(300);

  const z = w.STATE.quiz;
  console.log('题型', z && z.type, '组数', z && z.qs.length, '题数显示', d.getElementById('qTotal').textContent);
  const q0 = z.qs[0];
  console.log('第1组词：', q0.words.map(x => x.w).join(' / '));
  console.log('字块：', q0.tiles.join(' '), '(共', q0.tiles.length, ')');
  console.log('DOM 字块数', d.querySelectorAll('#stage .wb-tile').length,
              '词位', d.querySelectorAll('#stage .wb-slot').length);

  const tileOf = ch => [...d.querySelectorAll('#stage .wb-tile')].filter(t => t.textContent === ch && !t.classList.contains('used'))[0];
  const hit = (a, b) => { click(tileOf(a)); click(tileOf(b)); };

  /* 1) 故意点错 */
  const wrongPairs = [['大', '阳'], ['人', '木'], ['太', '人']];
  const wp = wrongPairs.filter(p => !q0.words.some(x => x.w === p[0] + p[1] || x.w === p[1] + p[0]))[0];
  if (wp) {
    hit(wp[0], wp[1]);
    await wait(120);
    console.log('错拼', wp.join(''), '→ 已填词位', d.querySelectorAll('#stage .wb-slot.on').length,
                '抖动类', !!d.querySelector('.wb-tile.shake'),
                '提示语:', d.getElementById('wbTip').textContent);
  } else console.log('错拼用例没找到（全都能成词）');

  /* 2) 逐个拼对 */
  for (let i = 0; i < q0.words.length; i++) {
    const wd = q0.words[i].w;
    const a = wd.charAt(0), b = wd.charAt(1);
    hit(a, b);
    await wait(140);
    console.log('拼', wd, '→ 词位', d.querySelectorAll('#stage .wb-slot.on').length,
                '已用字块', d.querySelectorAll('#stage .wb-tile.used').length,
                '提示:', d.getElementById('wbTip').textContent);
  }
  console.log('quiz.right', z.right, 'locked', q0.locked, 'answered', z.answered);

  /* 3) 记录是否落到学生字表里的字 */
  const keys = Object.keys(w.STATE.logs).filter(k => k.indexOf('拼词生|') === 0);
  console.log('记录条数', keys.length, keys.map(k => k.split('|')[1] + '=' + w.STATE.logs[k].alone).join(' '));

  /* 4) 等自动翻页 */
  await wait(3200);
  console.log('自动翻页后 第', z.i + 1, '组；当前词',
              z.qs[z.i] ? z.qs[z.i].words.map(x => x.w).join(' / ') : '已结束');

  /* 5) 提示按钮 */
  const hb = d.getElementById('btnHint');
  console.log('提示按钮 disabled =', hb && hb.disabled);
  if (hb && !hb.disabled) {
    click(hb);
    await wait(120);
    console.log('  点提示后 闪烁字块', d.querySelectorAll('#stage .wb-tile.hinted').length,
                'promptUsed', z.promptUsed, 'toast', d.querySelector('.toast') ? d.querySelector('.toast').textContent : '无');
  }

  console.log('\n异常', errs.length, '条');
  errs.slice(0, 6).forEach(e => console.log('  ! ' + e));
  process.exit(0);
})();
