/* 词库空表抢救探针：
   A 正常安装 → 角标版本 + 内置词数
   B 存档里字库「组词」栏被抹（老存档 / 云端整表覆写丢列）→ 重开页面应自动补回
   C 字库整张都是外来字、没有一条组词 → 词库仍要有词（用页面内置字表兜底） */
const fs = require('fs');
const { JSDOM } = require('jsdom');
const HTML = fs.readFileSync('生活语文练习台.html', 'utf8');
const wait = ms => new Promise(r => setTimeout(r, ms));

function open(lsRaw){
  const errs = [];
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.test/',
    beforeParse(w){
      if (lsRaw) w.localStorage.setItem('wb2_data_v1', lsRaw);
      w.addEventListener('error', e => errs.push('E: ' + (e.message || e)));
    }
  });
  return { dom, w: dom.window, d: dom.window.document, errs };
}
async function wordTab(o){
  o.w.openTeacher();
  await wait(150);
  const tab = [...o.d.querySelectorAll('[data-tp]')].find(t => t.getAttribute('data-tp') === 'word');
  tab.dispatchEvent(new o.w.MouseEvent('click', { bubbles: true, cancelable: true }));
  await wait(350);
}
const click = (o, el) => el.dispatchEvent(new o.w.MouseEvent('click', { bubbles: true, cancelable: true }));

(async () => {
  /* ---------- A 正常 ---------- */
  const A = open(null);
  await new Promise(r => A.w.addEventListener('load', r, { once: true }));
  await wait(400);
  await wordTab(A);
  console.log('A 正常安装：行', A.d.querySelectorAll('#wdTbody tr').length,
    '| 角标「' + A.d.getElementById('appVer').textContent + '」');
  console.log('  ', A.d.getElementById('wdCount').textContent);

  /* ---------- B 存档丢了组词 ---------- */
  const wipe = A.w.STATE.chars.map(c => Object.assign({}, c, { words: '' }));
  A.w.STATE.chars = wipe;
  A.w.saveSnap();
  const raw = A.w.localStorage.getItem('wb2_data_v1');
  console.log('B 存档现状：组词非空条数 =',
    wipe.filter(c => c.words && c.words.trim()).length, '/', wipe.length);
  A.dom.window.close();

  const B = open(raw);
  await new Promise(r => B.w.addEventListener('load', r, { once: true }));
  await wait(450);
  console.log('B 重开页面后：组词已补回条数 =',
    B.w.STATE.chars.filter(c => c.words && c.words.trim()).length,
    '| 内置词', B.w.builtinWords().list.length, '| 兜底?', B.w.builtinWords().fallback);
  await wordTab(B);
  console.log('  词库行数', B.d.querySelectorAll('#wdTbody tr').length,
    '| 角标「' + B.d.getElementById('appVer').textContent + '」');
  console.log('  计数', B.d.getElementById('wdCount').textContent);
  console.log('  首行', (B.d.querySelector('#wdTbody tr') || {}).textContent);
  B.dom.window.close();

  /* ---------- C 整张字表没有组词（外来字） ---------- */
  const C = open(null);
  await new Promise(r => C.w.addEventListener('load', r, { once: true }));
  await wait(400);
  C.w.STATE.chars = [
    { id: 'local_x1', kind: '字', w: '淼', p: 'miǎo', g: '测试', img: '', words: '', sent: '', on: true },
    { id: 'local_x2', kind: '字', w: '焱', p: 'yàn', g: '测试', img: '', words: '', sent: '', on: true }
  ];
  C.w.BUILTIN_WORDS = null; C.w.WORD_BANK = null;
  await wordTab(C);
  const bw = C.w.builtinWords();
  console.log('C 外来字表：内置词', bw.list.length, '| 兜底?', bw.fallback,
    '| 词库行数', C.d.querySelectorAll('#wdTbody tr').length);
  console.log('  计数', C.d.getElementById('wdCount').textContent);
  console.log('  角标「' + C.d.getElementById('appVer').textContent + '」');
  console.log('  拼词语题库', C.w.wordBank(true).list.length);

  /* 兜底下仍能开一局拼词语 */
  C.w.STATE.students = [{ id: 'local_s1', name: '测试', chars: ['淼', '焱'], count: 6, on: true }];
  C.w.STATE.cur = '测试';
  try {
    C.w.startQuiz('拼词语');
    console.log('  开局：组数', C.w.STATE.quiz ? C.w.STATE.quiz.groups.length : null);
  } catch (e) { console.log('  开局异常：', e.message); }

  console.log('\nJS 错误：', C.errs.length ? C.errs : '无');
  C.dom.window.close();
})();
