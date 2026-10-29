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

const CATALOGUE=FRONT_DEFS.map(({query,...front})=>({
 ...front,coordinatePrecision:'Approximate region centre; not a verified battle or strike coordinate'
}));
const CACHE=new Map();
const WINDOWS=new Set(['24h','72h','7d']);
const FOCUSES={
 all:'captured OR seized OR recaptured OR liberated OR control OR retreated OR withdrew OR withdrawal OR casualties OR killed OR wounded OR destroyed OR offensive OR airstrike OR fighting OR ceasefire',
 territory:'captured OR seized OR recaptured OR liberated OR occupied OR advances OR control OR village OR town OR territory',
 withdrawals:'retreated OR withdrew OR withdrawal OR pullback OR retaking OR abandoned OR lost OR fallback',
 losses:'casualties OR killed OR wounded OR deaths OR dead OR fatalities OR injured OR losses OR destroyed OR prisoners OR displaced',
 attacks:'airstrike OR missile OR drone OR shelling OR bombardment OR clashes OR fighting OR offensive OR attack',
 diplomacy:'ceasefire OR truce OR peace OR negotiations OR agreement OR diplomacy OR mediation'
};
const FRONT_PATTERNS={
 ukraine:/\b(ukrain|russia|russian|kyiv|kiev|kharkiv|donetsk|zaporizh|kherson)\w*/i,
 levant:/\b(israel|gaza|palestin|lebanon|lebanese|hezbollah|hamas|west bank)\w*/i,
 'iran-gulf':/\b(iran|iranian|hormuz|persian gulf)\w*/i,
 sudan:/\b(sudan|darfur|khartoum|rsf)\w*/i,
 'red-sea':/\b(yemen|yemeni|houthi|red sea|bab el.mandeb)\w*/i,
 drc:/\b(congo|congolese|goma|north kivu|m23)\w*/i,
 myanmar:/\b(myanmar|burma|burmese|junta|rakhine)\w*/i,
 sahel:/\b(sahel|mali|burkina faso|niger|jihadists)\w*/i,
 taiwan:/\b(taiwan|taiwanese|taipei|taiwan strait)\w*/i
};
const WITHDRAWALS=/\b(retreat\w*|withdrew|withdraw\w*|withdrawal|pullback|pulled back|abandon\w*|lost control|forced back|falling back)\b/i;
const TERRITORY=/\b(recaptur\w*|captur\w*|seiz\w*|liberat\w*|occupi\w*|territor\w*|retreat\w*|withdraw\w*|withdrawal|advanc\w*|lost control|take\w* control|took control|territorial gains|falls? to|fall of|conquer\w*)\b/i;
const LOSSES=/\b(casualt\w*|fatalit\w*|killed|death\w*|dead|wounded|injur\w*|losses|soldiers lost|troops killed|destroyed|prisoners|pows?|humanitarian toll)\b/i;
const ATTACKS=/\b(airstrik\w*|attack\w*|missile\w*|drone\w*|shell\w*|bombard\w*|offensive\w*|fighting|clashes|battle\w*|explosions?)\b/i;
const DIPLOMACY=/\b(ceasefire|truce|negotiat\w*|peace talks|peace deal|diplomac\w*|mediati\w*|talks resume)\b/i;
function classify(title) {
 const text=String(title||'');
 // Territorial outcomes and losses are editorial signals extracted from headlines, NOT confirmed event classifications.
 if(WITHDRAWALS.test(text))return 'withdrawals';
 if(TERRITORY.test(text)&&!/\b(captured soldiers|troops captured|captured prisoners|captured troops|hostages captured)\b/i.test(text))return 'territory';
 if(LOSSES.test(text))return 'losses';
 if(ATTACKS.test(text))return 'attacks';
 if(DIPLOMACY.test(text))return 'diplomacy';
 return 'other';
}
function validUrl(value){try{const p=new URL(value);return ['https:','http:'].includes(p.protocol)?p.href:null}catch{return null}}
function identifyFront(title) {
 for(const front of FRONT_DEFS)if(FRONT_PATTERNS[front.id]?.test(String(title||'')))return {id:front.id,label:front.labelEl};
 return {id:'other',label:'Άλλες περιοχές'};
}
function cleanArticle(x,frontId){
 const url=validUrl(x.url);
 if(!url||!x.title)return null;
 const title=String(x.title).trim().slice(0,350);
 const group=frontId?FRONT_DEFS.find(f=>f.id===frontId):null;
 const front=group?{id:group.id,label:group.labelEl}:identifyFront(title);
 return {
  title,url,domain:String(x.domain||new URL(url).hostname).slice(0,90),
  date:String(x.seendate||'').slice(0,20),language:String(x.language||'').slice(0,35),
  sourceCountry:String(x.sourcecountry||'').slice(0,60),
  category:classify(title),frontId:front.id,frontLabel:front.label,
  verification:'unverified_article',attribution:'Source headline; no independent fact check'
 };
}
const GLOBAL_BASE='(Ukraine OR Russia OR Israel OR Gaza OR Lebanon OR Iran OR Sudan OR Yemen OR Congo OR Myanmar OR Mali OR Niger OR Taiwan OR Sahel)';
const RSS_SUBJECTS={
 ukraine:'Ukraine OR Russia OR Donetsk',
 levant:'Israel OR Gaza OR Lebanon',
 'iran-gulf':'Iran OR Hormuz',
 sudan:'Sudan OR Darfur',
 'red-sea':'Yemen OR Houthi OR "Red Sea"',
 drc:'Congo OR DRC OR Goma OR M23',
 myanmar:'Myanmar OR Burma',
 sahel:'Mali OR "Burkina Faso" OR Niger OR Sahel',
 taiwan:'Taiwan OR "Taiwan Strait"'
};
const RSS_FOCUS={
 territory:'captured OR recaptured OR seized OR advances OR frontline OR control',
 withdrawals:'retreat OR withdrawal OR withdrew OR pullback OR abandoned',
 losses:'casualties OR killed OR wounded OR deaths OR losses',
 attacks:'airstrike OR missile OR attack OR shelling OR offensive OR fighting',
 diplomacy:'ceasefire OR negotiations OR talks OR truce',
 all:'captured OR retreat OR casualties OR offensive OR ceasefire'
};
let gdeltCooldownUntil=0;
function queryFor(front,focus){
 if(!front)return GLOBAL_BASE+' ('+FOCUSES[focus]+')';
 const subject=front.query.replace(/\s+\([^()]+\)\s*$/,'');
 return subject+' ('+FOCUSES[focus]+')';
}
async function remoteArticles(front,window,focus){
 const query=new URLSearchParams({
  query:queryFor(front,focus),mode:'artlist',
  maxrecords:front?'120':'200',format:'json',sort:'datedesc',timespan:window
 });
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),5200);
 try{
  const response=await fetch('https://api.gdeltproject.org/api/v2/doc/doc?'+query.toString(),{
   signal:controller.signal,
   headers:{Accept:'application/json','User-Agent':'GeoPulse/4.1 (news index; sources attributed)'}
  });
  if(!response.ok)throw Error('GDELT HTTP '+response.status);
  const data=await response.json();
  if(!Array.isArray(data.articles))throw Error('GDELT did not return an article list');
  const urls=new Set(),titles=new Set();
  return data.articles.map(x=>cleanArticle(x,front?.id)).filter(Boolean)
   .filter(x=>{
    const normalized=x.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
    if(urls.has(x.url)||titles.has(normalized))return false;
    urls.add(x.url);titles.add(normalized);return true;
   });
 }finally{clearTimeout(timeout)}
}
function xmlDecode(value){
 return String(value||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
  .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(raw,key)=>{
   const v=key.toLowerCase();
   if(v.startsWith('#')){
    const n=v[1]==='x'?parseInt(v.slice(2),16):parseInt(v.slice(1),10);
    return Number.isInteger(n)&&n>0&&n<=0x10ffff?String.fromCodePoint(n):raw;
   }
   return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[v]||raw;
  }).trim();
}
function xmlValue(xml,tag){
 const pattern=new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i');
 return xmlDecode(xml.match(pattern)?.[1]||'');
}
function asTimeStamp(input){
 const d=new Date(input);
 if(!Number.isFinite(d.getTime()))return '';
 return d.toISOString().replace(/[-:TZ.]/g,'').slice(0,14);
}
function parseFeed(xml,front,sourceName){
 if(!xml.includes('<rss')&&!xml.includes('<item'))throw Error(sourceName+' did not return RSS XML');
 const rows=[],seen=new Set();
 for(const entry of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)){
  const block=entry[1],title=xmlValue(block,'title'),link=xmlValue(block,'link');
  const publisher=xmlValue(block,'source')||sourceName;
  const article=cleanArticle({title,url:link,domain:publisher,seendate:asTimeStamp(xmlValue(block,'pubDate')),language:'en'},front?.id);
  if(!article)continue;
  const key=article.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  if(seen.has(key))continue;
  seen.add(key);
  article.provider=sourceName;
  rows.push(article);
 }
 return rows.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,90);
}
function rssQuery(front,focus,window){
 const subject=front?RSS_SUBJECTS[front.id]:'Ukraine OR Gaza OR Israel OR Sudan OR Congo OR Myanmar OR Russia OR Yemen';
 const terms=RSS_FOCUS[focus]||RSS_FOCUS.all;
 const when=window==='24h'?'1d':window==='72h'?'3d':'7d';
 return '('+subject+') ('+terms+') when:'+when;
}
async function fetchRSS(front,window,focus,provider){
 const q=rssQuery(front,focus,window);
 const url=provider==='Google News RSS'
 ?'https://news.google.com/rss/search?'+new URLSearchParams({q,hl:'en-US',gl:'US',ceid:'US:en'})
 :'https://www.bing.com/news/search?'+new URLSearchParams({q,format:'rss'});
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),7200);
 try{
  const response=await fetch(url,{signal:controller.signal,
   headers:{Accept:'application/rss+xml, application/xml, text/xml',
    'User-Agent':'Mozilla/5.0 (compatible; GeoPulseNewsReader/1.0)'}});
  if(!response.ok)throw Error(provider+' HTTP '+response.status);
  const body=await response.text();
  return parseFeed(body,front,provider);
 }finally{clearTimeout(timeout)}
}
async function findArticles(front,window,focus){
 const failed=[];
 if(Date.now()>=gdeltCooldownUntil){
  try{
   const articles=await remoteArticles(front,window,focus);
   if(articles.length)return {articles,source:'GDELT DOC 2.0',failed};
   failed.push('GDELT returned zero articles');
  }catch(e){
   failed.push(String(e.message||e).slice(0,100));
   if(/429|403/.test(String(e.message)))gdeltCooldownUntil=Date.now()+5*60*1000;
  }
 }else failed.push('GDELT is rate limited, cooldown active');
 for(const source of ['Google News RSS','Bing News RSS']){
  try{
   const articles=await fetchRSS(front,window,focus,source);
   if(articles.length)return {articles,source,failed};
   failed.push(source+' returned no articles');
  }catch(e){failed.push(String(e.message||e).slice(0,100))}
 }
 return {articles:[],source:'No live source',failed};
}
async function getFronts(url){
 const id=url.searchParams.get('id'),scope=url.searchParams.get('scope');
 if(!id&&scope!=='global')return {
  status:'catalogue',fronts:CATALOGUE,source:'GeoPulse geographic watchlist',
  message:'Front listing is a watchlist, not an assertion of current fighting.'
 };
 let front=null;
 if(scope!=='global'){
  front=FRONT_DEFS.find(f=>f.id===id);
  if(!front)return {status:'invalid',error:'Unknown monitored region'};
 }
 const window=WINDOWS.has(url.searchParams.get('window'))?url.searchParams.get('window'):'24h';
 const focus=Object.hasOwn(FOCUSES,url.searchParams.get('focus'))?url.searchParams.get('focus'):'all';
 const key=(front?.id||'global')+'/'+window+'/'+focus,old=CACHE.get(key),ttl=4*60*1000;
 if(old&&Date.now()-old.time<ttl)return {...old.value,cache:'fresh'};
 try{
  const {articles,source,failed}=await findArticles(front,window,focus);
  if(!articles.length)throw Error(failed.join('; ').slice(0,350)||'No matching articles');
  const data={
   status:'ok',source,scope:front?.id||'global',window,focus,
   updatedAt:new Date().toISOString(),articles,
   counts:Object.fromEntries(['territory','withdrawals','losses','attacks','diplomacy','other'].map(key=>[key,articles.filter(a=>a.category===key).length])),
   fallbackUsed:source!=='GDELT DOC 2.0',
   message:source==='GDELT DOC 2.0'?'GDELT news index':'GDELT unavailable or empty; retrieved published RSS headlines from '+source,
   disclaimer:'Headlines are not verified battlefield events. Counts refer to media articles only. RSS publication dates and coverage are not complete.'
  };
  CACHE.set(key,{time:Date.now(),value:data});
  return {...data,cache:'new'};
 }catch(e){
  if(old&&old.value.articles?.length)return {...old.value,status:'stale',cache:'stale',message:'Live sources unavailable; showing cached articles.'};
  return {
   status:'unavailable',source:'GDELT / Google News RSS / Bing News RSS',scope:front?.id||'global',
   focus,window,articles:[],counts:{},updatedAt:null,
   message:'No news source returned articles. Try a wider time range.',
   error:String(e.message||e).slice(0,350)
  };
 }
}
module.exports={getFronts,classify,queryFor};
