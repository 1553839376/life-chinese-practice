/* 生成「题目样例.html」：把练习页真实渲染结果抓出来，便于目检 */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const HTML = fs.readFileSync('生活语文练习台.html', 'utf8');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.com/p/x' });
  await wait(400);
  const w = dom.window, d = w.document;

  const C = (ch, words) => ({ w: ch, p: '', words: words || '', g: '第一册', on: true, img: '' });
  const cases = [
    ['看图选字', '马', C('马', '马路、小马')],
    ['看图选字', '跳', C('跳', '跳高、跳绳')],
    ['没有图 → 词语标红', '卜', C('卜', '萝卜')],
    ['没有图 → 词语标红', '头', C('头', '头发')],
    ['没有图 → 词语标红', '脸', C('脸', '洗脸')]
  ];

  const style = [...d.querySelectorAll('style')].map(s => s.outerHTML).join('\n');
  const opts = [C('马', ''), C('牛', ''), C('羊', ''), C('兔', '')];

  let blocks = '';
  for (const [kind, name, target] of cases) {
    const list = [target].concat(opts.filter(o => o.w !== target.w)).slice(0, 4);
    w.STATE.cur = { name: '小明', photo: '', types: ['图字配对'] };
    w.STATE.quiz = { type: '图字配对', qs: [{ target, opts: list }], i: 0, right: 0, prompts: 0, answered: false, promptUsed: 0 };
    w.renderStage();
    const scr = d.getElementById('scrPlay');
    scr.hidden = false;
    const body = scr.querySelector('#stage').innerHTML;
    const head = scr.querySelector('.play-top');
    blocks += '<section class="demo"><p class="dl">' + kind + ' · 目标字「' + name + '」</p>' +
      '<div class="fake">' + (head ? head.outerHTML : '') +
      '<div class="stage-wrap">' + body + '</div></div></section>\n';
    scr.hidden = true;
  }

  const html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>题目样例 · 图字配对</title>' + style +
    '<style>body{padding:26px 20px}.demo{max-width:760px;margin:0 auto 34px}' +
    '.dl{font-size:15px;font-weight:800;color:#8A8578;margin:0 0 8px}' +
    '.fake{border:2px solid #E6DCC6;border-radius:20px;background:#F7F3E8;overflow:hidden}' +
    '.stage-wrap{padding:6px 18px 26px}#stage{min-height:0}' +
    '.play-top{display:flex;align-items:center;gap:10px;padding:12px 16px;background:#FFFDF7;border-bottom:1px solid #E6DCC6}' +
    '.play-av{width:44px;height:44px;border-radius:50%;background:#185FA5;color:#fff;display:flex;' +
    'align-items:center;justify-content:center;font-weight:800;font-size:20px}' +
    '.play-name{font-weight:800;font-size:20px}.type-tab{display:none}' +
    '.q-progress{display:none}.help-bar,.q-head .q-progress{display:none}' +
    '</style></head><body>' + blocks + '</body></html>';

  fs.writeFileSync('题目样例.html', html);
  console.log('题目样例.html', (Buffer.byteLength(html) / 1024).toFixed(0), 'KB');
  dom.window.close();
})();
