const fs=require('fs'),{JSDOM}=require('jsdom');
const dom=new JSDOM(fs.readFileSync('生活语文练习台.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/'});
const w=dom.window;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
w.addEventListener('load',async()=>{
  await wait(500);
  const ALL=w.STATE.chars.map(c=>c.w);
  function mk(name,chars,count){
    const s={id:'local_'+name,name,types:['认读跟读'],chars:chars.slice(),groups:[],count,status:'在读',photo:'',edited:Date.now()};
    w.STATE.students=w.STATE.students.filter(x=>x.id!==s.id).concat([s]); return s;
  }
  // 路径 A：先建 1 个字的字表（上限 8），后来补到 28 个字
  let a=mk('A',[ALL[0]],8);
  w.syncActive(a); console.log('A 建时字表 1 字，上限 8 → 在学', w.actList(a).length, w.actList(a));
  a.chars=ALL.slice(0,28); w.syncActive(a);
  console.log('A 字表补到 28 字后再同步 → 在学', w.actList(a).length, w.actList(a));

  // 路径 B：字表 28 字，上限先 1 后改 8
  let b=mk('B',ALL.slice(0,28),1);
  w.syncActive(b); console.log('B 上限 1 → 在学', w.actList(b).length);
  b.count=8; w.syncActive(b);
  console.log('B 上限改 8 后再同步 → 在学', w.actList(b).length, w.actList(b));

  // 路径 C：上限 8 建好，临时改 1，再改回 8
  let c=mk('C',ALL.slice(0,28),8);
  w.syncActive(c); console.log('C 上限 8 → 在学', w.actList(c).length);
  c.count=1; w.syncActive(c); console.log('C 临时改 1 → 在学', w.actList(c).length, w.actList(c));
  c.count=8; w.syncActive(c); console.log('C 改回 8 → 在学', w.actList(c).length, w.actList(c));
  process.exit(0);
});
