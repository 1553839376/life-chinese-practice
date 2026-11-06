/* 早读屏的实跑探针（jsdom）：不靠截图，直接看状态机怎么走。
   用法：node build/probe_read.js build/生活语文练习台.html */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const HTML = fs.readFileSync(process.argv[2] || 'build/生活语文练习台.html', 'utf8');
const dom = new JSDOM(HTML, { runScripts: 'dangerously', url: 'https://example.invalid/' });
const w = dom.window, d = w.document;
const out = [];
const say = (s) => out.push(s);

w.addEventListener('load', () => {
  setTimeout(() => {
    const pool = w.STATE.chars.filter(c => c.w).slice(0, 10);
    say('字表可用：' + pool.length + '（' + pool.map(c => c.w).join('') + '）');
    say('READ_HOLD=' + w.READ_HOLD + ' READ_TAKE=' + w.READ_TAKE);

    w.startRead(pool.slice(0, 6));
    say('screen=read hidden? ' + d.getElementById('scrRead').hidden);
    say('牌数=' + d.querySelectorAll('#readTable .rd-card').length +
        '（选 6 个字，第一批应发 4 张）');
    say('正面的字=' + Array.from(d.querySelectorAll('.rd-front b')).map(b => b.textContent).join(''));
    say('有拼音节点吗=' + !!d.querySelector('.rd-front i:not(.rd-wait)'));
    say('--hold=' + d.getElementById('readTable').style.getPropertyValue('--hold'));
    say('--rc=' + d.getElementById('readTable').style.getPropertyValue('--rc'));
    say('翻开前 on 数=' + d.querySelectorAll('.rd-card.on').length);

    w.readFlip(0);
    say('翻第 0 张后 on=' + d.querySelectorAll('.rd-card.on').length +
        ' now=' + d.querySelectorAll('.rd-card.now').length);
    say('第 0 张 class=' + d.querySelectorAll('.rd-card')[0].className);
    w.readFlip(1);
    say('翻第 1 张：on=' + d.querySelectorAll('.rd-card.on').length +
        '（已翻开的不翻回去）now 在第 ' +
        Array.from(d.querySelectorAll('.rd-card')).findIndex(c => c.classList.contains('now')) + ' 张');
    w.readNext();
    w.readNext();
    say('连点两下后 k=' + w.READ.k + '（应停在最后一张 3）');

    /* 读完这一批 → 进入 1.7 秒的间隔，再发下一批 */
    w.readNext();
    say('读完一批后 timer 已排=' + !!w.READ.timer + ' job=' + !!w.READ.job);
    w.READ.job && w.READ.job();
    say('第二批牌数=' + d.querySelectorAll('#readTable .rd-card').length +
        ' 字=' + Array.from(d.querySelectorAll('.rd-front b')).map(b => b.textContent).join(''));
    say('第几遍=' + d.getElementById('readRound').textContent +
        ' 第几个字=' + d.getElementById('readNow').textContent + '/' +
        d.getElementById('readTotal').textContent);

    /* 暂停 */
    w.readFlip(0);
    const left0 = w.READ.left;
    w.READ.at = Date.now() - 1200;
    w.readPause();
    say('暂停：timer 清掉=' + (w.READ.timer === null) + ' 文案=' +
        d.getElementById('readPause').textContent +
        ' 剩余=' + w.READ.left + '（原 ' + left0 + '）' +
        ' stage.paused=' + d.getElementById('readStage').classList.contains('paused'));
    w.readPause();
    say('继续：timer 回来=' + !!w.READ.timer + ' 文案=' + d.getElementById('readPause').textContent);

    /* 退出 */
    w.readStop(true);
    say('退出：on=' + w.READ.on + ' 牌桌剩=' + d.querySelectorAll('#readTable .rd-card').length +
        ' 屏=' + (d.getElementById('scrRead').hidden ? '已隐藏' : '还开着') +
        ' timer=' + w.READ.timer);
    say('回到乐园 phase=' + w.STATE.phase);

    /* 只选 2 个字：不能凑成 4 张一模一样的牌 */
    w.startRead(pool.slice(0, 2));
    say('选 2 个字 → 牌数=' + d.querySelectorAll('#readTable .rd-card').length +
        ' 字=' + Array.from(d.querySelectorAll('.rd-front b')).map(b => b.textContent).join(''));
    w.readStop(true);

    /* 空字表 */
    w.startRead([]);
    say('空字表：屏=' + (d.getElementById('scrRead').hidden ? '没进去（对）' : '进去了（错）'));

    console.log(out.join('\n'));
    w.close();
  }, 700);
});
