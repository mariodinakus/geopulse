import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Trophy,Crosshair,Volume2,VolumeX,Flame,X,ChevronUp,ChevronDown,Play,Lock,Check,SkipForward,RotateCcw,Zap} from 'lucide-react';

/* ───────── progression ───────── */
const KEY='geopulse.game.v1';
export const RANKS=['Recruit','Field Scout','Analyst','Senior Analyst','Strategist','Station Chief','Spymaster','Grand Strategist','World Shaper'];
export const levelOf=xp=>Math.floor(Math.sqrt(Math.max(0,xp)/50))+1;
export const xpFor=l=>50*(l-1)**2;
export const rankOf=l=>RANKS[Math.min(RANKS.length-1,Math.floor((l-1)/2))];
export const ACH=[
 {id:'first',name:'First Contact',desc:'Select your first country',goal:1,val:s=>s.countries.length,xp:50},
 {id:'explorer',name:'Explorer',desc:'Visit 10 countries',goal:10,val:s=>s.countries.length,xp:150},
 {id:'carto',name:'Cartographer',desc:'Visit 50 countries',goal:50,val:s=>s.countries.length,xp:500},
 {id:'continents',name:'Globetrotter',desc:'Visit a country on 6 continents',goal:6,val:s=>s.continents.filter(c=>!/seven seas/i.test(c)).length,xp:300},
 {id:'historian',name:'Historian',desc:'Declassify 5 historical events',goal:5,val:s=>s.events.length,xp:150},
 {id:'sealord',name:'Sea Lord',desc:'Inspect 3 maritime chokepoints',goal:3,val:s=>s.chokes.length,xp:150},
 {id:'recon',name:'Recon',desc:'Locate 3 public military bases',goal:3,val:s=>s.bases.length,xp:150},
 {id:'rewind',name:'Time Traveller',desc:'Rewind the world before 1900',goal:1,val:s=>s.flags.rewind1900?1:0,xp:100},
 {id:'thinktank',name:'Think Tank',desc:'Run all 4 intelligence modes',goal:4,val:s=>s.modes.length,xp:150},
 {id:'sectors',name:'Full Access',desc:'Open all 7 sectors',goal:7,val:s=>Object.keys(s.flags).filter(k=>k.startsWith('mod_')).length,xp:150},
 {id:'hunter',name:'Geo Hunter',desc:'Win 5 Geo Hunt rounds',goal:5,val:s=>s.huntWins,xp:250},
 {id:'onfire',name:'On Fire',desc:'Hit a 3-round Geo Hunt streak',goal:3,val:s=>s.bestStreak,xp:300},
 {id:'news',name:'Newshound',desc:'Open 3 source articles',goal:3,val:s=>s.news,xp:100}
];
const blank={xp:0,countries:[],continents:[],events:[],chokes:[],bases:[],fronts:[],modes:[],flags:{},huntWins:0,bestStreak:0,news:0,unlocked:[]};
function load(){try{const r=JSON.parse(localStorage.getItem(KEY)||'null');return r?{...blank,...r,flags:{...(r.flags||{})}}:blank}catch{return blank}}
const nf=n=>new Intl.NumberFormat('en-US').format(Math.round(n));
export function km(a,b){const R=6371,r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLng=(b.lng-a.lng)*r;const x=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
export function heat(d){return d<800?['BURNING','#ff3d6e']:d<2000?['HOT','#ff7a3d']:d<4500?['WARM','#ffc93d']:d<8000?['COLD','#3dc8ff']:['FROZEN','#8fa8ff']}

/* ───────── sound (WebAudio, no files) ───────── */
let ctx;
function ac(){try{if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;ctx=new C()}if(ctx.state==='suspended')ctx.resume();return ctx}catch{return null}}
function tone(freqs,{dur=.12,type='square',gain=.035,gap=.07}={}){const c=ac();if(!c)return;freqs.forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=f;const t=c.currentTime+i*gap;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+dur+.03)})}
const SFX={
 select:()=>tone([740],{dur:.06,type:'triangle',gain:.03}),
 xp:()=>tone([880,1320],{type:'triangle',gap:.055,dur:.1}),
 level:()=>tone([523,659,784,1047,1319],{type:'square',gap:.085,dur:.2,gain:.03}),
 ach:()=>tone([784,988,1175,1568],{type:'triangle',gap:.075,dur:.22,gain:.045}),
 miss:()=>tone([260,196],{type:'sawtooth',gap:.1,dur:.14,gain:.025}),
 fail:()=>tone([330,262,196,131],{type:'sawtooth',gap:.12,dur:.2,gain:.025}),
 win:()=>tone([659,880,1175,1760],{type:'square',gap:.06,dur:.16,gain:.03}),
 start:()=>tone([392,523,784],{type:'triangle',gap:.08,dur:.18,gain:.04})
};

/* ───────── game state hook ───────── */
export function useGame(){
 const [s,setS]=useState(load);const sRef=useRef(s);sRef.current=s;
 const [hunt,setHuntState]=useState(null);const huntRef=useRef(null);
 const setHunt=h=>{huntRef.current=h;setHuntState(h)};
 const [streak,setStreak]=useState(0);const streakRef=useRef(0);
 const [toasts,setToasts]=useState([]),[floats,setFloats]=useState([]);
 const [muted,setMutedState]=useState(()=>{try{return localStorage.getItem(KEY+'.mute')==='1'}catch{return false}});
 const mutedRef=useRef(muted);mutedRef.current=muted;
 const setMuted=v=>{setMutedState(v);try{localStorage.setItem(KEY+'.mute',v?'1':'0')}catch{}};
 useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}},[s]);
 const sfx=useCallback(n=>{if(!mutedRef.current)try{SFX[n]?.()}catch{}},[]);
 const toast=useCallback(t=>{const id=Math.random().toString(36).slice(2);setToasts(x=>[...x,{...t,id}].slice(-4));setTimeout(()=>setToasts(x=>x.filter(y=>y.id!==id)),t.ms||4300)},[]);
 const float=useCallback((amount,label)=>{const id=Math.random().toString(36).slice(2);setFloats(x=>[...x.slice(-2),{id,amount,label}]);setTimeout(()=>setFloats(x=>x.filter(y=>y.id!==id)),1700)},[]);
 const commit=useCallback((next,gain,label)=>{
  const prev=sRef.current;let n={...next,xp:prev.xp+gain};
  const newly=ACH.filter(a=>!n.unlocked.includes(a.id)&&a.val(n)>=a.goal);
  if(newly.length)n={...n,unlocked:[...n.unlocked,...newly.map(a=>a.id)],xp:n.xp+newly.reduce((t,a)=>t+a.xp,0)};
  sRef.current=n;setS(n);
  if(gain>0){float(gain,label);sfx('xp')}
  newly.forEach((a,i)=>setTimeout(()=>{toast({type:'ach',title:a.name,text:a.desc,xp:a.xp});sfx('ach')},380+i*650));
  const L0=levelOf(prev.xp),L1=levelOf(n.xp);
  if(L1>L0)setTimeout(()=>{toast({type:'level',title:'LEVEL '+L1,text:rankOf(L1)!==rankOf(L0)?'Promoted to '+rankOf(L1):rankOf(L1)+' · keep exploring',ms:5200});sfx('level')},300+newly.length*650);
 },[float,toast,sfx]);
 const track=useCallback((kind,item)=>{
  const s0=sRef.current;
  if(kind==='country'){const iso=item?.iso;if(!iso)return;if(s0.countries.includes(iso)){sfx('select');return}
   const cont=item.region&&!s0.continents.includes(item.region)?[...s0.continents,item.region]:s0.continents;
   commit({...s0,countries:[...s0.countries,iso],continents:cont},25,'NEW TERRITORY');return}
  const map={battle:['events',40,'EVENT DECLASSIFIED'],attack:['events',40,'EVENT DECLASSIFIED'],choke:['chokes',40,'CHOKEPOINT SECURED'],base:['bases',30,'BASE LOCATED'],front:['fronts',20,'FRONT SCANNED']};
  if(map[kind]){const [k,g,l]=map[kind];const key=String(item?.id??item?.name);if((s0[k]||[]).includes(key)){sfx('select');return}commit({...s0,[k]:[...(s0[k]||[]),key]},g,l);return}
  if(kind==='mode'){if(s0.modes.includes(item))return;commit({...s0,modes:[...s0.modes,item]},20,'ANALYSIS RUN');return}
  if(kind==='module'){const f='mod_'+item;if(s0.flags[f])return;commit({...s0,flags:{...s0.flags,[f]:1}},15,'SECTOR UNLOCKED');return}
  if(kind==='news'){commit({...s0,news:s0.news+1},10,'INTEL GATHERED');return}
  if(kind==='rewind'){if(s0.flags.rewind1900)return;commit({...s0,flags:{...s0.flags,rewind1900:1}},0,'')}
 },[commit,sfx]);
 const startHunt=useCallback(list=>{
  const pool=list.filter(c=>Number.isFinite(c.lat)&&Number.isFinite(c.lng)&&c.region&&!/antarctica|seven seas/i.test(c.region));
  if(!pool.length)return;const prevIso=huntRef.current?.target?.iso;let t;
  do{t=pool[Math.floor(Math.random()*pool.length)]}while(pool.length>1&&t.iso===prevIso);
  setHunt({target:t,tries:0,status:'playing',guesses:[],round:(huntRef.current?.round||0)+1});sfx('start');
 },[sfx]);
 const guess=useCallback(c=>{
  const h=huntRef.current;if(!h||h.status!=='playing'||!c?.iso)return null;
  if(h.guesses.some(x=>x.iso===c.iso))return 'repeat';
  if(c.iso===h.target.iso){const st=streakRef.current+1;streakRef.current=st;setStreak(st);
   const gain=Math.max(40,Math.round(100*(1+(st-1)*.5))-h.tries*25);
   setHunt({...h,status:'won',gain});const s0=sRef.current;
   commit({...s0,huntWins:s0.huntWins+1,bestStreak:Math.max(s0.bestStreak,st)},gain,st>1?'STREAK ×'+st:'TARGET FOUND');sfx('win');return 'won'}
  const d=Number.isFinite(c.lat)?km(c,h.target):NaN;const tries=h.tries+1;const guesses=[...h.guesses,{name:c.name,iso:c.iso,d}];
  if(tries>=3){streakRef.current=0;setStreak(0);setHunt({...h,tries,guesses,status:'lost'});sfx('fail');return 'lost'}
  setHunt({...h,tries,guesses});sfx('miss');return 'miss';
 },[commit,sfx]);
 const giveUp=useCallback(()=>{const h=huntRef.current;if(h?.status==='playing'){streakRef.current=0;setStreak(0);setHunt({...h,status:'lost'});sfx('fail')}},[sfx]);
 const endHunt=useCallback(()=>setHunt(null),[]);
 const reset=()=>{const n={...blank};sRef.current=n;setS(n);setHunt(null);setStreak(0);streakRef.current=0};
 const level=levelOf(s.xp),cur=xpFor(level),nxt=xpFor(level+1);
 const visited=useMemo(()=>new Set(s.countries),[s.countries]);
 return {s,level,rank:rankOf(level),progress:(s.xp-cur)/(nxt-cur),toNext:nxt-s.xp,track,hunt,huntRef,streak,startHunt,guess,giveUp,endHunt,reset,toasts,floats,muted,setMuted,sfx,visited};
}

/* ───────── UI pieces ───────── */
export function PlayerHUD({g,onTrophies}){
 return <div className="gx-hud">
  <div className="gx-lvl" title={'Level '+g.level+' · '+g.rank}><small>LV</small><b>{g.level}</b></div>
  <div className="gx-hud-main"><div className="gx-hud-row"><span className="gx-rank">{g.rank}</span><span className="gx-xp">{nf(g.s.xp)} XP</span></div><div className="gx-bar"><span style={{width:Math.max(3,g.progress*100)+'%'}}/></div><div className="gx-next">{nf(g.toNext)} XP to LV {g.level+1}</div></div>
  <button className="gx-icon" onClick={onTrophies} aria-label="Missions and achievements"><Trophy size={16}/>{g.s.unlocked.length>0&&<i>{g.s.unlocked.length}</i>}</button>
  <button className="gx-icon" onClick={()=>g.setMuted(!g.muted)} aria-label={g.muted?'Unmute sound':'Mute sound'}>{g.muted?<VolumeX size={16}/>:<Volume2 size={16}/>}</button>
 </div>
}
function MissionRow({a,s}){const v=Math.min(a.goal,a.val(s)),done=s.unlocked.includes(a.id);return <div className={'gx-mission '+(done?'done':'')}><div className="gx-mission-ico">{done?<Check size={13}/>:v>0?<Zap size={13}/>:<Lock size={12}/>}</div><div className="gx-mission-body"><div><b>{a.name}</b><span>+{a.xp} XP</span></div><small>{a.desc}</small><div className="gx-mini-bar"><span style={{width:(v/a.goal*100)+'%'}}/></div></div><em>{v}/{a.goal}</em></div>}
export function QuestPanel({g,onHunt,onAll}){
 const [open,setOpen]=useState(true);
 const next=ACH.filter(a=>!g.s.unlocked.includes(a.id)).sort((a,b)=>b.val(g.s)/b.goal-a.val(g.s)/a.goal).slice(0,3);
 return <div className={'gx-quests '+(open?'':'closed')}>
  <button className="gx-quests-head" onClick={()=>setOpen(v=>!v)}><span><Crosshair size={13}/> ACTIVE MISSIONS</span><em>{g.s.unlocked.length}/{ACH.length}</em>{open?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>
  {open&&<><div className="gx-quests-list">{next.length?next.map(a=><MissionRow key={a.id} a={a} s={g.s}/>):<div className="gx-all-done">All missions complete. Legend status.</div>}</div>
  <div className="gx-quests-actions"><button className="gx-cta" onClick={onHunt}><Crosshair size={14}/> PLAY GEO HUNT</button><button className="gx-ghost" onClick={onAll}>ALL</button></div></>}
 </div>
}
export function HuntBanner({g,onNext}){
 const h=g.hunt;if(!h)return null;const t=h.target,last=h.guesses[h.guesses.length-1];
 return <div className={'gx-hunt '+h.status}>
  <div className="gx-hunt-top"><span><Crosshair size={13}/> GEO HUNT · ROUND {h.round}</span>{g.streak>0&&<span className="gx-streak"><Flame size={13}/> ×{g.streak}</span>}<button onClick={g.endHunt} aria-label="Quit Geo Hunt"><X size={15}/></button></div>
  {h.status==='playing'&&<>
   <small className="gx-hunt-label">LOCATE ON THE GLOBE</small>
   <h3>{t.name}</h3>
   <div className="gx-lives">{[0,1,2].map(i=><span key={i} className={i<3-h.tries?'on':''}/>)}<em>{3-h.tries} {3-h.tries===1?'attempt':'attempts'} left</em></div>
   {last&&<div className="gx-heat" style={{'--heat':heat(last.d)[1]}}><b>{heat(last.d)[0]}</b><span>{last.name} · {Number.isFinite(last.d)?nf(last.d)+' km away':'distance unknown'}</span></div>}
   {h.tries>=1&&<div className="gx-hint">HINT · {t.region}{h.tries>=2?' · starts with “'+t.name[0]+'”':''}</div>}
   <div className="gx-hunt-actions"><button className="gx-ghost" onClick={g.giveUp}><SkipForward size={13}/> REVEAL</button></div>
  </>}
  {h.status==='won'&&<><small className="gx-hunt-label">TARGET ACQUIRED</small><h3>{t.name}</h3><div className="gx-win">+{h.gain} XP{g.streak>1?' · streak bonus':''}</div><div className="gx-hunt-actions"><button className="gx-cta" onClick={onNext}><Play size={13}/> NEXT TARGET</button><button className="gx-ghost" onClick={g.endHunt}>EXIT</button></div></>}
  {h.status==='lost'&&<><small className="gx-hunt-label">MISSION FAILED · IT WAS</small><h3>{t.name}</h3><div className="gx-lose">{t.region} · streak reset</div><div className="gx-hunt-actions"><button className="gx-cta" onClick={onNext}><RotateCcw size={13}/> TRY ANOTHER</button><button className="gx-ghost" onClick={g.endHunt}>EXIT</button></div></>}
 </div>
}
export function Floats({g}){return <div className="gx-floats" aria-hidden="true">{g.floats.map(f=><div key={f.id} className="gx-float"><b>+{f.amount} XP</b>{f.label&&<span>{f.label}</span>}</div>)}</div>}
export function Toasts({g}){return <div className="gx-toasts" role="status">{g.toasts.map(t=><div key={t.id} className={'gx-toast '+t.type}><div className="gx-toast-ico">{t.type==='level'?<Zap size={20}/>:<Trophy size={20}/>}</div><div><small>{t.type==='level'?'LEVEL UP':'ACHIEVEMENT UNLOCKED'}</small><b>{t.title}</b><span>{t.text}{t.xp?' · +'+t.xp+' XP':''}</span></div></div>)}</div>}
export function AchievementsModal({g,total,onClose,onHunt}){
 const conts=g.s.continents.filter(c=>!/seven seas/i.test(c)).length;
 return <div className="gp-search-backdrop" onClick={onClose}><div className="gx-modal" onClick={e=>e.stopPropagation()}>
  <div className="gx-modal-head"><div className="gx-lvl big"><small>LV</small><b>{g.level}</b></div><div><small>COMMANDER PROFILE</small><h2>{g.rank}</h2><div className="gx-bar"><span style={{width:Math.max(3,g.progress*100)+'%'}}/></div><span className="gx-next">{nf(g.s.xp)} XP · {nf(g.toNext)} to level {g.level+1}</span></div><button onClick={onClose} aria-label="Close"><X size={19}/></button></div>
  <div className="gx-stats"><div><b>{g.s.countries.length}<small>/{total}</small></b><span>Territories</span></div><div><b>{conts}<small>/6</small></b><span>Continents</span></div><div><b>{g.s.huntWins}</b><span>Hunts won</span></div><div><b>{g.s.bestStreak}</b><span>Best streak</span></div></div>
  <div className="gx-ach-grid">{ACH.map(a=><MissionRow key={a.id} a={a} s={g.s}/>)}</div>
  <div className="gx-modal-foot"><button className="gx-cta" onClick={onHunt}><Crosshair size={14}/> PLAY GEO HUNT</button><button className="gx-ghost" onClick={()=>{if(confirm('Reset all XP, missions and visited territories?'))g.reset()}}>RESET PROGRESS</button></div>
 </div></div>
}
export function BootScreen({g,onStart}){
 const returning=g.s.xp>0;
 return <div className="gx-boot">
  <div className="gx-boot-grid" aria-hidden="true"/>
  <div className="gx-boot-core">
   <div className="gx-boot-orb" aria-hidden="true"><span/><span/><span/></div>
   <small>A GEOPOLITICAL STRATEGY EXPERIENCE</small>
   <h1>GEO<span>PULSE</span></h1>
   <p>The world is your game board. Explore real countries, declassify historical events, secure chokepoints and hunt targets across the globe.</p>
   <button className="gx-start" onClick={onStart}><Play size={18}/> {returning?'CONTINUE':'PRESS START'}</button>
   {returning&&<div className="gx-boot-save">SAVE FOUND · LEVEL {g.level} {g.rank.toUpperCase()} · {nf(g.s.xp)} XP</div>}
   <div className="gx-boot-tips"><span>CLICK COUNTRIES · +25 XP</span><span>EVENTS · +40 XP</span><span>GEO HUNT · STREAK BONUSES</span></div>
  </div>
 </div>
}
const clamp=v=>Math.max(0,Math.min(100,v));
export function PowerCard({data}){
 const gdp=data?.gdp?.value,pop=data?.population?.value,inf=data?.inflation?.value,mil=data?.militaryPctGDP?.value;
 const stats=[
  ['ECONOMIC POWER',gdp!=null?clamp((Math.log10(gdp)-9)/(13.5-9)*100):null,'#2ef2ff'],
  ['POPULATION',pop!=null?clamp((Math.log10(pop)-5)/(9.2-5)*100):null,'#b6ff3b'],
  ['PRICE STABILITY',inf!=null?clamp(100-Math.abs(inf-2)*6):null,'#ffc93d'],
  ['MILITARY EFFORT',mil!=null?clamp(mil/6*100):null,'#ff3dbb']
 ];
 const w=[.45,.25,.15,.15];let tot=0,ws=0;stats.forEach(([, v],i)=>{if(v!=null){tot+=v*w[i];ws+=w[i]}});
 if(!ws)return null;const score=Math.round(tot/ws);const tier=score>=80?'S':score>=65?'A':score>=50?'B':score>=35?'C':'D';
 return <div className="gx-power">
  <div className="gx-power-head"><div className={'gx-tier t'+tier}>{tier}</div><div><small>POWER RATING</small><b>{score}<span>/100</span></b></div></div>
  {stats.map(([n,v,c])=><div className="gx-stat" key={n}><div><span>{n}</span><b>{v==null?'—':Math.round(v)}</b></div><div className="gx-stat-bar"><span style={{width:(v||0)+'%',background:c,boxShadow:'0 0 10px '+c}}/></div></div>)}
  <p>Game rating derived from the latest World Bank values below. For play — not an official ranking.</p>
 </div>
}
