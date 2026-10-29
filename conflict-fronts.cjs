// Broad geographic intelligence catalogue. Coordinates are regional anchors, never tactical positions.
// A front being monitored does NOT claim an attack is occurring at this moment.
const FRONT_DEFS=[
{id:'ukraine',label:'Russia–Ukraine',labelEl:'Ρωσία – Ουκρανία',region:'Eastern Europe',lat:49.0,lng:32.0,category:'conflict',priority:1,impact:'Global',channels:['European security','Energy','Food exports','Sanctions'],why:'Security in Europe, NATO exposure, grain routes, sanctions and energy markets.',query:'(Ukraine OR Kyiv OR Kharkiv OR Donetsk) (attack OR strike OR fighting OR offensive OR drone OR ceasefire)'},
{id:'levant',label:'Israel / Gaza / Lebanon',labelEl:'Ισραήλ – Γάζα – Λίβανος',region:'Eastern Mediterranean',lat:32.3,lng:35.0,category:'conflict',priority:2,impact:'Global',channels:['Regional security','Humanitarian crisis','Diplomacy','Shipping'],why:'Regional escalation risk, humanitarian effects, diplomacy and wider economic transmission.',query:'(Gaza OR Israel OR Lebanon OR Hezbollah) (airstrike OR fighting OR ceasefire OR military OR attack OR war)'},
{id:'iran-gulf',label:'Iran / Persian Gulf',labelEl:'Ιράν – Περσικός Κόλπος',region:'Persian Gulf',lat:27.4,lng:53.0,category:'flashpoint',priority:3,impact:'Global',channels:['Oil & gas','Hormuz shipping','Regional security'],why:'A strategic flashpoint for energy supply and maritime transit; monitoring does not mean active combat.',query:'(Iran OR Hormuz OR Persian Gulf) (military OR attack OR strike OR threat OR escalation OR navy)'},
{id:'sudan',label:'Sudan',labelEl:'Σουδάν',region:'Northeast Africa',lat:15.4,lng:30.0,category:'conflict',priority:4,impact:'Regional',channels:['Civilian protection','Displacement','Red Sea region'],why:'Large humanitarian and displacement consequences with cross-border effects.',query:'Sudan (RSF OR army OR fighting OR airstrike OR conflict OR humanitarian)'},
{id:'red-sea',label:'Yemen / Red Sea',labelEl:'Υεμένη – Ερυθρά Θάλασσα',region:'Red Sea',lat:15.1,lng:44.6,category:'conflict',priority:5,impact:'Global',channels:['Suez route','Maritime insurance','Supply chains'],why:'Red Sea traffic and shipping risk can transmit into freight prices and global supply chains.',query:'(Yemen OR Houthi OR Red Sea) (attack OR strike OR shipping OR vessel OR ceasefire OR conflict)'},
{id:'drc',label:'Eastern DR Congo',labelEl:'Ανατολικό Κονγκό',region:'Central Africa',lat:-1.5,lng:28.6,category:'conflict',priority:6,impact:'Regional',channels:['Displacement','Regional stability','Critical minerals'],why:'Population displacement, regional security and important mineral supply chains.',query:'(Congo OR DRC OR Goma OR M23) (fighting OR rebels OR offensive OR attack OR ceasefire)'},
{id:'myanmar',label:'Myanmar',labelEl:'Μιανμάρ',region:'Southeast Asia',lat:20.4,lng:96.3,category:'conflict',priority:7,impact:'Regional',channels:['Humanitarian crisis','Border trade','Regional stability'],why:'Internal conflict, civilian harm and consequences for neighboring states.',query:'Myanmar (junta OR rebels OR fighting OR airstrike OR resistance OR ceasefire)'},
{id:'sahel',label:'Sahel',labelEl:'Σαχέλ',region:'West Africa',lat:15.2,lng:1.1,category:'conflict',priority:8,impact:'Regional',channels:['Regional security','Displacement','Trade corridors'],why:'Cross-border insecurity and humanitarian consequences across the Sahel.',query:'(Mali OR Burkina Faso OR Niger OR Sahel) (militants OR attack OR insurgency OR army OR conflict)'},
{id:'taiwan',label:'Taiwan Strait',labelEl:'Στενό της Ταϊβάν',region:'East Asia',lat:24.0,lng:120.0,category:'flashpoint',priority:9,impact:'Global',channels:['Semiconductors','Trade routes','Major-power tensions'],why:'Strategic tension and trade/technology exposure; NOT labelled an ongoing war.',query:'(Taiwan OR Taiwan Strait) (military OR drills OR tensions OR blockade OR naval OR airspace)'}
];
const CATALOGUE=FRONT_DEFS.map(({query,...rest})=>({...rest,coordinatePrecision:'Approximate region centre; not a battle or strike location'}));
const CACHE=new Map();
const WINDOWS=new Set(['24h','72h','7d']);
function validUrl(value){try{const p=new URL(value);return ['https:','http:'].includes(p.protocol)?p.href:null}catch{return null}}
function cleanArticle(x){
 const url=validUrl(x.url);if(!url||!x.title)return null;
 return {title:String(x.title).slice(0,350),url,domain:String(x.domain||new URL(url).hostname).slice(0,90),date:String(x.seendate||'').slice(0,20),language:String(x.language||'').slice(0,40),sourceCountry:String(x.sourcecountry||'').slice(0,60)};
}
async function pullArticles(front,window){
 const query=new URLSearchParams({query:front.query,mode:'artlist',maxrecords:'50',format:'json',sort:'datedesc',timespan:window});
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12500);
 try{
  const r=await fetch('https://api.gdeltproject.org/api/v2/doc/doc?'+query.toString(),{signal:controller.signal,headers:{'Accept':'application/json','User-Agent':'GeoPulse/3.1 (public geopolitical news index)'}});
  if(!r.ok)throw Error('Upstream status '+r.status);
  const result=await r.json();if(!Array.isArray(result.articles))throw Error('Missing GDELT article list');
  const dedup=new Set();
  const articles=result.articles.map(cleanArticle).filter(Boolean).filter(x=>{if(dedup.has(x.url))return false;dedup.add(x.url);return true}).slice(0,40);
  return {articles,updatedAt:new Date().toISOString(),status:'ok'};
 }finally{clearTimeout(timer)}
}
async function getFronts(url){
 const id=url.searchParams.get('id');
 if(!id)return {status:'catalogue',fronts:CATALOGUE,source:'GeoPulse editorial watchlist',message:'Monitoring categories and priority are editorial, not live battle intensity. Select a front to load news.'};
 const front=FRONT_DEFS.find(x=>x.id===id);
 if(!front)return {error:'Unknown region',status:'invalid'};
 const window=WINDOWS.has(url.searchParams.get('window'))?url.searchParams.get('window'):'72h';
 const key=id+'/'+window,old=CACHE.get(key);
 if(old&&Date.now()-old.time<8*60*1000)return {...old.value,cache:'fresh'};
 try{
  const fresh=await pullArticles(front,window);
  const value={id,window,source:'GDELT DOC 2.0',...fresh,disclaimer:'Indexed media articles, not independently verified battles or live tactical geolocation. Article dates and reports may be incomplete.'};
  CACHE.set(key,{time:Date.now(),value});
  return {...value,cache:'new'};
 }catch(e){
  if(old)return {...old.value,status:'stale',cache:'stale',message:'Upstream unavailable; showing older cached articles',error:String(e.message||e).slice(0,160)};
  return {id,window,articles:[],status:'unavailable',source:'GDELT DOC 2.0',updatedAt:null,error:String(e.message||e).slice(0,160),message:'Live article source unavailable; no headlines have been fabricated.'};
 }
}
module.exports={getFronts};
