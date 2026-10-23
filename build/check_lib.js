/* 内置字库检查：无 SDK、空存档时，页面必须自带生活语文生字表 700 条 */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const HTML = fs.readFileSync(process.argv[2], 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); } else { fail++; console.log('  FAIL  ' + m); } };
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('\n【A】空存档 + 无 SDK：内置字库应为 700 条');
  const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.com/p/lib' });
  await wait(400);
  const w = dom.window, d = w.document;

  ok(w.CHARS.length === 700, '内置字库条数 = ' + w.CHARS.length);
  ok(w.STAGES.length === 22, '分组数 = ' + w.STAGES.length);
  ok(w.STATE.chars.length === 700, '进入页面后 STATE.chars = ' + w.STATE.chars.length);

  const gs = [];
  w.STATE.chars.forEach(c => { if (gs.indexOf(c.g) < 0) gs.push(c.g); });
  ok(gs.length === 22, '字库实际分组数 = ' + gs.length);
  ok(gs[0] === '一年级上册' && gs[gs.length - 1] === '六年级下册-认', '分组首尾正确：' + gs[0] + ' … ' + gs[gs.length - 1]);

  const first = w.STATE.chars[0];
  ok(first.w === '一' && first.p === 'yī' && first.g === '一年级上册' && first.words === '一个，一只',
    '首条记录：' + first.w + ' / ' + first.p + ' / ' + first.g + ' / ' + first.words);

  ok(w.STATE.chars.every(c => c.p), '每一条都有拼音');
  ok(w.STATE.chars.every(c => c.words), '每一条都有组词');

  /* 抽查几个跨册次的字 */
  const pick = ['一', '虎', '龙', '灯', '毛', '卜', '熊', '羊'];
  pick.forEach(ch => {
    const r = w.STATE.chars.filter(c => c.w === ch)[0];
    console.log('    抽查 ' + ch + ' → ' + (r ? (r.p + ' / ' + r.g + ' / ' + r.words) : '缺失'));
  });
  ok(pick.every(ch => w.STATE.chars.some(c => c.w === ch)), '抽查字都在表里');

  const uniq = new Set(w.STATE.chars.map(c => c.w));
  console.log('    唯一字 ' + uniq.size + ' 个（700 条含跨册重复）');
  ok(uniq.size === 561, '唯一字 = ' + uniq.size);

  /* 有图比例 */
  const withArt = w.STATE.chars.filter(c => w.ART_PACK[c.w]).length;
  console.log('    有图示 ' + withArt + ' 条 / ' + uniq.size + ' 个唯一字');
  ok(withArt > 0, '图库已接上：' + withArt + ' 条可出看图题');

  console.log('\n【B】老师端字库列表');
  w.openTeacher();
  await wait(120);
  const tabLib = d.querySelector('[data-tp="lib"]');
  ok(!!tabLib, '字库 tab 存在');
  if (tabLib) tabLib.click();
  await wait(200);
  const tb = d.getElementById('libTbody');
  ok(!!tb, '字库表存在');
  const rows = tb ? tb.querySelectorAll('tr').length : 0;
  ok(rows === 700, '字库列表行数 = ' + rows);
  const sel = d.getElementById('libFilter');
  const opts = sel ? sel.querySelectorAll('option').length : 0;
  ok(opts === 23, '分组下拉项 = ' + opts + '（全部 + 22 组）');
  ok(tb && tb.textContent.indexOf('一年级上册') >= 0, '列表里能看到「一年级上册」');

  console.log('\n【C】旧存档（97 字示例）自动换代');
  const old = [];
  for (let i = 0; i < 97; i++) old.push({ id: 'local_char_' + i, kind: '字', w: '字' + i, p: 'zi', g: '象形基础', img: '', words: '', sent: '', on: true });
  const dom4 = new JSDOM(HTML, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.com/p/lib',
    beforeParse(win) {
      win.localStorage.setItem('wb2_data_v1', JSON.stringify({ students: [], chars: old, words: [], logs: {} }));
    }
  });
  await wait(400);
  ok(dom4.window.STATE.chars.length === 700, '打开后换成 ' + dom4.window.STATE.chars.length + ' 条');
  ok(dom4.window.STATE.chars[0].w === '一', '首条变成「一」：' + dom4.window.STATE.chars[0].w);
  ok(!!dom4.window.localStorage.getItem('wb2_charset_old'), '旧表已备份到本机（wb2_charset_old）');

  console.log('\n========== 结果：' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail ? 1 : 0);
})();
