const fs=require('fs'),{JSDOM}=require('jsdom');
const dom=new JSDOM(fs.readFileSync('生活语文练习台.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/'});
const w=dom.window,d=w.document;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const txt=el=>el?el.textContent.replace(/\s+/g,' ').trim():'(无)';
w.addEventListener('load',async()=>{
  await wait(500);
  const chars=w.STATE.chars.map(c=>c.w).slice(0,10);
  const stu={id:'l_multi',name:'多题型',types:['认读跟读','图字配对','拼词语'],chars,groups:[],
             count:6,status:'在读',photo:'',edited:Date.now()};
  w.STATE.students=w.STATE.students.filter(s=>s.id!==stu.id).concat([stu]);
  w.saveSnap();
  w.enterStudent('多题型'); await wait(250);
  console.log('主页时 进度条：', txt(d.getElementById('typeProg')));

  d.getElementById('homeGo').click(); await wait(200);
  d.getElementById('preGo').click(); await wait(250);
  console.log('点开始练习 → 题型', w.STATE.quiz && w.STATE.quiz.type, '｜进度', txt(d.getElementById('typeProg')));

  async function finishRound(){
    const z=w.STATE.quiz;
    z.i=z.qs.length;
    for(let i=0;i<z.qs.length;i++) z.right+=(z.qs[i].words?z.qs[i].words.length:1);
    w.renderSummary(); await wait(120);
  }
  await finishRound();
  console.log('第 1 轮结算：', txt(d.querySelector('#stage .q-ask')), '｜按钮',
    [...d.querySelectorAll('#stage .row button')].map(b=>b.textContent.trim()).join(' / '));
  console.log('  进度', txt(d.getElementById('typeProg')));

  d.getElementById('btnNextType').click(); await wait(250);
  console.log('点下一个题型 → 题型', w.STATE.quiz && w.STATE.quiz.type);
  await finishRound();
  d.getElementById('btnNextType').click(); await wait(250);
  console.log('第 3 个题型 →', w.STATE.quiz && w.STATE.quiz.type);
  await finishRound();
  console.log('最后一轮结算：', txt(d.querySelector('#stage .q-ask')),
    '｜大字', txt(d.querySelector('#stage .done-hero')),
    '｜按钮', [...d.querySelectorAll('#stage .row button')].map(b=>b.textContent.trim()).join(' / '));
  console.log('  进度', txt(d.getElementById('typeProg')));
  console.log('  圆点', [...d.querySelectorAll('#typeProg .tp-dot')].map(x=>x.textContent+'/'+x.className.replace('tp-dot','').trim()).join(' '));
  process.exit(0);
});
