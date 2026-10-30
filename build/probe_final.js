/* 两种字表分别量：v25（不用搭配表） vs 现在（全量表 + 渐进放宽）
   ① 高频字表：字库最前面 20 字（一二人手男女三大…），任意两字几乎都是词，最难守
   ② 随机字表：561 字里抽 20 个，接近普通学生
   口径固定 = 完整 1734 条「合理词」表。 */
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('生活语文练习台.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.test/' });
const w = dom.window;
const wait = ms => new Promise(r => setTimeout(r, ms));
const ALL = fs.readFileSync('_chars.txt', 'utf8').trim().split('');
const FULL = new Set(fs.readFileSync('_cross_final.txt', 'utf8').split(/\r?\n/).filter(Boolean));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

(async () => {
  await new Promise(r => w.addEventListener('load', r, { once: true }));
  await wait(400);
  const bank = w.wordBank(true);
  const core = w.crossSet();

  function mk(name, chars) {
    const s = { id: 'local_' + name, name: name, types: ['拼词语'], chars: chars,
                groups: [], count: 12, status: '在读', photo: '', edited: Date.now() };
    w.STATE.students.push(s); return s;
  }
  const high = [mk('高频', ALL.slice(0, 20))];
  const rand = [];
  for (let i = 0; i < 6; i++) rand.push(mk('随' + i, shuffle(ALL).slice(0, 20)));

  async function measure(roster, rounds, useTable) {
    const saved = w.CROSS_SET; w.CROSS_SET = useTable ? core : {};
    let g = 0, bad = 0, pairs = 0, words = 0, full3 = 0;
    for (const stu of roster) {
      w.enterStudent(stu.name); await wait(25);
      for (let r = 0; r < rounds; r++) {
        w.startQuiz('拼词语'); await wait(22);
        const z = w.STATE.quiz;
        if (!z || z.type !== '拼词语') continue;
        z.qs.forEach(q => {
          g++; words += q.words.length; if (q.words.length >= 3) full3++;
          const tgt = q.words.map(x => x.w), tiles = q.tiles;
          let c = 0;
          for (let i = 0; i < tiles.length; i++) for (let j = 0; j < tiles.length; j++) {
            if (i === j) continue;
            const t = tiles[i] + tiles[j];
            if (tgt.indexOf(t) >= 0) continue;
            if (FULL.has(t)) c++;
          }
          pairs += c; if (c) bad++;
        });
      }
    }
    w.CROSS_SET = saved;
    return { g, bad, pairs, words, full3 };
  }

  console.log('场景      ｜ 版本 ｜ 组数 ｜ 满3词 ｜ 有合理词的组');
  console.log('----------+------+------+-------+--------------');
  for (const [tag, roster, rounds] of [['高频20字', high, 12], ['随机20字', rand, 3]]) {
    for (const [ver, use] of [['v25 ', false], ['现在', true]]) {
      const m = await measure(roster, rounds, use);
      console.log(`${tag} ｜ ${ver} ｜ ${String(m.g).padStart(4)} ｜` +
                  ` ${(m.full3 / m.g * 100).toFixed(0).padStart(3)}%  ｜` +
                  ` ${(m.bad / m.g * 100).toFixed(1).padStart(5)}%（${(m.pairs / m.g).toFixed(2)} 个/组）`);
    }
  }
})();
