/* 首载 A/B：语音包「内联 JS 对象」vs「惰性 JSON」
   同一个页面，只换语音包的承载方式，各跑 3 次，比 load 事件时间。
   A = 现状（<script type="application/json" id="voicePack">，首屏不等它）
   B = 旧结构（<script>var VOICE_PACK = {...}</script>，解析阶段就要编译 4MB 字面量）
*/
const fs = require('fs');
const { JSDOM } = require('jsdom');

const HTML = fs.readFileSync('生活语文练习台.html', 'utf8');
const m = HTML.match(/<script type="application\/json" id="voicePack">([\s\S]*?)<\/script>/);
if (!m) { console.log('没找到 voicePack 数据块'); process.exit(1); }
const json = m[1];

const A = HTML;
const B = HTML.replace(m[0], '<script>var VOICE_PACK = ' + json + ';</script>');

function run(html){
  return new Promise(resolve => {
    const t0 = Date.now();
    const dom = new JSDOM(html, {
      runScripts: 'dangerously', pretendToBeVisual: true,
      url: 'https://example.com/p/x',
      beforeParse(w){
        w.scrollTo = function(){};
        const AC = function(){
          this.currentTime = 0; this.destination = {}; this.state = 'running';
          this.resume = () => {};
          this.createGain = () => ({ gain: { value: 1, setValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect(){}, disconnect(){} });
          this.createBufferSource = () => ({ buffer: null, playbackRate: { value: 1 }, connect(){}, disconnect(){}, stop(){}, start(){} });
          this.createOscillator = () => ({ type: 'sine', frequency: { value: 0, setValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect(){}, stop(){}, start(){} });
          this.decodeAudioData = (b, cb) => cb({ duration: .5, sampleRate: 22050 });
        };
        w.AudioContext = AC; w.webkitAudioContext = AC;
      }
    });
    dom.window.addEventListener('load', () => {
      const ms = Date.now() - t0;
      const parsedNow = !!dom.window.VOICE_PACK;    // boot 时是否已经解析了 4MB
      dom.window.close();
      resolve({ ms, parsedNow });
    });
    setTimeout(() => { dom.window.close(); resolve({ ms: -1, parsedNow: null }); }, 60000);
  });
}

(async () => {
  const out = {};
  for (const [name, html] of [['A 惰性JSON', A], ['B 内联JS', B]]){
    const arr = [];
    let parsed = null;
    for (let i = 0; i < 3; i++){
      const r = await run(html);
      if (r.ms > 0) arr.push(r.ms);
      parsed = r.parsedNow;
    }
    arr.sort((a, b) => a - b);
    out[name] = { median: arr[1] || arr[0], all: arr, bootParsed: parsed };
    console.log(name, 'load 中位数', (arr[1] || arr[0]) + ' ms', '各次', arr.join('/'), '| boot 时已解析 4MB:', parsed);
  }
  const a = out['A 惰性JSON'].median, b = out['B 内联JS'].median;
  console.log('→ 省下', (b - a) + ' ms（' + Math.round((b - a) * 100 / b) + '%）');
})();
