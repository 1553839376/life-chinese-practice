const fs=require('fs'); const {JSDOM}=require('jsdom');
const HTML=fs.readFileSync('生活语文练习台.html','utf8');
const dom=new JSDOM(HTML,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.com/p/x'});
setTimeout(()=>{
  const w=dom.window;
  w.openTeacher();
  const t0=Date.now(); w.renderWordList('lib'); const t1=Date.now();
  console.log('700 行渲染', t1-t0, 'ms（jsdom，浏览器通常快 3-5 倍）');
  const tb=w.document.getElementById('libTbody');
  console.log('行数', tb.querySelectorAll('tr').length, '节点数', tb.querySelectorAll('*').length);
},500);
