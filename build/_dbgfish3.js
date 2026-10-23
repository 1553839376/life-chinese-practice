const fs=require('fs'); const {JSDOM}=require('jsdom');
const HTML=fs.readFileSync('生活语文练习台.html','utf8');
const played=[];
const dom=new JSDOM(HTML,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.com/p/x',
  beforeParse(w){
    w.scrollTo=function(){};
    const AC = function(){ this.currentTime=0; this.destination={}; this.state='running';
      this.resume=()=>Promise.resolve();
      this.createGain=()=>({gain:{setValueAtTime(){},exponentialRampToValueAtTime(){},value:1,linearRampToValueAtTime(){}},connect(){},disconnect(){}});
      this.createBufferSource=()=>({buffer:null,playbackRate:{value:1},connect(){},disconnect(){},stop(){},start(){}});
      this.createOscillator=()=>({type:'sine',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){},stop(){}});
      this.createBiquadFilter=()=>({type:'',frequency:{value:0,setValueAtTime(){}},Q:{value:0},connect(){}});
      this.decodeAudioData=(b,cb)=>cb({duration:.5,sampleRate:22050});
      this.createBuffer=(a,b,c)=>({duration:b/c,getChannelData:()=>new Float32Array(b)});
    };
    w.AudioContext=AC; w.webkitAudioContext=AC;
  }});
setTimeout(async ()=>{
  const w=dom.window;
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const orig = w.vaPlay;
  w.vaPlay = function(seg){ played.push(seg); return orig.apply(w, arguments); };
  const h = w.STATE.chars.find(c=>c.w==='手');
  for (const kind of ['bubble','fish']){
    played.length=0;
    w.startGame(kind,[h]);
    await wait(1200);
    console.log(kind, '→', JSON.stringify(played.map(s=>Array.isArray(s)?s.map(x=>x.k):s)));
    w.quitGame(true);
    await wait(200);
  }
}, 700);
