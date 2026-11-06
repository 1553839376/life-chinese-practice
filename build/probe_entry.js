/* 老师入口的五条路（jsdom 实跑）：希沃上点两次进不去，靠这个把每种事件流都试一遍。
   用法：node build/probe_entry.js build/生活语文练习台.html */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const HTML = fs.readFileSync(process.argv[2] || 'build/生活语文练习台.html', 'utf8');
const dom = new JSDOM(HTML, { runScripts: 'dangerously', url: 'https://example.invalid/' });
const w = dom.window, d = w.document;
const out = [];
const say = s => out.push(s);
const wait = ms => new Promise(r => setTimeout(r, ms));

function reset(){ w.showScreen('learn'); }
function phase(){ return w.STATE.phase; }
function ev(type, x, y, extra){
  const e = new w.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  if (extra) Object.keys(extra).forEach(k => { e[k] = extra[k]; });
  return e;
}

w.addEventListener('load', async () => {
  await wait(600);
  const btn = d.getElementById('btnTeacherTop');
  say('有没有 ontouchstart：' + ('ontouchstart' in w) +
      '　有没有 PointerEvent：' + (!!w.PointerEvent));
  say('主事件流选的是：' + (('ontouchstart' in w) ? 'touchend' : (w.PointerEvent ? 'pointerup' : 'mouseup')));

  /* ① 只派发 click 两次（有些一体机只给 click） */
  reset();
  await wait(60);
  btn.dispatchEvent(ev('click', 100, 20));
  await wait(220);
  btn.dispatchEvent(ev('click', 102, 21));
  await wait(60);
  say('① 两次 click（间隔 220ms）→ ' + phase() + (phase() === 'teacher' ? ' ✓' : ' ✗'));

  /* ② 只派发主事件流两次（真机：touchend / pointerup） */
  const mainEvt = ('ontouchstart' in w) ? 'touchend' : (w.PointerEvent ? 'pointerup' : 'mouseup');
  reset();
  await wait(60);
  btn.dispatchEvent(ev(mainEvt, 200, 20));
  await wait(300);
  btn.dispatchEvent(ev(mainEvt, 203, 22));
  await wait(60);
  say('② 两次 ' + mainEvt + '（间隔 300ms）→ ' + phase() + (phase() === 'teacher' ? ' ✓' : ' ✗'));

  /* ③ 只点一下 —— 不许进 */
  reset();
  await wait(60);
  btn.dispatchEvent(ev('click', 300, 20));
  await wait(60);
  say('③ 只点一下 → ' + phase() + (phase() === 'learn' ? ' ✓（没进去，对）' : ' ✗ 学生一碰就进去了'));

  /* ④ 两下隔 900ms（超过 800ms 的窗口）—— 不许进 */
  reset();
  await wait(60);
  btn.dispatchEvent(ev('click', 400, 20));
  await wait(900);
  btn.dispatchEvent(ev('click', 401, 20));
  await wait(60);
  say('④ 两下隔 900ms → ' + phase() + (phase() === 'learn' ? ' ✓（太慢不算，对）' : ' ✗ 慢点两下也进去了'));

  /* ⑤ 一次物理触摸 = 主事件流 + 随后合成的 click（同坐标）—— 只许算一下 */
  reset();
  await wait(60);
  btn.dispatchEvent(ev(mainEvt, 500, 20));
  await wait(80);
  btn.dispatchEvent(ev('click', 500, 20));
  await wait(60);
  say('⑤ 一次触摸（' + mainEvt + ' + 合成 click）→ ' + phase() +
      (phase() === 'learn' ? ' ✓（只算一下，对）' : ' ✗ 一次触摸被数成两下'));

  /* ⑥ dblclick 单独派发 */
  reset();
  await wait(60);
  btn.dispatchEvent(ev('dblclick', 600, 20));
  await wait(60);
  say('⑥ dblclick → ' + phase() + (phase() === 'teacher' ? ' ✓' : ' ✗'));

  /* ⑦ 按住 900ms 不放 */
  reset();
  await wait(60);
  btn.dispatchEvent(ev('mousedown', 700, 20));
  await wait(1000);
  say('⑦ 按住 1 秒 → ' + phase() + (phase() === 'teacher' ? ' ✓' : ' ✗'));

  /* ⑧ 按住 300ms 就松 —— 不许进 */
  reset();
  await wait(60);
  btn.dispatchEvent(ev('mousedown', 800, 20));
  await wait(300);
  btn.dispatchEvent(ev('mouseup', 800, 20));
  await wait(700);
  say('⑧ 按住 0.3 秒就松 → ' + phase() + (phase() === 'learn' ? ' ✓（没进去，对）' : ' ✗ 短按也进去了'));

  console.log(out.join('\n'));
  w.close();
});
