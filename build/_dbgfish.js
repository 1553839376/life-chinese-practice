const fs=require('fs'); const {JSDOM}=require('jsdom');
const HTML=fs.readFileSync('生活语文练习台.html','utf8');
const dom=new JSDOM(HTML,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.com/p/x',
  beforeParse(w){ w.scrollTo=function(){}; }});
dom.window.addEventListener('error', e=>console.log('WINDOW ERROR', e.message));
setTimeout(()=>{
  const w=dom.window;
  try{
    const h = w.STATE.chars.find(c=>c.w==='手');
    console.log('char', h && h.w);
    const html = w.fishScene([h,h,h,h]);
    console.log('fishScene len', html.length, html.slice(0,120));
  }catch(e){ console.log('ERR fishScene:', e.message, e.stack.split('\n')[1]); }
  try{
    const h = w.STATE.chars.find(c=>c.w==='手');
    w.startGame('fish',[h]);
    console.log('field class', w.document.getElementById('gameField').className);
    console.log('children', w.document.getElementById('gameField').children.length);
  }catch(e){ console.log('ERR startGame:', e.message); }
}, 600);
