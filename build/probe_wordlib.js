/* 词库探针：内置组词是否预填、收进词库是否生效 */
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

  console.log('字库', w.STATE.chars.length, '条；内置词', w.builtinWords().list.length,
              '条；题目词表', w.wordBank(true).list.length, '条');
  console.log('我的词库（STATE.words）', w.STATE.words.length, '条');

  w.openTeacher();
  await wait(200);
  const tab = [...d.querySelectorAll('[data-tp]')].filter(t => t.getAttribute('data-tp') === 'word')[0];
  click(tab);
  await wait(400);

  const rows = d.querySelectorAll('#wdTbody tr');
  const built = d.querySelectorAll('#wdTbody tr.tr-builtin');
  console.log('\n词库表行数', rows.length, '其中内置行', built.length);
  console.log('计数文案：', d.getElementById('wdCount').textContent);
  console.log('筛选下拉：', [...d.querySelectorAll('#wdFilter option')].map(o => o.textContent).join(' | '));

  const first = built[0];
  if (first) console.log('第一行内置词：', first.textContent.replace(/\s+/g, ' ').trim());

  /* 收进词库 */
  const btn = built[0] && built[0].querySelector('[data-wcopy]');
  console.log('收进词库按钮：', !!btn, btn && btn.getAttribute('data-wcopy'));
  if (btn) {
    const word = btn.getAttribute('data-wcopy');
    const n0 = w.STATE.words.length;
    click(btn);
    await wait(200);
    console.log('点击后 我的词库', n0, '→', w.STATE.words.length,
                '；第一行是否变成「已在词库」：',
                d.querySelectorAll('#wdTbody tr.tr-builtin')[0].textContent.indexOf('已在词库') >= 0);
    console.log('新词条：', JSON.stringify(w.STATE.words[w.STATE.words.length - 1]));
    /* 再点一次不该重复加 */
    const again = d.querySelectorAll('#wdTbody tr.tr-builtin')[0].querySelector('[data-wcopy]');
    console.log('第二次还能点吗（应 false）：', !!again);
    /* 筛选「我的词库」 */
    const f = d.getElementById('wdFilter');
    f.value = 'mine';
    f.dispatchEvent(new w.Event('change', { bubbles: true }));
    await wait(200);
    console.log('筛选「我的词库」后行数：', d.querySelectorAll('#wdTbody tr').length,
                '文案：', d.getElementById('wdCount').textContent);
    /* 搜「大人」 */
    f.value = '';
    f.dispatchEvent(new w.Event('change', { bubbles: true }));
    const s = d.getElementById('wdSearch');
    s.value = '大人';
    s.dispatchEvent(new w.Event('input', { bubbles: true }));
    await wait(320);
    console.log('搜「大人」：', d.querySelectorAll('#wdTbody tr').length, '行');
    s.value = '';
    s.dispatchEvent(new w.Event('input', { bubbles: true }));
    await wait(320);
    console.log('清空搜索：', d.querySelectorAll('#wdTbody tr').length, '行');
  }

  console.log('\nJS 错误：', errs.length ? errs : '无');
  dom.window.close();
})();
