const fs=require('fs'),{JSDOM}=require('jsdom');
const dom=new JSDOM(fs.readFileSync('生活语文练习台.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/'});
const w=dom.window,d=w.document;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
w.addEventListener('load',async()=>{
  await wait(500);
  const pool=w.STATE.chars.map(c=>c.w).slice(0,28);
  // 老师那份数据：字表 28 字、在学上限 8、active 只剩「女」、女已学会
  const stu={id:'local_case',name:'森岛帆高',types:['认读跟读','图字配对','看拼音写字','拼词语','汉字听写','描红汉字'],
             chars:pool,groups:[],count:8,status:'在读',photo:'',active:['女'],edited:Date.now()};
  w.STATE.students=w.STATE.students.filter(s=>s.id!==stu.id).concat([stu]);
  w.STATE.logs[w.logKey('森岛帆高','女')]={n:8,alone:8,wrong:0,hinted:0,last:new Date().toISOString()};
  w.saveSnap();
  w.enterStudent('森岛帆高'); await wait(250);
  const act=w.stuActive(stu), today=w.todayChars(stu).map(c=>c.w);
  const homeN = d.querySelectorAll('#stage .home-chip, #stage .home-char').length;
  d.getElementById('homeGo').click(); await wait(200);
  const cards=Array.from(d.querySelectorAll('#stage .pre-card')).map(c=>c.getAttribute('data-pre'));
  console.log('在学名单', act.length, act.join(''));
  console.log('今日字单', today.length, today.join(''));
  console.log('主页今天的字块数', homeN);
  console.log('字卡张数', cards.length, cards.join(''));
  const p=w.stuProfile(stu);
  console.log('档案：已学会', p.mastered, '｜在学', p.act, '｜排队', p.standby, '｜总', p.total);
  process.exit(0);
});
