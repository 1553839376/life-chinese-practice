const fs=require('fs'); const {JSDOM}=require('jsdom');
const HTML=fs.readFileSync('生活语文练习台.html','utf8');
const old=[]; for(let i=0;i<97;i++) old.push({id:'local_char_'+i,kind:'字',w:'字'+i,p:'zi',g:'象形基础',img:'',words:'',sent:'',on:true});
const dom=new JSDOM(HTML,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.com/p/x',
  beforeParse(win){ try{ win.localStorage.setItem('wb2_data_v1',JSON.stringify({students:[],chars:old,words:[],logs:{}})); win.__setok=1; }catch(e){ win.__seterr=String(e); } }});
setTimeout(()=>{
  const w=dom.window;
  console.log('setok',w.__setok,'seterr',w.__seterr);
  console.log('ver',w.localStorage.getItem('wb2_charset_ver'));
  console.log('chars',w.STATE.chars.length);
  console.log('raw len',(w.localStorage.getItem('wb2_data_v1')||'').length);
  console.log('migrate now',w.migrateCharset(),w.STATE.chars.length);
},600);
