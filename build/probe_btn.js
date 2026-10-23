/* 探测老师端各按钮是否真的能用：真实点击 + 捕获异常 */
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(process.argv[2] || '生活语文练习台.html', 'utf8');

const errs = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.test/',
  beforeParse(w) {
    w.addEventListener('error', e => errs.push('window.error: ' + (e.message || e)));
    const oc = w.console.error;
    w.console.error = (...a) => { errs.push('console.error: ' + a.join(' ')); oc.apply(w.console, a); };
  }
});
const w = dom.window, d = w.document;
const wait = ms => new Promise(r => setTimeout(r, ms));
const click = el => {
  const ev = new w.MouseEvent('click', { bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
};

(async () => {
  await new Promise(r => w.addEventListener('load', r, { once: true }));
  await wait(400);

  /* 进老师端 */
  if (w.openTeacher) w.openTeacher();
  else { const e = d.getElementById('teaEntry'); e.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true })); }
  await wait(200);

  const tabs = [...d.querySelectorAll('.tea-tab')];
  console.log('老师端 tab：', tabs.map(t => t.textContent + '=' + t.getAttribute('data-tp')).join(' | '));

  const probe = (name, fn) => {
    const before = errs.length;
    let err = null;
    try { fn(); } catch (e) { err = e.message; }
    const news = errs.slice(before);
    console.log(`  [${name}] ${err ? 'THROW ' + err : 'ok'}${news.length ? '  errs=' + news.join(' / ') : ''}`);
  };

  /* 1. 字库：新增汉字 */
  const libTab = tabs.filter(t => t.getAttribute('data-tp') === 'lib')[0];
  if (libTab) {
    click(libTab); await wait(200);
    const b = d.getElementById('btnLibNew'), f = d.getElementById('libForm');
    console.log('\n字库面板 hidden=' + d.getElementById('tpLib').hidden);
    console.log('按钮存在=' + !!b + ' 表单初始 hidden=' + (f && f.hidden));
    if (b) {
      probe('点新增汉字', () => click(b));
      await wait(100);
      console.log('  → libForm.hidden = ' + f.hidden + '  fLibWord.value="' + d.getElementById('fLibWord').value + '"');
      console.log('  → libForm 在视口内的位置：offsetTop=' + f.offsetTop + ' / 文档高 ' + d.body.scrollHeight);
      const save = d.getElementById('btnLibSave');
      d.getElementById('fLibWord').value = '测';
      d.getElementById('fLibPinyin').value = 'cè';
      probe('点保存', () => click(save));
      await wait(300);
      console.log('  → 字库条数：' + w.STATE.chars.filter(c => c.w === '测').length);
      const cancel = d.getElementById('btnLibCancel');
      probe('点取消', () => click(cancel));
    }
  }

  /* 2. 词库：新增词语 */
  const wdTab = tabs.filter(t => t.getAttribute('data-tp') === 'word')[0];
  if (wdTab) {
    click(wdTab); await wait(200);
    console.log('\n词库面板 hidden=' + d.getElementById('tpWord').hidden + '  词条数=' + w.STATE.words.length);
    const b = d.getElementById('btnWdNew'), f = d.getElementById('wdForm');
    if (b) {
      probe('点新增词语', () => click(b));
      await wait(100);
      console.log('  → wdForm.hidden = ' + f.hidden);
      d.getElementById('fWdWord').value = '测试';
      probe('点保存', () => click(d.getElementById('btnWdSave')));
      await wait(300);
      console.log('  → 词库里有"测试"：' + w.STATE.words.filter(x => x.w === '测试').length);
      probe('点取消', () => click(d.getElementById('btnWdCancel')));
    }
  }

  /* 3. 学生：新增学生 */
  const stuTab = tabs.filter(t => t.getAttribute('data-tp') === 'stu')[0];
  if (stuTab) {
    click(stuTab); await wait(200);
    const b = d.getElementById('btnStuNew'), f = d.getElementById('stuForm');
    if (b) {
      probe('点新增学生', () => click(b));
      await wait(100);
      console.log('\n学生表单 hidden=' + f.hidden);
      probe('点取消', () => click(d.getElementById('btnStuCancel')));
    }
  }

  /* 4. 进度 tab */
  const pgTab = tabs.filter(t => t.getAttribute('data-tp') === 'prog')[0];
  if (pgTab) { probe('切进度', () => click(pgTab)); await wait(200);
    console.log('\n进度面板 hidden=' + d.getElementById('tpProg').hidden + ' 统计卡=' + d.querySelectorAll('#progStats .stat').length); }

  /* 5. 备份 tab */
  const bkTab = tabs.filter(t => t.getAttribute('data-tp') === 'backup')[0];
  if (bkTab) { probe('切备份', () => click(bkTab)); await wait(200); }

  console.log('\n全局异常共 ' + errs.length + ' 条：');
  errs.slice(0, 10).forEach(e => console.log('  ! ' + e));
  process.exit(0);
})();
