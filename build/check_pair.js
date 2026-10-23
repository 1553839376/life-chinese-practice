/* 图字配对接图库后的专项检查（jsdom） */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const HTML = fs.readFileSync(process.argv[2] || '生活语文练习台.html', 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); } else { fail++; console.log('  FAIL  ' + m); } };
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.com/p/x' });
  await wait(400);
  const w = dom.window, d = w.document;

  ok(!!w.ART_PACK && Object.keys(w.ART_PACK).length >= 100, '图库已载入：' + (w.ART_PACK ? Object.keys(w.ART_PACK).length : 0) + ' 个');

  const C = (ch, words) => ({ w: ch, p: '', words: words || '', g: '第一册', on: true, img: '' });
  const ma = C('马', '马路、小马'), bo = C('卜', '萝卜'), tou = C('头', '头发');
  const a = C('啊', '');

  ok(String(w.artOf(ma)).indexOf('<image') >= 0, '有图的字 artOf 返回内联位图');
  ok(w.artOf(bo) === '', '卜 没有图，artOf 返回空');
  ok(w.wordOf(bo) === '萝卜', '卜 取到组词：' + w.wordOf(bo));
  ok(w.canPair(ma) === true, '马 可出图字配对');
  ok(w.canPair(bo) === true, '卜 有组词，也能出图字配对（词语标红）');
  ok(w.canPair(a) === false, '既没图也没组词的字不会进图字配对');

  w.STATE.chars = [ma, C('牛', '牛奶'), C('羊', '羊毛'), C('兔', '兔子'), bo, tou, a];

  // 1) 有图：上面是图，下面是四个字
  w.STATE.quiz = { type: '图字配对', qs: [{ target: ma, opts: [ma, C('牛', ''), C('羊', ''), C('兔', '')] }], i: 0, right: 0, prompts: 0, answered: false, promptUsed: 0 };
  w.renderStage();
  let h = d.getElementById('stage').innerHTML;
  ok(h.indexOf('<image') >= 0, '看图题：题干里出现图示');
  ok(h.indexOf('word-card') < 0, '看图题：没有出现词语卡');
  ok((h.match(/class="opt /g) || []).length === 4, '四个字选项都在');

  // 2) 无图：上面是标红的词语
  w.STATE.quiz = { type: '图字配对', qs: [{ target: bo, opts: [bo, ma, tou, C('牛', '')] }], i: 0, right: 0, prompts: 0, answered: false, promptUsed: 0 };
  w.renderStage();
  h = d.getElementById('stage').innerHTML;
  ok(h.indexOf('word-card') >= 0, '词语题：题干里出现词语卡');
  ok(h.indexOf('<i>卜</i>') >= 0, '词语题：目标字单独包了红字标签');
  ok(h.indexOf('拖到下面的字上') < 0, '词语题：提示语换成「点出红颜色的字」');

  // 3) 出题时会把不能配对的字剔掉
  // v11 起学生必须带显式字表，不再回退全库
  w.STATE.students = [{ name: '测试', types: ['图字配对'], count: 6, groups: [], chars: ['马', '牛', '羊', '兔', '卜', '头', '大'], status: '', photo: '' }];
  w.STATE.cur = w.STATE.students[0];
  w.startQuiz('图字配对');
  const qz = w.STATE.quiz;
  ok(!!qz && qz.qs.length > 0, '能开始一轮：' + (qz ? qz.qs.length : 0) + ' 题');
  let bad = 0;
  for (const q of qz.qs) if (!w.canPair(q.target)) bad++;
  ok(bad === 0, '所有题目都落在有图或可标红的字上');

  // 4) 进度分母是题目总数（旧版错用选项数，永远显示 /4）
  const prog = d.querySelector('#stage .q-progress');
  ok(!!prog && prog.textContent.indexOf('/ 共 ' + qz.qs.length) >= 0, '进度显示：' + (prog ? prog.textContent.trim() : '无'));

  dom.window.close();
  console.log('\n========== 结果：' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail ? 1 : 0);
})();
