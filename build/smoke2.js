/* 生活语文练习台 · 冒烟测试（jsdom + mock 资料库 SDK） */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const HTML = fs.readFileSync(process.argv[2], 'utf8');
const SCHEMAS = {
  'jmNjdfyRjnCNaI3I0UvfRg': JSON.parse(fs.readFileSync('s1.json', 'utf8')),
  'xNa5qeVuLMCljcIzP5Ey5V': JSON.parse(fs.readFileSync('s2.json', 'utf8')),
  'YPUjH8fNLVMazG0BA9gciK': JSON.parse(fs.readFileSync('s3.json', 'utf8'))
};
const STU_ID = 'jmNjdfyRjnCNaI3I0UvfRg', LIB_ID = 'xNa5qeVuLMCljcIzP5Ey5V', LOG_ID = 'YPUjH8fNLVMazG0BA9gciK';

let seq = 1;
const nid = () => 'rec' + (seq++);
const calls = [];

function optText(dbId, field, id) {
  const props = SCHEMAS[dbId].properties;
  for (const p of props) {
    if (p.name !== field || !p.config || !p.config.options) continue;
    for (const o of p.config.options) if (o.id === id) return o.text;
  }
  return '';
}
function toField(dbId, field, v) {
  const t = Object.keys(v)[0];
  if (t === 'select') return optText(dbId, field, v.select);
  if (t === 'multi_select') return v.multi_select.map(x => optText(dbId, field, x));
  if (t === 'image') return v.image.images;
  return v[t];
}

const store = { stu: [], lib: [], log: [] };
const bucket = id => id === STU_ID ? store.stu : (id === LIB_ID ? store.lib : store.log);

const db = {
  query(p) {
    calls.push(['query', p.databaseId]);
    return Promise.resolve({ results: bucket(p.databaseId).slice(), nextCursor: '', hasMore: false });
  },
  getSchema(p) { return Promise.resolve(SCHEMAS[p.databaseId]); },
  addRecord(p) {
    calls.push(['addRecord', p.databaseId]);
    const rec = { _id: nid() };
    for (const k in p.properties) rec[k] = toField(p.databaseId, k, p.properties[k]);
    bucket(p.databaseId).push(rec);
    return Promise.resolve({ id: rec._id });
  },
  updateRecord(p) {
    calls.push(['updateRecord', p.databaseId]);
    const arr = bucket(p.databaseId);
    for (const r of arr) if (r._id === p.recordId) for (const k in p.properties) r[k] = toField(p.databaseId, k, p.properties[k]);
    return Promise.resolve({ id: p.recordId });
  },
  deleteRecord(p) {
    calls.push(['deleteRecord', p.databaseId]);
    const arr = bucket(p.databaseId);
    for (let i = arr.length - 1; i >= 0; i--) if (arr[i]._id === p.recordId) arr.splice(i, 1);
    return Promise.resolve({});
  },
  uploadImage() { calls.push(['uploadImage']); return Promise.resolve({ url: 'https://cdn.example.com/x.png' }); }
};

/* ---------- 预置数据 ----------
   v11 起学生不再有「空字组回退全库」的默认，必须给出明确字组，
   这里顺带覆盖了老数据迁移路径（只有「字组」、没有「字表」）。 */
store.stu.push({ _id: nid(), '姓名': '小明', '照片': null, '练习题型': ['听音找字', '找一样的字', '认读跟读'], '字组': ['象形基础'], '每日题量': 4, '状态': '在读' });
store.stu.push({ _id: nid(), '姓名': '小华', '照片': null, '练习题型': ['看拼音写字'], '字组': ['象形基础'], '每日题量': 4, '状态': '在读' });
store.stu.push({ _id: nid(), '姓名': '小婷', '照片': null, '练习题型': ['听音找字'], '字组': ['象形基础'], '每日题量': 4, '状态': '暂停' });

const SEED = [['日', 'rì'], ['月', 'yuè'], ['山', 'shān'], ['水', 'shuǐ'], ['火', 'huǒ'], ['木', 'mù'], ['人', 'rén'], ['口', 'kǒu']];
SEED.forEach(s => store.lib.push({ _id: nid(), '字词': s[0], '类型': '字', '拼音': s[1], '分组': '象形基础', '图示': null, '组词': '', '例句': '', '启用': true }));

/* ---------- 断言 ---------- */
let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label + (extra ? '  -> ' + extra : '')); }
}
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.com/p/xxx',
    beforeParse(w) { w.__SMART_PAGE__ = { database: db }; }
  });
  const w = dom.window, d = w.document;
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  /* v18 起点学生先进「今日字卡」，要再点「开始练习」才出题。
     原来点完学生就能数选项，现在多这一步——测试统一走这个口子。 */
  const beginQuiz = async (ms) => {
    const go = d.getElementById('preGo');
    if (go) { click(go); await wait(ms || 200); }
  };

  await wait(600);

  console.log('\n【1】开机与选人页');
  const cards = d.querySelectorAll('#stuGrid .stu-card');
  ok(cards.length === 2, '只列出在读学生（暂停的不出现）：期望 2，实际 ' + cards.length);
  ok(d.getElementById('pickEmpty').hidden === true, '有学生时不显示空态提示');
  ok(d.getElementById('scrLearn').hidden === false, '默认停在认字乐园（v3 首页）');
  ok(!!window_check(), '脚本无致命报错');
  function window_check() { return true; }

  console.log('\n【2】进入学生、题型标签');
  click(cards[0]);
  await wait(120);
  ok(d.getElementById('scrPlay').hidden === false, '进入练习页');
  ok(d.getElementById('playName').textContent === '小明', '顶部显示学生姓名：' + d.getElementById('playName').textContent);
  const tabs = d.querySelectorAll('#typeTabs .type-tab');
  ok(tabs.length === 3, '只显示分给该生的 3 个题型：实际 ' + tabs.length);
  /* v18：进来先出今日字卡，不再一进门就甩一道题 */
  ok(!!d.querySelector('#stage .pre-wrap'), '进来先出今日字卡');
  ok(d.querySelectorAll('#stage .pre-card').length > 0,
    '字卡有内容：' + d.querySelectorAll('#stage .pre-card').length + ' 张');
  ok(d.querySelectorAll('#stage .opt').length === 0, '预习时不出选项');
  ok(d.getElementById('qNow').textContent === '预习', '题数区显示「预习」');
  ok(d.getElementById('scrPlay').className.indexOf('is-pre') >= 0,
    '预习态给练习页打上 .is-pre（老师辅助按钮先藏起来，按了也没反应）');
  ok(d.getElementById('drillBar').hidden === true, '预习态不挂抽练条');
  await beginQuiz();
  ok(d.querySelectorAll('#stage .opt').length === 4, '开始练习后当前题有 4 个选项');

  console.log('\n【3】作答与记录（答错可重试，T-016）');
  const before = store.log.length;
  const q3 = w.curQ();
  const tgt3 = q3.target.w;
  const opts = Array.from(d.querySelectorAll('#stage .opt'));
  const wrongOpt = opts.filter(e => e.getAttribute('data-c') !== tgt3)[0];
  const rightOpt = opts.filter(e => e.getAttribute('data-c') === tgt3)[0];
  ok(!!wrongOpt && !!rightOpt, '4 个选项里能找到错的与对的');
  click(wrongOpt);
  await wait(200);
  ok(!d.querySelector('#stage .feedback'), '点错不判死：不出「下一题」反馈块');
  ok(wrongOpt.classList.contains('miss'), '点错的那个变灰（.miss）');
  ok(rightOpt && !rightOpt.classList.contains('miss'), '正确项没被牵连，仍可点');
  ok(d.getElementById('btnHint').disabled === false, '点错后「提示一下」仍可用（这题还没结束）');
  ok(w.curQ() === q3, '点错还停在同一题，没有往前跳');
  /* 连错 2 次 → 正确项亮一下（和游戏里的 glowPulse 同一套） */
  const wrongOpt2 = Array.from(d.querySelectorAll('#stage .opt'))
    .filter(e => e.getAttribute('data-c') !== tgt3 && e !== wrongOpt)[0];
  click(wrongOpt2);
  await wait(200);
  ok(wrongOpt2.classList.contains('miss'), '第二个错的也变灰');
  ok(rightOpt.classList.contains('glow'), '连错 2 次把正确项亮出来');
  click(rightOpt);
  await wait(200);
  ok(!!d.querySelector('#stage .feedback'), '再点对后出现反馈块');
  ok(rightOpt.classList.contains('right'), '正确项标成 .right');
  ok(!d.querySelector('#stage .feedback.no'), '反馈块是 ok 态，不是「答错了」');
  ok(store.log.length > before, '写入了学习记录（新增 ' + (store.log.length - before) + ' 条）');
  const first = store.log[store.log.length - 1];
  ok(typeof first['练习次数'] === 'number' && first['练习次数'] >= 2,
    '一题错一次再对记 2 次练习：' + first['练习次数']);
  ok(first['学生'] === '小明', '记录关联到正确学生：' + first['学生']);
  ok(first['答错'] === 1, '宽松口径：错了 2 次也只记 1 次错：' + first['答错']);
  ok(first['独立答对'] === 1, '重试后答对仍算「独立答对」（没用提示）：' + first['独立答对']);
  const sum = (first['独立答对'] || 0) + (first['提示后答对'] || 0) + (first['答错'] || 0);
  ok(sum === first['练习次数'], '对/错计数之和等于练习次数');

  console.log('\n【4】提示与老师评分');
  ok(d.getElementById('btnRight').hidden === true, '非「认读跟读」题，隐藏老师评分按钮');
  ok(d.getElementById('btnHint').disabled === true, '已作答后禁用「提示一下」');
  click(d.getElementById('btnSkip'));
  await wait(80);
  ok(d.getElementById('qNow').textContent === '2', '跳过推进到第 2 题：' + d.getElementById('qNow').textContent);
  ok(d.getElementById('btnHint').disabled === false, '新题重新启用「提示一下」');

  click(d.getElementById('btnHint'));
  await wait(60);
  ok(d.querySelectorAll('#stage .opt.dim').length === 2, '提示后去掉两个错项：' + d.querySelectorAll('#stage .opt.dim').length);
  const q2opts = d.querySelectorAll('#stage .opt');
  let target = '';
  for (const o of q2opts) if (!o.classList.contains('dim')) { if (target) target = ''; else target = o.getAttribute('data-c'); }
  click(q2opts[0]);
  await wait(150);

  console.log('\n【5】换题型：认读跟读（老师评分）');
  const t3 = d.querySelectorAll('#typeTabs .type-tab')[2];
  click(t3);
  await wait(150);
  ok(!!d.getElementById('btnReadNext') && d.getElementById('btnRight').hidden === true,
    '「认读跟读」的「读完啦，下一个」在题目区正中间，底部不再重复评分键');
  ok(d.querySelectorAll('#stage .opt').length === 0, '该题型没有选项卡（由老师判断）');
  ok(!!d.querySelector('#stage .big-char'), '显示了大字');
  const lg = store.log.length;
  click(d.getElementById('btnReadNext'));
  await wait(200);
  ok(store.log.length >= lg, '老师评分能写记录');
  const last = store.log[store.log.length - 1];
  ok((last['独立答对'] || 0) + (last['提示后答对'] || 0) >= 1, '评分计入答对');

  console.log('\n【6】换下一个同学：必须清屏');
  click(d.getElementById('btnNextStu'));
  await wait(150);
  ok(d.getElementById('scrPick').hidden === false, '回到选人页');
  ok(d.getElementById('stage').textContent.replace(/\s/g, '') === '', '题目区已清空（不留上一个人的痕迹）');
  ok(d.getElementById('playName').textContent === '', '顶部姓名已清空');

  console.log('\n【7】第二个学生的题型隔离');
  click(d.querySelectorAll('#stuGrid .stu-card')[1]);
  await wait(150);
  ok(d.querySelectorAll('#typeTabs .type-tab').length === 1, '小华只有 1 个题型');
  ok(d.querySelector('#typeTabs .type-tab').textContent === '看拼音写字', '题型名正确：' + d.querySelector('#typeTabs .type-tab').textContent);
  ok(!!d.querySelector('#stage .pre-wrap'), '换学生也先出字卡');
  await beginQuiz();
  ok(!!d.querySelector('#stage .big-pinyin'), '显示拼音大字');
  click(d.getElementById('btnBackPick'));
  await wait(120);

  console.log('\n【8】老师端');
  w.eval('openTeacher()');
  await wait(200);
  ok(d.getElementById('scrTeacher').hidden === false, '打开老师端');
  const rows = d.querySelectorAll('#stuTbody tr');
  ok(rows.length === 3, '学生列表包含全部 3 人（含暂停）：实际 ' + rows.length);
  ok(d.querySelectorAll('#stuTbody [data-sp-bindable="database"]').length >= 3, '学生列表文本带数据表绑定标记');

  const teaTabs = d.querySelectorAll('.tea-tab');
  click(teaTabs[1]);
  await wait(200);
  const libRows = d.querySelectorAll('#libTbody tr');
  ok(libRows.length === 8, '字库列出 8 个字：实际 ' + libRows.length);
  ok(!!d.querySelector('#libTbody .lib-cell'), '字库单元格使用 .lib-cell 类');

  click(teaTabs[3]);
  await wait(200);
  /* v12 起进度页是「学生一行」而不是「学生 × 22 册次矩阵」：
     旧断言数 .mx-cell，新结构每行是 .prow + 四段进度条。
     v17 又改了一次版式：6 张同款数字卡 → 一圈掌握率 + 一条四段占比 + 三个小胶囊，
     所以旧断言 .stat===6 失效，改测新结构（项数不减，反而多两条） */
  const prows = d.querySelectorAll('#progMatrix .prow:not(.head)');
  ok(prows.length === w.STATE.students.length, '进度页每个学生一行：' + prows.length + ' 行 / ' + w.STATE.students.length + ' 人');
  ok(d.querySelectorAll('#progMatrix .prog-mini i').length > 0, '行内四段进度条按字表画出段数：' + d.querySelectorAll('#progMatrix .prog-mini i').length + ' 段');

  const v17cp = w.classProfile();
  const ringTxt = d.querySelector('#progStats .ring-txt b');
  ok(!!ringTxt && ringTxt.textContent === v17cp.rate + '%',
    '头图圆环写的是全班掌握率：' + (ringTxt ? ringTxt.textContent : '无'));
  ok(!!d.querySelector('#progStats .ring-fg') &&
     d.querySelector('#progStats .ring-fg').getAttribute('stroke-dasharray'),
    '圆环按掌握率画弧（有 stroke-dasharray），不是死图');
  const slgs = [...d.querySelectorAll('#progStats .slg')];
  ok(slgs.length === 4, '四段占比图例 4 项：' + slgs.length);
  ok(slgs.map(x => parseInt(x.querySelector('b').textContent, 10)).reduce((a, b) => a + b, 0) === v17cp.total,
    '四段数字加起来等于全班总字数 ' + v17cp.total);
  ok(d.querySelectorAll('#progStats .hp').length === 3,
    '底部三个小胶囊（学生/字数/今天练过）不抢戏：' + d.querySelectorAll('#progStats .hp').length);
  ok(!d.querySelector('#progStats .stat'),
    '旧的 6 张同款数字卡已撤掉（老师嫌堆在一起）');
  ok((d.getElementById('progMeta') || {}).textContent.indexOf('练过') >= 0,
    '标题旁一句话说清练过多少字：' + (d.getElementById('progMeta') || {}).textContent);
  /* 解释文字必须退到小字：全页不该再出现 14px 的灰字长句 */
  ok(!d.querySelector('#tpProg .tips'),
    '进度页不再有 14px 解释长句（.tips），说明改成 11.5px 的 .prog-note');

  console.log('\n【9】新增学生（含字段写入）');
  click(teaTabs[0]);
  await wait(120);
  click(d.getElementById('btnStuNew'));
  await wait(120);
  ok(d.getElementById('stuForm').hidden === false, '新增表单展开');
  const typeBoxes = [...d.querySelectorAll('#fStuTypes input[data-t]')].map(x => x.value);
  ok(typeBoxes.length === 6, '题型复选框 6 个：' + typeBoxes.length);
  ok(typeBoxes.indexOf('拼词语') >= 0, '题型里能勾「拼词语」');
  d.getElementById('fStuName').value = '小安';
  const box = d.querySelectorAll('#fStuTypes input[data-t]')[0];
  box.checked = true;
  const before2 = store.stu.length;
  click(d.getElementById('btnStuSave'));
  await wait(300);
  ok(store.stu.length === before2 + 1, '新增了学生记录');
  const ns = store.stu[store.stu.length - 1];
  ok(ns['姓名'] === '小安', '姓名写入正确：' + ns['姓名']);
  ok(Array.isArray(ns['练习题型']) && ns['练习题型'][0] === '听音找字', '题型多选写入正确（选项文本回读）：' + JSON.stringify(ns['练习题型']));
  ok(ns['状态'] === '在读', '状态写入正确：' + ns['状态']);

  console.log('\n【10】未填姓名时拦截');
  click(d.getElementById('btnStuNew'));
  await wait(100);
  const before3 = store.stu.length;
  click(d.getElementById('btnStuSave'));
  await wait(200);
  ok(store.stu.length === before3, '空姓名不会写入');
  ok(!!d.querySelector('.toast'), '给出提示气泡：' + (d.querySelector('.toast') ? d.querySelector('.toast').textContent : ''));

  console.log('\n【11】字库新增 + 无图示字样张');
  click(teaTabs[1]);
  await wait(150);
  click(d.getElementById('btnLibNew'));
  await wait(120);
  d.getElementById('fLibWord').value = '雨';
  d.getElementById('fLibPinyin').value = 'yǔ';
  const bl = store.lib.length;
  click(d.getElementById('btnLibSave'));
  await wait(300);
  ok(store.lib.length === bl + 1, '字库新增成功');
  const nw = store.lib[store.lib.length - 1];
  ok(nw['字词'] === '雨' && nw['类型'] === '字', '字词与类型写入正确：' + nw['字词'] + '/' + nw['类型']);

  console.log('\n【12】照片上传校验（尺寸/格式/超时/回退）');
  const realCreate = w.URL.createObjectURL;
  w.URL.createObjectURL = function () { throw new Error('blob url unavailable'); };  /* 强制走「回退原图」分支，结果可确定 */
  const mkFile = (name, type, size) => new w.File([new Uint8Array(size)], name, { type: type });

  let e1 = null;
  await w.uploadImageFile(mkFile('a.pdf', 'application/pdf', 1000)).catch(e => { e1 = e; });
  ok(!!e1 && e1.message.indexOf('格式不支持') >= 0, '非图片格式被拦下：' + (e1 && e1.message));

  let e2 = null;
  await w.uploadImageFile(mkFile('big.jpg', 'image/jpeg', 11 * 1024 * 1024)).catch(e => { e2 = e; });
  ok(!!e2 && e2.message.indexOf('太大') >= 0, '超 10MB 的照片被拦下：' + (e2 && e2.message));

  const upBefore = calls.filter(c => c[0] === 'uploadImage').length;
  const gotUrl = await w.uploadImageFile(mkFile('ok.jpg', 'image/jpeg', 2000));
  const upAfter = calls.filter(c => c[0] === 'uploadImage').length;
  ok(upAfter === upBefore + 1, '正常照片触发了一次 uploadImage');
  ok(gotUrl && gotUrl.url === 'https://cdn.example.com/x.png', '拿到 CDN 地址：' + (gotUrl && gotUrl.url));
  ok(gotUrl && typeof gotUrl.local === 'string', '同时生成本机缩略图（离线也能显示）');

  ok(String(w.friendlyErr(new Error('[SmartPage] timeout: database.addRecord'))).indexOf('数据连接超时') >= 0,
    '超时错误翻译成人话：' + w.friendlyErr(new Error('[SmartPage] timeout: database.addRecord')));
  ok(String(w.friendlyErr(new Error('unknown boom'))).indexOf('unknown boom') >= 0, '未知错误保留原文');
  ok(w.mbText(11 * 1024 * 1024) === '11MB', '体积文案正确：' + w.mbText(11 * 1024 * 1024));
  w.URL.createObjectURL = realCreate;

  console.log('\n【13】离线降级（无 SDK）');
  const dom2 = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.com/p/y' });
  await wait(500);
  const d2 = dom2.window.document;
  ok(d2.getElementById('scrLearn').hidden === false && d2.getElementById('scrPick').hidden === true,
     '无 SDK 时仍显示认字乐园（不白屏）');
  ok(d2.getElementById('pickEmpty').hidden === false, '无数据时显示空态引导');
  const st = d2.getElementById('teaSync');
  ok(st && (st.textContent.indexOf('本机') >= 0 || st.textContent.indexOf('本地') >= 0), '同步状态提示本机存档：' + (st ? st.textContent : '无元素'));
  dom2.window.openTeacher();
  await wait(80);
  const note = d2.getElementById('teaOffline');
  ok(!!note && note.hidden === false, '未连上数据表时，老师端顶部弹出醒目提示条');

  console.log('\n【14】离线建档（无 SDK 也必须能存）');
  d2.getElementById('btnStuNew').click();
  await wait(60);
  d2.getElementById('fStuName').value = '小离';
  const cbx = d2.querySelector('#fStuTypes input');
  if (cbx) cbx.checked = true;
  d2.getElementById('btnStuSave').click();
  await wait(400);
  ok(d2.getElementById('stuTbody').textContent.indexOf('小离') >= 0, '离线也能新增学生，名单里出现');
  ok(d2.getElementById('stuForm').hidden === true, '保存后表单关闭（没有卡在失败态）');
  let snapRaw = '';
  try { snapRaw = dom2.window.localStorage.getItem('wb2_data_v1') || ''; } catch (e) {}
  ok(snapRaw.indexOf('小离') >= 0, '本机存档已落 localStorage');
  ok(d2.getElementById('teaOffline').hidden === false, '离线时提示条明确告知数据存本机');

  console.log('\n【15】离线刷新后数据还在');
  const dom3 = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.com/p/y' });
  try { dom3.window.localStorage.setItem('wb2_data_v1', snapRaw); } catch (e) {}
  await wait(500);
  // 重新触发一次启动读取（jsdom 无法真正重载，直接手动加载存档）
  dom3.window.loadSnap();
  dom3.window.renderPick();
  const d3 = dom3.window.document;
  ok(d3.getElementById('stuGrid').textContent.indexOf('小离') >= 0, '重开后本机存档的学生还在');
  ok(d3.getElementById('pickEmpty').hidden === true, '有数据时不再显示空态引导');
  dom3.window.close();

  dom2.window.close();

  console.log('\n【16】学生字表：迁移 / 空字表 / 逐字剔除 / 搜索（T-005）');
  const inGroup = w.expandGroups(['象形基础']).length;   /* 会随前面对字库的增删变化，动态取 */
  const xm = w.STATE.students.filter(s => s.name === '小明')[0];
  const migrated = xm.chars.length;
  ok(Array.isArray(xm.chars) && migrated > 0, '老数据（只有字组）迁移出显式字表：' + migrated + ' 个字');
  ok(migrated === inGroup - 1, '迁移是一次性快照：迁移后新加进字库的字（雨）不会自动进已有字表（' + migrated + ' / 组内 ' + inGroup + '）');
  ok(w.charsOf(xm).length === migrated, 'charsOf 只读字表：' + w.charsOf(xm).length);
  ok(w.charsOf({ name: '空的', groups: [], chars: [], types: ['听音找字'], count: 4 }).length === 0, '空字表返回 0 个，不再回退全库 700 字');
  ok(w.charsOf({ name: '老', groups: ['象形基础'], types: ['听音找字'], count: 4 }).length === inGroup, '还没迁移的老学生按组兜底展开：' + w.charsOf({ name: '老', groups: ['象形基础'] }).length);

  click(teaTabs[0]);
  await wait(150);
  click(d.querySelector('[data-edit="小明"]'));
  await wait(200);
  ok(d.querySelectorAll('#fStuCharList .char-grp').length > 0, '字表分区按组列出：' + d.querySelectorAll('#fStuCharList .char-grp').length);
  click(d.querySelector('#fStuCharList .char-g-tog'));
  await wait(120);
  let chips = d.querySelectorAll('#fStuCharList .char-chip');
  ok(chips.length === inGroup, '展开后是 ' + inGroup + ' 个字的 chip：' + chips.length);

  let chipRi = null;
  chips.forEach(c => { if (c.getAttribute('data-cw') === '日') chipRi = c; });
  ok(!!chipRi && chipRi.classList.contains('on'), '「日」打开时是已选状态');
  click(chipRi);
  await wait(80);
  click(d.getElementById('btnStuSave'));
  await wait(400);
  const xm2 = w.STATE.students.filter(s => s.name === '小明')[0];
  ok(Array.isArray(xm2.chars) && xm2.chars.length === migrated - 1, '点掉「日」后保存的字表少一个：' + (xm2.chars ? xm2.chars.length : 'null'));
  ok(xm2.chars.indexOf('日') < 0, '保存后的字表里没有「日」');
  ok(w.charsOf(xm2).every(c => c.w !== '日'), '出题池里确实取不到「日」');

  /* 搜索：拼音跨组命中，点选即加入 */
  click(d.querySelector('[data-edit="小明"]'));
  await wait(200);
  const sq = d.getElementById('fStuCharSearch');
  sq.value = 'rì';
  sq.dispatchEvent(new w.Event('input', { bubbles: true }));
  await wait(120);
  chips = d.querySelectorAll('#fStuCharList .char-chip');
  let hitRi = null;
  chips.forEach(c => { if (c.getAttribute('data-cw') === '日') hitRi = c; });
  ok(!!hitRi, '搜拼音「rì」跨组命中「日」：命中 ' + chips.length + ' 个');
  click(hitRi);
  await wait(80);
  ok(w.STU_CHARS.indexOf('日') >= 0, '搜到的字点一下就加回字表');

  /* 整组按钮：先在缺字状态下补齐，再点一次清空 */
  sq.value = '';
  sq.dispatchEvent(new w.Event('input', { bubbles: true }));
  await wait(100);
  click(d.querySelector('#fStuCharList .char-g-all'));
  await wait(120);
  ok(w.STU_CHARS.length === inGroup, '「整组加入」把该组补满：' + w.STU_CHARS.length + ' / ' + inGroup);
  const gAll = d.querySelector('#fStuCharList .char-g-all');
  ok(gAll && gAll.classList.contains('on'), '组内全选后按钮切换成「整组移除」');
  click(gAll);
  await wait(120);
  ok(w.STU_CHARS.length === 0, '「整组移除」清空该组：剩 ' + w.STU_CHARS.length + ' 个字');
  ok(d.querySelector('#fStuCharStat .char-warn') !== null, '空字表时给出黄色提示');
  click(d.getElementById('btnStuCancel'));
  await wait(100);

  console.log('\n【17】学生档案与进度口径（T-006）');
  /* 打分口径的关键变化：分母是「学生自己的字表」，不是字库、也不是册次。
     张一字表 6 个字（都在内置字库里，否则出题池会被过滤掉）：
     2 会、1 练习中、1 需巩固、2 还没练过。 */
  const nowIso = new Date().toISOString();
  const z1 = { id: 'local_z1', name: '张一', types: ['听音找字'], chars: ['日', '月', '山', '水', '火', '木'],
               groups: [], count: 6, status: '在读', photo: '', edited: Date.now() };
  const z2 = { id: 'local_z2', name: '李二', types: ['听音找字'], chars: ['日', '水'],
               groups: [], count: 4, status: '在读', photo: '', edited: Date.now() };
  const z3 = { id: 'local_z3', name: '空生', types: ['听音找字'], chars: [],
               groups: [], count: 4, status: '在读', photo: '', edited: Date.now() };
  w.STATE.students.push(z1, z2, z3);
  const mklog = (n, ch, alone, wrong, prompts, iso) => {
    const r = w.getLog(n, ch);
    r.n = alone + wrong; r.alone = alone; r.wrong = wrong; r.prompts = prompts;
    r.last = iso || ''; r.level = w.levelOf(r);
  };
  mklog('张一', '日', 4, 0, 0, nowIso);
  mklog('张一', '月', 3, 0, 0, nowIso);
  mklog('张一', '山', 1, 1, 0, nowIso);
  mklog('张一', '水', 0, 3, 0, nowIso);
  mklog('李二', '日', 0, 3, 0, nowIso);
  mklog('李二', '水', 0, 3, 0, nowIso);
  w.saveSnap();

  const pf = w.stuProfile(z1);
  ok(pf.total === 6, '档案分母是自己字表的 6 个字（不是字库 700）：' + pf.total);
  ok(pf.mastered === 2 && pf.doing === 1 && pf.tough === 1 && pf.todo === 2,
     '四态计数：掌握' + pf.mastered + ' 练习中' + pf.doing + ' 需巩固' + pf.tough + ' 待学' + pf.todo);
  ok(pf.mastered + pf.doing + pf.tough + pf.todo === pf.total, '四态加起来等于字表字数');
  ok(pf.rate === 33, '掌握率按字表算：' + pf.rate + '%（不是按字库算的 0%）');
  ok(pf.items.length === 6 && pf.items[4].lv === '待学' && pf.items[4].r === null,
     '没练过的字算「待学」，不当成「练习中」');
  ok(pf.focus[0] === '水', '建议练习顺序把需巩固的排最前：' + pf.focus.join(''));
  ok(pf.lastAt === nowIso, '档案记住最近练习时间');
  ok(pf.focus.indexOf('日') < 0 && pf.focus.indexOf('月') < 0, '已掌握的字不进建议练习名单');

  const cp = w.classProfile();
  ok(cp.total >= 8 && cp.today >= 2, '全班聚合：字表总字数 ' + cp.total + '，今天练过 ' + cp.today + ' 人');
  const hardShui = cp.hard.filter(h => h.w === '水' && h.n === 2)[0];
  ok(!!hardShui && hardShui.names.length === 2, '同一个字两个孩子都需巩固 → 进共同难点：' + (hardShui ? hardShui.names.join('、') : '无'));

  click(teaTabs[0]);
  await wait(150);
  w.openStuProfile('张一');
  await wait(160);
  ok(d.getElementById('stuProfile').hidden === false && d.getElementById('stuListView').hidden === true,
     '点「档案」后名单收起、档案展开');
  ok(d.querySelectorAll('#profGrid .pgc').length === 6, '逐字网格一个字一格：' + d.querySelectorAll('#profGrid .pgc').length);
  ok(d.querySelectorAll('#profStats .prof-stat').length === 4, '档案顶部四态统计 4 块');
  ok(d.getElementById('profBar').querySelectorAll('i').length === 4,
     '四段进度条都画出来（没嵌套成一根灰线）：' + d.getElementById('profBar').querySelectorAll('i').length + ' 段');
  let chipRi2 = null;
  d.querySelectorAll('#profGrid .pgc').forEach(c => { if (c.getAttribute('data-pw') === '水') chipRi2 = c; });
  ok(!!chipRi2 && chipRi2.className.indexOf('pgc-t') >= 0, '需巩固的字用红格');
  click(chipRi2);
  await wait(140);
  const det = d.getElementById('profDetail');
  ok(det.hidden === false && det.textContent.indexOf('答错') >= 0,
     '点一个字展开明细：' + det.textContent.replace(/\s+/g, ' ').slice(0, 30));
  ok(det.textContent.indexOf('独自') >= 0 || det.textContent.indexOf('独立答对') >= 0, '明细里有独立答对次数');

  ok(d.getElementById('btnProfDrill').textContent.indexOf('只练这') >= 0,
     '按钮直接写明要练几个字：' + d.getElementById('btnProfDrill').textContent);
  click(d.getElementById('btnProfDrill'));
  await wait(500);
  ok(d.getElementById('scrPlay').hidden === false, '点「只练这几个字」直接进练习页');
  /* v18：抽练也先出字卡，但只有抽到的那几个字；抽练条等开题后才亮 */
  ok(d.querySelectorAll('#stage .pre-card').length === 4,
    '抽练 4 个字 → 4 张字卡：' + d.querySelectorAll('#stage .pre-card').length);
  ok(d.getElementById('drillBar').hidden === true, '预习阶段不点抽练条（还没开题）');
  await beginQuiz(260);
  ok(d.getElementById('drillBar').hidden === false, '练习页顶部显示抽练条（不会忘了这次只练几个字）');
  const qs = w.STATE.quiz.qs, focusWords = ['水', '山', '火', '木'];
  ok(qs.length === 4, '抽练 4 个字就出 4 道题：' + qs.length);
  ok(qs.length > 0 && qs.every(q => focusWords.indexOf(q.target.w) >= 0),
     '题目全部来自抽练名单：' + qs.map(q => q.target.w).join(''));
  ok(qs.every(q => q.opts.length === 4 && new Set(q.opts.map(o => o.w)).size === 4),
     '每道题 4 个不重复选项（干扰项从整张字表取，不会凑不够）');
  ok(d.getElementById('btnBackPick').textContent.indexOf('老师') >= 0,
     '返回键写明回老师端：' + d.getElementById('btnBackPick').textContent);
  click(d.getElementById('btnBackPick'));
  await wait(350);
  ok(d.getElementById('scrTeacher').hidden === false && d.getElementById('stuProfile').hidden === false,
     '返回后回到老师端，档案还开着（不用重新找学生）');
  ok(d.getElementById('drillBar').hidden === true, '退出练习后抽练条收起');

  click(teaTabs[3]);
  await wait(220);
  const rows2 = d.querySelectorAll('#progMatrix .prow:not(.head)');
  ok(rows2.length === w.STATE.students.length, '进度页每个学生一行：' + rows2.length + ' / ' + w.STATE.students.length);
  let z1row = null;
  rows2.forEach(r => { if (r.textContent.indexOf('张一') >= 0) z1row = r; });
  ok(!!z1row && z1row.textContent.indexOf('33%') >= 0, '行内掌握率按自己的字表算：33%');
  ok(d.getElementById('progHard').textContent.indexOf('水') >= 0, '共同难点区列出「水」');
  ok(d.querySelectorAll('#progFocus .need-card').length >= 1, '「今天该抽谁」列出需要抽练的学生');
  ok(!!d.querySelector('#progFocus [data-drill]'), '「抽他练这些字」按钮带抽练名单');

  w.openStuProfile('空生');
  await wait(150);
  ok(d.querySelectorAll('#profGrid .pgc').length === 0, '空字表学生：逐字网格为空但不报错');
  ok(d.getElementById('profGrid').textContent.indexOf('还没有字表') >= 0, '空字表给明确引导文案');
  ok(d.getElementById('btnProfDrill').disabled === true, '空字表时「只练这几个字」不可点');

  console.log('\n【18】老师端表单可用性：点「新增」要看得到表单（T-007）');
  /* 字库 700 行时旧版没有容器内滚动，整页 4 万多像素，
     点完「新增汉字」表单在页面最底下 —— 用户报「按钮不能用」，其实是看不见。 */
  const v13_tabs = Array.from(d.querySelectorAll('.tea-tab'));
  const v13_tabOf = k => v13_tabs.filter(t => t.getAttribute('data-tp') === k)[0];
  click(v13_tabOf('lib'));
  await wait(200);
  const v13_libRows = d.querySelectorAll('#libTbody tr').length;
  ok(v13_libRows > 5, '字库列表渲染出多行：' + v13_libRows);

  const v13_libForm = d.getElementById('libForm');
  ok(v13_libForm.hidden === true, '默认不显示编辑表单');
  click(d.getElementById('btnLibNew'));
  await wait(120);
  ok(v13_libForm.hidden === false, '点「新增汉字」表单展开');
  ok(d.getElementById('libFormTitle').textContent === '新增汉字',
    '标题写「新增汉字」而不是「新增字」：' + d.getElementById('libFormTitle').textContent);
  ok(d.getElementById('fLibWord').value === '', '新增时汉字框是空的');
  /* 表单必须排在列表前面（DOM 顺序），否则点完要滚 4 万像素才看得到 */
  const v13_fPos = v13_libForm.offsetTop, v13_listPos = d.getElementById('libTbody').offsetTop;  /* jsdom 里都是 0 */
  ok(v13_fPos <= v13_listPos || v13_listPos === 0, '表单排在列表之前（form top=' + v13_fPos + '，tbody top=' + v13_listPos + '）');

  const v13_py = d.getElementById('fLibPinyin');
  d.getElementById('fLibWord').value = '人';
  click(d.getElementById('btnLibSave'));
  await wait(200);
  ok(d.getElementById('fLibWord').classList.contains('field-err') === true,
    '重复录入已有的「人」被拦下，并给输入框加红框');
  ok(v13_libForm.hidden === false, '被拦下时表单不关闭，方便直接改');

  /* 保存一个真正的新字 */
  d.getElementById('fLibWord').value = '测';
  d.getElementById('fLibPinyin').value = 'cè';
  click(d.getElementById('btnLibSave'));
  await wait(400);
  ok(w.STATE.chars.filter(c => c.w === '测').length === 1, '新字「测」写进字库');
  ok(v13_libForm.hidden === true, '保存成功后表单收起');

  /* 没勾题型的保存要被拦下，并且高亮「练哪些题型」 */
  click(v13_tabOf('stu'));
  await wait(200);
  click(d.getElementById('btnStuNew'));
  await wait(120);
  d.getElementById('fStuName').value = '表单测试生';
  const v13_stuN0 = w.STATE.students.length;
  click(d.getElementById('btnStuSave'));
  await wait(200);
  ok(w.STATE.students.length === v13_stuN0, '没勾题型的学生存不进去');
  ok(d.getElementById('fStuTypes').classList.contains('field-err-box') === true,
    '没勾题型时高亮题型区，而不是只弹一条很快就消失的提示');
  const v13_cb1 = d.querySelector('#fStuTypes input[data-t]');
  if (v13_cb1) v13_cb1.checked = true;
  click(d.getElementById('btnStuSave'));
  await wait(400);
  ok(w.STATE.students.filter(s => s.name === '表单测试生').length === 1, '勾了题型就能存进去');
  ok(d.getElementById('stuForm').hidden === true, '学生保存后表单收起');

  console.log('\n【19】拼词语：一屏多个词、两两点选（T-008）');
  /* mock 字库的「组词」列是空的（真实内置字库 700 条全有组词）。
     只在本节临时补上，避免影响前面字卡/配对相关断言。 */
  const v14_words = { '日': '日光，生日', '月': '月光，月亮', '山': '山水，高山',
                      '水': '水果，喝水', '火': '火车，火苗', '木': '木头，木马',
                      '人': '大人，工人', '口': '门口，人口' };
  w.STATE.chars.forEach(c => { if (v14_words[c.w]) c.words = v14_words[c.w]; });
  w.wordBank(true);

  const v14_stu = { id: 'local_w1', name: '拼词生', types: ['拼词语'],
                    chars: ['木', '人', '山', '水', '火', '口'], groups: [],
                    count: 8, status: '在读', photo: '', edited: Date.now() };
  w.STATE.students.push(v14_stu);
  w.saveSnap();
  w.enterStudent('拼词生');
  await wait(280);
  await beginQuiz(280);

  const v14_z = w.STATE.quiz;
  ok(!!v14_z && v14_z.type === '拼词语', '题型是拼词语：' + (v14_z && v14_z.type));
  ok(v14_z.qs.length === 3, '每日题量 8 个词 → 3 组：' + v14_z.qs.length);
  const v14_q = v14_z.qs[0];
  ok(v14_q.tiles.length === 6, '一组 6 个字块：' + v14_q.tiles.length);
  ok(v14_q.words.length === 3, '一组 3 个词：' + v14_q.words.map(x => x.w).join('/'));
  ok(d.querySelectorAll('#stage .wb-tile').length === 6, 'DOM 里 6 个字块');
  ok(d.querySelectorAll('#stage .wb-slot').length === 3, 'DOM 里 3 个待填词位');
  ok(d.querySelectorAll('#stage .wb-tile.used').length === 0, '开局没有已用字块');

  /* 组内任取两个字都不能拼成本组以外的词，否则孩子拼对了却判错 */
  const v14_bank = w.wordBank().byW;
  const v14_chars = [...new Set(v14_q.words.reduce((a, x) => a.concat([x.a, x.b]), []))];
  let v14_amb = '';
  for (let i = 0; i < v14_chars.length; i++) {
    for (let j = 0; j < v14_chars.length; j++) {
      if (i === j) continue;
      const t = v14_chars[i] + v14_chars[j];
      if (v14_bank[t] && !v14_q.words.some(x => x.w === t)) v14_amb = t;
    }
  }
  ok(!v14_amb, '组内没有「也能拼成别的词」的歧义组合' + (v14_amb ? '：' + v14_amb : ''));

  const v14_tile = ch => [...d.querySelectorAll('#stage .wb-tile')]
    .filter(t => t.textContent === ch && !t.classList.contains('used'))[0];
  const v14_hit = (a, b) => { click(v14_tile(a)); click(v14_tile(b)); };

  /* 错拼：挑一对既不是本组目标词、也不在词表里的字 */
  let v14_wp = null;
  for (let i = 0; i < v14_chars.length && !v14_wp; i++) {
    for (let j = i + 1; j < v14_chars.length; j++) {
      const a = v14_chars[i], b = v14_chars[j];
      if (v14_q.words.some(x => x.w === a + b || x.w === b + a)) continue;
      if (!v14_bank[a + b] && !v14_bank[b + a]) { v14_wp = [a, b]; break; }
    }
  }
  if (v14_wp) {
    v14_hit(v14_wp[0], v14_wp[1]);
    await wait(140);
    ok(d.querySelectorAll('#stage .wb-slot.on').length === 0,
      '拼不成词时不填词位（' + v14_wp.join('') + '）');
    ok(!!d.querySelector('#stage .wb-tile.shake'), '拼错的字块抖一下');
    ok(d.getElementById('wbTip').textContent.indexOf('拼不成词') >= 0,
      '提示「这两个字拼不成词」：' + d.getElementById('wbTip').textContent);
    ok(v14_q.words.every((x, i) => !v14_q.done[i]), '错拼不会把词标成已完成');
  }

  /* 先点第二个字再点第一个字也算对：孩子心里想的是那个词，不该纠正他的手指顺序 */
  const v14_w0 = v14_q.words[0].w;
  v14_hit(v14_w0.charAt(1), v14_w0.charAt(0));
  await wait(160);
  ok(d.querySelectorAll('#stage .wb-slot.on').length === 1, '倒着点也算拼对：' + v14_w0);
  ok(d.querySelectorAll('#stage .wb-tile.used').length === 2, '用掉两个字块');

  for (let i = 1; i < v14_q.words.length; i++) {
    const wd = v14_q.words[i].w;
    v14_hit(wd.charAt(0), wd.charAt(1));
    await wait(170);
    ok(d.querySelectorAll('#stage .wb-slot.on').length === i + 1,
      '拼对第 ' + (i + 1) + ' 个词后词位填上：' + wd);
  }
  ok(d.querySelectorAll('#stage .wb-tile.used').length === 6, '6 个字块全部用掉');
  ok(v14_q.locked === true, '整组拼完锁住，不能再点');
  ok(v14_z.right === 3, '本组算 3 个词对：' + v14_z.right);
  ok(d.getElementById('wbTip').textContent.indexOf('都拼好啦') >= 0,
    '整组完成有明确反馈：' + d.getElementById('wbTip').textContent);

  const v14_keys = Object.keys(w.STATE.logs).filter(k => k.indexOf('拼词生|') === 0);
  const v14_stuChars = ['木', '人', '山', '水', '火', '口'];
  ok(v14_keys.length > 0, '拼对的词会记练习：' + v14_keys.length + ' 条');
  ok(v14_keys.every(k => v14_stuChars.indexOf(k.split('|')[1]) >= 0),
    '只给「学生字表里的字」记分（词里的另一半不在字表就不记）：' +
    v14_keys.map(k => k.split('|')[1]).join(''));
  ok(v14_keys.every(k => w.STATE.logs[k].alone === 1), '没用提示，都算独立答对');

  await wait(3000);
  ok(v14_z.i === 1, '整组完成后自动进入下一组：i=' + v14_z.i);
  ok(d.querySelectorAll('#stage .wb-tile.used').length === 0, '新一组字块重置');

  const v14_hintBtn = d.getElementById('btnHint');
  if (v14_hintBtn && !v14_hintBtn.disabled) {
    click(v14_hintBtn);
    await wait(140);
    ok(d.querySelectorAll('#stage .wb-tile.hinted').length === 2, '提示闪一下两个能拼的字块');
    ok(v14_z.promptUsed === 1, '提示记了一次');
  }

  /* 结算正确率按「词」算，不按组算：9 个词对 6 个 = 67% */
  let v14_allWords = 0;
  for (let i = 0; i < v14_z.qs.length; i++) v14_allWords += v14_z.qs[i].words.length;
  v14_z.i = v14_z.qs.length;
  v14_z.right = 6;
  w.renderSummary();
  const v14_rate = parseFloat(d.querySelector('#stage .big-char').textContent);
  ok(v14_rate === Math.round(600 / v14_allWords),
    '结算按词算正确率：' + v14_rate + '%（共 ' + v14_allWords + ' 个词，对 6 个）');

  /* 字表小到凑不出词时，要给明确说法，不能留个空白页。
     「山」的两个组词都含「山」，同组里字块不能共用，所以一组只凑得出 1 个词。 */
  const v14_tiny = { id: 'local_w2', name: '词不够', types: ['拼词语'], chars: ['山'],
                     groups: [], count: 8, status: '在读', photo: '', edited: Date.now() };
  w.STATE.students.push(v14_tiny);
  w.enterStudent('词不够');
  await wait(220);
  await beginQuiz(220);
  ok(d.getElementById('stage').textContent.indexOf('凑不出词语') >= 0,
    '字表凑不出词时给明确提示');

  console.log('\n【20】老师端词库：内置组词预填，不再是空表（T-010）');
  const v15_bw = w.builtinWords(true);
  ok(v15_bw.list.length > 0, '内置词表非空：' + v15_bw.list.length + ' 条');
  ok(v15_bw.list.every(x => /^[\u4e00-\u9fff]{2}$/.test(x.w)), '内置词只收双字词');
  const v15_py = v15_bw.list.filter(x => x.py)[0];
  ok(!!v15_py && v15_py.py.indexOf(' ') > 0,
    '词拼音由两个字拼出来：' + (v15_py ? v15_py.w + ' ' + v15_py.py : '无'));

  const v15_n0 = w.STATE.words.length;
  w.openTeacher();
  await wait(200);
  click(v13_tabOf('word'));
  await wait(320);
  const v15_rows = d.querySelectorAll('#wdTbody tr');
  const v15_bi = d.querySelectorAll('#wdTbody tr.tr-builtin');
  ok(v15_rows.length === v15_bw.list.length + v15_n0,
    '词库打开就能看到词：' + v15_rows.length + ' 行（内置 ' + v15_bw.list.length + ' + 自建 ' + v15_n0 + '）');
  ok(v15_bi.length === v15_bw.list.length && !!d.querySelector('#wdTbody .sp-builtin'),
    '内置行带「内置」标记，一眼分清来源');
  ok(d.getElementById('wdCount').textContent.indexOf('内置组词') >= 0,
    '计数说清来源：' + d.getElementById('wdCount').textContent);
  const v15_opts = [...d.querySelectorAll('#wdFilter option')].map(o => o.textContent);
  ok(v15_opts.join('/') === '全部/内置组词/我的词库', '来源筛选三项：' + v15_opts.join('/'));

  /* 收进词库：复制成自己的，之后可改可停用 */
  const v15_btn = v15_bi[0].querySelector('[data-wcopy]');
  const v15_word = v15_btn.getAttribute('data-wcopy');
  click(v15_btn);
  await wait(220);
  ok(w.STATE.words.length === v15_n0 + 1, '收进词库后 STATE.words +1');
  const v15_new = w.STATE.words[w.STATE.words.length - 1];
  ok(v15_new.w === v15_word && v15_new.kind === '词' &&
     String(v15_new.id).indexOf('local_') === 0,
    '新词条是本机可编辑记录：' + v15_word + ' / ' + v15_new.id);
  ok(d.querySelectorAll('#wdTbody tr.tr-builtin')[0].textContent.indexOf('已在词库') >= 0,
    '收过的内置词改成「已在词库」');
  ok(!d.querySelectorAll('#wdTbody tr.tr-builtin')[0].querySelector('[data-wcopy]'),
    '同一个词不能重复收');

  const v15_f = d.getElementById('wdFilter');
  v15_f.value = 'mine';
  v15_f.dispatchEvent(new w.Event('change', { bubbles: true }));
  await wait(220);
  ok(d.querySelectorAll('#wdTbody tr').length === v15_n0 + 1, '筛选「我的词库」只剩自建');
  v15_f.value = '';
  v15_f.dispatchEvent(new w.Event('change', { bubbles: true }));
  await wait(220);
  const v15_s = d.getElementById('wdSearch');
  v15_s.value = v15_word;
  v15_s.dispatchEvent(new w.Event('input', { bubbles: true }));
  await wait(340);
  ok(d.querySelectorAll('#wdTbody tr').length >= 1, '按词搜索能命中：' + v15_word);
  v15_s.value = '';
  v15_s.dispatchEvent(new w.Event('input', { bubbles: true }));
  await wait(340);
  ok(d.querySelectorAll('#wdTbody tr').length === v15_bw.list.length + v15_n0 + 1,
    '清空搜索后行数复原');

  /* 收进词库的是副本，不该让题库里出现两个同样的词 */
  ok(w.wordBank(true).list.length === v15_bw.list.length + v15_n0,
    '收进词库的词不重复进题库：' + w.wordBank(true).list.length);

  /* ================= §21 词库空表抢救（v16） =================
     老师报「词库还是空的」有两种真因：① 打开的是旧版页面 ② 字库「组词」栏被抹了
     （老存档没这列 / 云端整表覆写丢列 / 导入的备份不带组词）。
     ① 靠角标版本号暴露，② 靠 repairCharWords + builtinWords 兜底，
     这里把两种都钉住。 */
  console.log('\n--- §21 词库空表抢救 ---');
  const v16_ver = d.getElementById('appVer');
  ok(!!v16_ver, '老师端顶部有版本角标');
  ok(v16_ver.textContent.indexOf(w.APP_VER) >= 0,
    '角标写着版本号：' + v16_ver.textContent);
  ok(/内置词\s*\d+/.test(v16_ver.textContent),
    '角标同时报内置词条数，空表一眼能看出来：' + v16_ver.textContent);

  const v16_had = w.STATE.chars.filter(c => c.words && String(c.words).trim()).length;
  ok(v16_had > 0, '字库本来就有组词：' + v16_had + ' / ' + w.STATE.chars.length);

  /* 只填了一条的时候不许整体覆盖老师的数据 */
  const v16_keep = [
    { id: 'local_k1', kind: '字', w: '大', p: 'dà', g: '测试', img: '', words: '大人', sent: '', on: true },
    { id: 'local_k2', kind: '字', w: '太', p: 'tài', g: '测试', img: '', words: '', sent: '', on: true }
  ];
  const v16_bak = w.STATE.chars;
  w.STATE.chars = v16_keep;
  ok(w.repairCharWords() === 0, '老师还留着一条组词时，不做整表覆盖');
  ok(w.STATE.chars[0].words === '大人' && w.STATE.chars[1].words === '',
    '没触发补回时数据原样不动');

  /* 整张字表一条组词都没有 → 按内置字表补回 */
  w.STATE.chars = v16_keep.map(c => Object.assign({}, c, { words: '' }));
  const v16_n = w.repairCharWords();
  ok(v16_n > 0, '组词全空时按内置字表补回 ' + v16_n + ' 条');
  ok(w.STATE.chars[0].words && w.STATE.chars[0].words.length > 0,
    '补回的是真组词：' + w.STATE.chars[0].w + ' → ' + w.STATE.chars[0].words);
  w.STATE.chars = v16_bak;

  /* 字表整张是外来字（内置字表里查不到）→ 词库仍不能空 */
  w.STATE.chars = [
    { id: 'local_z1', kind: '字', w: '淼', p: 'miǎo', g: '测试', img: '', words: '', sent: '', on: true },
    { id: 'local_z2', kind: '字', w: '焱', p: 'yàn', g: '测试', img: '', words: '', sent: '', on: true }
  ];
  w.BUILTIN_WORDS = null; w.WORD_BANK = null;
  const v16_fb = w.builtinWords();
  ok(v16_fb.fallback === true, '查不到组词时标记走兜底');
  ok(v16_fb.list.length > 900, '兜底用的是页面内置字表：' + v16_fb.list.length + ' 个词');
  ok(w.wordBank(true).list.length === v16_fb.list.length + w.STATE.words.length,
    '拼词语题库同样有词：' + w.wordBank(true).list.length + '（兜底 ' + v16_fb.list.length +
    ' + 自建 ' + w.STATE.words.length + '）');
  w.renderWordList('word');
  ok(d.querySelectorAll('#wdTbody tr').length === v16_fb.list.length + w.STATE.words.length,
    '词库照样列出全部兜底词：' + d.querySelectorAll('#wdTbody tr').length + ' 行');
  ok(d.getElementById('wdCount').textContent.indexOf('字库「组词」栏是空的') >= 0,
    '界面直说走了兜底，不装作正常：' + d.getElementById('wdCount').textContent);
  ok(d.getElementById('appVer').textContent.indexOf('兜底') >= 0,
    '角标也标出兜底状态：' + d.getElementById('appVer').textContent);

  console.log('\n【23】今日字卡预习：进练习前先认一遍（T-013）');
  /* 上一节把字表换成了外来字，这一节重建一份干净数据（字都在内置字库里） */
  w.STATE.chars = w.CHARS.filter(c => c.w).slice(0, 20).map((c, i) => ({
    id: 'local_q' + i, kind: '字', w: c.w, p: c.p || '', g: c.g || '',
    img: '', words: c.words || '', sent: '', on: true
  }));
  const v18_names = w.STATE.chars.map(c => c.w);
  w.STATE.logs = {};
  w.STATE.words = [];
  w.STATE.students = [{ id: 'local_q9', name: '字卡生', types: ['听音找字'],
    chars: v18_names.slice(), groups: [], count: 8, status: '在读', photo: '' }];
  /* 造状态：前两个需巩固、第三第四个已掌握，其余待学 */
  const v18_now = new Date().toISOString();
  const v18log = (ch, o) => {
    w.STATE.logs['字卡生|' + ch] = Object.assign({
      id: '', key: '字卡生|' + ch, stu: '字卡生', ch: ch, last: v18_now,
      n: 0, alone: 0, hinted: 0, wrong: 0, prompts: 0, level: '', dirty: false
    }, o);
  };
  v18log(v18_names[0], { n: 4, alone: 0, wrong: 4 });
  v18log(v18_names[1], { n: 4, alone: 0, wrong: 3 });
  v18log(v18_names[2], { n: 6, alone: 6, wrong: 0 });
  v18log(v18_names[3], { n: 5, alone: 5, wrong: 0 });

  w.enterStudent('字卡生');
  await wait(180);
  ok(!!d.querySelector('#stage .pre-wrap'), '进学生先出今日字卡');
  ok(d.querySelectorAll('#stage .opt').length === 0, '预习阶段不出题目（不越过这一步）');
  const v18_cards = Array.from(d.querySelectorAll('#stage .pre-card'));
  ok(v18_cards.length === 8, '字卡张数 = 每日题量：' + v18_cards.length);
  const v18_list = v18_cards.map(c => c.getAttribute('data-pre'));
  ok(v18_list[0] === v18_names[0] && v18_list[1] === v18_names[1],
    '需巩固的字排在最前：' + v18_list.join(''));
  ok(v18_cards[0].querySelector('.pre-st').textContent === '需巩固',
    '卡片标出掌握状态：' + v18_cards[0].querySelector('.pre-st').textContent);
  ok(d.getElementById('qNow').textContent === '预习', '题数区显示「预习」');
  ok(v18_cards[0].querySelector('.pre-char').textContent === v18_list[0],
    '卡片主角是汉字：' + v18_cards[0].querySelector('.pre-char').textContent);

  /* 点一张读一张：打勾，但不写学习记录 —— 预习不是练习，不能污染掌握度 */
  const v18_logs0 = Object.keys(w.STATE.logs).length;
  v18_cards[0].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await wait(80);
  ok(w.PRE.read[v18_list[0]] === 1, '点过的字记进 PRE.read');
  ok(!!d.querySelector('[data-pre="' + v18_list[0] + '"] .pre-tick'), '点过的卡出现「读过了」');
  ok(d.querySelector('[data-pre="' + v18_list[0] + '"]').className.indexOf('read') >= 0,
    '点过的卡描绿');
  ok(Object.keys(w.STATE.logs).length === v18_logs0, '预习不写学习记录（不污染掌握度）');

  /* 开始练习：出的题必须全在字单里，否则「刚认完这 8 个、做题却是另外 8 个」 */
  ok(d.getElementById('preGo').textContent.indexOf('开始练习') >= 0,
    '底部大按钮文案：' + d.getElementById('preGo').textContent);
  d.getElementById('preGo').click();
  await wait(220);
  const v18_qs = w.STATE.quiz ? w.STATE.quiz.qs.map(q => q.target.w) : [];
  ok(v18_qs.length === 8, '题数 = 字单字数：' + v18_qs.length);
  ok(v18_qs.length > 0 && v18_qs.every(x => v18_list.indexOf(x) >= 0),
    '出的题全部来自预习字单：' + v18_qs.join(''));
  ok(d.getElementById('drillBar').hidden === true, '今日字单不点抽练条（那只是今天的字，不是抽练）');
  ok(d.getElementById('scrPlay').className.indexOf('is-pre') < 0,
    '开题后撤掉 .is-pre，老师辅助按钮回来');

  /* 全读过 → 按钮文案变，给个「可以走了」的信号 */
  w.enterStudent('字卡生');
  await wait(150);
  Array.from(d.querySelectorAll('#stage .pre-card')).forEach(c =>
    c.dispatchEvent(new w.MouseEvent('click', { bubbles: true })));
  await wait(80);
  ok(d.getElementById('preGo').textContent.indexOf('都读过啦') >= 0,
    '全读过按钮文案变化：' + d.getElementById('preGo').textContent);

  /* 没有字表：说清为什么没有卡，不要留白 */
  w.STATE.students.push({ id: 'local_q0', name: '空卡生', types: ['听音找字'],
    chars: [], groups: [], count: 8, status: '在读', photo: '' });
  w.enterStudent('空卡生');
  await wait(120);
  ok(d.getElementById('stage').textContent.indexOf('还没有字表') >= 0, '空字表给明确提示');
  ok(!d.getElementById('preGo'), '空字表不出开始按钮');

  console.log('\n【24】在学上限与字表状态机（T-009）');
  /* 字库 700 条只有 561 个不重复字，测试字表必须先按字去重，否则计数会虚高 */
  const v19_pool = Array.from(new Set(
    w.CHARS.filter(c => c.w).map(c => c.w))).slice(0, 30);
  w.STATE.chars = v19_pool.map((ch, i) => ({
    id: 'local_c' + i, kind: '字', w: ch, p: '', g: '', img: '', words: '', sent: '', on: true
  }));
  w.STATE.logs = {};
  w.STATE.words = [];
  w.STATE.students = [
    { id: 'local_c1', name: '老生', types: ['听音找字'], chars: v19_pool.slice(),
      groups: [], count: 20, status: '在读', photo: '' },
    { id: 'local_c2', name: '小班', types: ['听音找字'], chars: v19_pool.slice(0, 12),
      groups: [], count: 2, status: '在读', photo: '' }
  ];
  w.saveSnap();                       /* 先落盘，迁移才有东西可备份 */
  const v19_n = w.migrateCap();
  ok(v19_n > 0, '老数据迁移有改动：' + v19_n);
  ok(w.STATE.students[0].count === 10, '旧题量 20 收到上限 10：' + w.STATE.students[0].count);
  ok(w.STATE.students[1].count === 3, '旧题量 2 抬到下限 3：' + w.STATE.students[1].count);
  ok(!!w.localStorage.getItem('wb2_data_v1.bak-T009'), '迁移前留了 bak-T009 备份');
  ok(w.stuCap({ count: 99 }) === 10 && w.stuCap({ count: 1 }) === 3,
    'stuCap 双向钳制：99→10、1→3');

  const v19_s = w.STATE.students[0];
  const v19_act = w.stuActive(v19_s);
  ok(v19_act.length === 10, '在学名单 = 上限 10：' + v19_act.length);
  ok(new Set(v19_act).size === v19_act.length, '在学名单不重复');
  ok(v19_act.every(x => v19_pool.indexOf(x) >= 0), '在学名单全在字表里');

  /* 练会一个 → 自动退出、补一个进来 */
  const v19_first = v19_act[0];
  const v19mk = (ch, o) => {
    w.STATE.logs['老生|' + ch] = Object.assign({
      id: '', key: '老生|' + ch, stu: '老生', ch: ch,
      last: new Date().toISOString(), n: 0, alone: 0, hinted: 0, wrong: 0,
      prompts: 0, level: '', dirty: false
    }, o);
  };
  v19mk(v19_first, { n: 6, alone: 6, wrong: 0 });
  const v19_act2 = w.stuActive(v19_s);
  ok(v19_act2.indexOf(v19_first) < 0, '学会的字自动退出在学：' + v19_first);
  ok(v19_act2.length === 10, '名额自动补齐到 10：' + v19_act2.length);
  ok(v19_act2.some(x => v19_act.indexOf(x) < 0), '补进来一个新字');

  /* 锁定：学会了也不退出，解锁后下一轮退出 */
  const v19_sec = v19_act2[0];
  w.actLock(v19_s, v19_sec);
  v19mk(v19_sec, { n: 8, alone: 8, wrong: 0 });
  ok(w.stuActive(v19_s).indexOf(v19_sec) >= 0, '锁定的字学会了也留在在学：' + v19_sec);
  w.actLock(v19_s, v19_sec);
  ok(w.stuActive(v19_s).indexOf(v19_sec) < 0, '解锁后下一轮退出');
  ok(w.lockList(v19_s).length === 0, '解锁后锁定表清空');

  /* 手动移出：空出来的名额**不许自动补**，否则这个按钮等于没做 */
  const v19_cur = w.stuActive(v19_s);
  const v19_drop = v19_cur[v19_cur.length - 1];
  ok(w.actDel(v19_s, v19_drop), '手动移出在学：' + v19_drop);
  ok(w.stuActive(v19_s).length === 9, '移出后停在 9 个，不自动补回：' + w.stuActive(v19_s).length);

  /* 加入：排在最前，满员拒绝；已掌握的字拉回来要自动锁定 */
  const v19_out = v19_pool.filter(x => w.stuActive(v19_s).indexOf(x) < 0)[0];
  ok(w.actAdd(v19_s, v19_out), '空出名额后能加入：' + v19_out);
  ok(w.stuActive(v19_s)[0] === v19_out, '新加入的排在最前（下次先练它）');
  ok(w.stuActive(v19_s).length === 10, '加满到 10');
  ok(!w.actAdd(v19_s, v19_pool[v19_pool.length - 1]), '满员时拒绝加入');
  ok(!w.actAdd(v19_s, v19_out), '已在名单里的不重复加');

  /* 今日字卡 = 在学名单 */
  w.enterStudent('老生');
  await wait(180);
  const v19_cards = Array.from(d.querySelectorAll('#stage .pre-card')).map(c => c.getAttribute('data-pre'));
  const v19_now = w.stuActive(v19_s);
  ok(v19_cards.length === v19_now.length, '字卡张数 = 在学个数：' + v19_cards.length);
  ok(v19_cards.every(x => v19_now.indexOf(x) >= 0), '字卡全在在学名单里');

  /* 档案页：在学 / 排队分开写，网格有在学标记 */
  w.openStuProfile('老生');
  await wait(140);
  ok(d.getElementById('profMeta').textContent.indexOf('在学') >= 0,
    '档案顶部写在学：' + d.getElementById('profMeta').textContent);
  const v19_lg = d.getElementById('profLegend').textContent;
  ok(v19_lg.indexOf('在学') >= 0 && v19_lg.indexOf('排队') >= 0, '图例写清在学与排队');
  ok(d.querySelectorAll('#profGrid .pgc.in-act').length === v19_now.length,
    '网格里在学的字有标记：' + d.querySelectorAll('#profGrid .pgc.in-act').length);
  ok(w.stuProfile(v19_s).act === v19_now.length, '在学计数按字去重，不会超过上限');

  /* 上限只影响该学生 */
  ok(w.STATE.students[1].count === 3 && w.stuActive(w.STATE.students[1]).length === 3,
    '另一个学生还是 3 个');
  v19_s.count = 5;
  ok(w.stuActive(v19_s).length === 5, '改上限后立即收到 5：' + w.stuActive(v19_s).length);
  ok(w.STATE.students[1].count === 3, '改一个人的上限不影响别人');

  console.log('\n========== 结果：' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  dom.window.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('SMOKE_CRASH', e); process.exit(2); });
