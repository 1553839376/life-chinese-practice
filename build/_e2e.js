const fs=require('fs'); const {JSDOM}=require('jsdom');
const HTML=fs.readFileSync('生活语文练习台.html','utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const dom=new JSDOM(HTML,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.com/p/e'});
  await wait(500);
  const w=dom.window,d=w.document;
  w.openTeacher(); await wait(120);
  d.getElementById('btnStuNew').click(); await wait(80);
  d.getElementById('fStuName').value='小测';
  const gAll=d.querySelector('#fStuCharList .char-g-all'); if(gAll) gAll.click();   /* v11：字表按组加入 */
  d.querySelectorAll('#fStuTypes input').forEach(x=>{x.checked=true;});
  d.getElementById('btnStuSave').click(); await wait(400);
  w.enterStudent('小测'); await wait(250);
  console.log('类型 tab：', [...d.querySelectorAll('.type-tab')].map(x=>x.textContent).join(' | '));
  const types=['听音找字','找一样的字','认读跟读','图字配对','看拼音写字'];
  for(const t of types){
    const tab=[...d.querySelectorAll('.type-tab')].filter(x=>x.textContent===t)[0];
    if(!tab){ console.log(t,'→ 无此 tab'); continue; }
    tab.click(); await wait(200);
    const q=w.STATE.quiz;
    const stem=w.document.getElementById('stage');
    console.log(t,'→ 题数', q&&q.qs?q.qs.length:0, '| 选项', d.querySelectorAll('.opt,.drag-char').length,
      '| 有图', /<img|<svg/.test(stem.innerHTML), '| 首行', stem.textContent.replace(/\s+/g,' ').trim().slice(0,50));
  }
})();
