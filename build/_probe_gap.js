const fs=require('fs'),{JSDOM}=require('jsdom');
const dom=new JSDOM(fs.readFileSync('生活语文练习台.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/'});
const w=dom.window;
w.addEventListener('load',()=>setTimeout(()=>{
  ['一上','六上'].forEach(tag=>{
    const g = tag==='一上' ? '一年级上册' : '六年级上册-认';
    const chars = w.STATE.chars.filter(c=>c.g===g).map(c=>c.w).slice(0,20).join('');
    [2,4,6,8].forEach(gap=>{
      w.WB_STAGE_GAP=gap;
      const stu={id:'l'+tag+gap,name:'P'+tag+gap,types:['拼词语'],chars:chars.split(''),groups:[],count:12,status:'在读',photo:'',edited:Date.now()};
      w.STATE.students=w.STATE.students.filter(s=>s.id!==stu.id).concat([stu]);
      let groups=0,w3=0,w2=0,worst=0;
      for(let r=0;r<6;r++){
        w.enterStudent(stu.name); w.startQuiz('拼词语');
        const z=w.STATE.quiz; if(!z||z.type!=='拼词语')continue;
        z.qs.forEach(q=>{groups++; q.words.length>=3?w3++:w2++;
          q.words.forEach(x=>{const o=!chars.includes(x.a)?w.charStage(x.a):(!chars.includes(x.b)?w.charStage(x.b):-1);
            if(o>worst)worst=o;});});
      }
      console.log(`${tag} gap=${gap}  组/局 ${(groups/6).toFixed(1)}  3词 ${w3} 2词 ${w2}  超纲最深册次 ${worst}`);
    });
  });
  process.exit(0);
},600));
