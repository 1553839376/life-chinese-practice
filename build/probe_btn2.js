/* 巡检：编辑/删除/导入/导出/搜索 到底能不能用（含是否可见） */
const fs = require('fs'); const { JSDOM } = require('jsdom');
const html = fs.readFileSync('生活语文练习台.html', 'utf8');
const errs = [];
const dom = new JSDOM(html, { runScripts:'dangerously', pretendToBeVisual:true, url:'https://x.test/',
  beforeParse(w){ w.addEventListener('error', e => errs.push('E: ' + (e.message||e))); } });
const w = dom.window, d = w.document;
const wait = ms => new Promise(r => setTimeout(r, ms));
const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles:true, cancelable:true }));
(async () => {
  await new Promise(r => w.addEventListener('load', r, { once:true }));
  await wait(400);
  w.openTeacher(); await wait(150);
  const tabs = [...d.querySelectorAll('.tea-tab')];
  const tab = k => tabs.filter(t => t.getAttribute('data-tp') === k)[0];

  /* 字库：编辑第 3 行 */
  click(tab('lib')); await wait(250);
  let rows = d.querySelectorAll('#libTbody tr');
  console.log('字库行数=' + rows.length);
  const ed = rows[2].querySelector('[data-wedit]');
  console.log('第3行：' + rows[2].children[0].textContent + ' 编辑按钮=' + (ed ? ed.getAttribute('data-wedit') : '无'));
  click(ed); await wait(200);
  console.log('  编辑后 表单hidden=' + d.getElementById('libForm').hidden +
    ' 标题=' + d.getElementById('libFormTitle').textContent +
    ' 汉字=' + d.getElementById('fLibWord').value +
    ' 拼音=' + d.getElementById('fLibPinyin').value +
    ' 组词=' + d.getElementById('fLibWords').value);
  /* 改拼音保存 */
  d.getElementById('fLibPinyin').value = 'test-pinyin';
  click(d.getElementById('btnLibSave')); await wait(400);
  const hit = w.STATE.chars.filter(c => c.p === 'test-pinyin').length;
  console.log('  改拼音后保存：命中 ' + hit + ' 条，表单hidden=' + d.getElementById('libForm').hidden);

  /* 搜索 */
  const sq = d.getElementById('libSearch');
  sq.value = '虎'; sq.dispatchEvent(new w.Event('input', { bubbles:true }));
  await wait(320);
  console.log('  搜索「虎」→ 剩 ' + d.querySelectorAll('#libTbody tr').length + ' 行，计数=' + d.getElementById('libCount').textContent);
  sq.value = ''; sq.dispatchEvent(new w.Event('input', { bubbles:true })); await wait(320);

  /* 词库 */
  click(tab('word')); await wait(200);
  click(d.getElementById('btnWdNew')); await wait(150);
  d.getElementById('fWdWord').value = '苹果';
  d.getElementById('fWdPinyin').value = 'píng guǒ';
  d.getElementById('fWdSent').value = '我吃苹果。';
  click(d.getElementById('btnWdSave')); await wait(500);
  console.log('词库条数=' + w.STATE.words.length + ' 有苹果=' + w.STATE.words.filter(x=>x.w==='苹果').length);
  console.log('词库行数=' + d.querySelectorAll('#wdTbody tr').length);
  /* 重复词应该被拦 */
  click(d.getElementById('btnWdNew')); await wait(120);
  d.getElementById('fWdWord').value = '苹果';
  click(d.getElementById('btnWdSave')); await wait(200);
  console.log('  重复词条数=' + w.STATE.words.filter(x=>x.w==='苹果').length +
    ' 输入框红框=' + d.getElementById('fWdWord').classList.contains('field-err'));
  click(d.getElementById('btnWdCancel')); await wait(100);

  /* 学生：新增一个 */
  click(tab('stu')); await wait(200);
  click(d.getElementById('btnStuNew')); await wait(150);
  d.getElementById('fStuName').value = '测试生';
  /* 不勾题型先试一次：应该被拦下，并给字段加红框 */
  click(d.getElementById('btnStuSave')); await wait(200);
  console.log('  不勾题型：学生数=' + w.STATE.students.length +
    ' 题型区红框=' + d.getElementById('fStuTypes').classList.contains('field-err-box'));
  const cb = d.querySelector('#fStuTypes input[data-t]');
  cb.checked = true;
  click(d.getElementById('btnStuSave')); await wait(500);
  console.log('学生数=' + w.STATE.students.length + ' 有测试生=' + w.STATE.students.filter(s=>s.name==='测试生').length);
  /* 编辑刚加的 */
  const tr = [...d.querySelectorAll('#stuTbody tr')].filter(r => r.textContent.indexOf('测试生') >= 0)[0];
  if (tr) { click(tr.querySelector('[data-edit]')); await wait(200);
    console.log('  编辑学生：表单hidden=' + d.getElementById('stuForm').hidden + ' 标题=' + d.getElementById('stuFormTitle').textContent); }
  console.log('\n异常 ' + errs.length + ' 条'); errs.slice(0,5).forEach(e=>console.log('  ! '+e));
  process.exit(0);
})();
