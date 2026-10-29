const {Readable}=require('node:stream');
const unzipper=require('unzipper');
const csv=require('csv-parser');
const countryCache={};
const {getFronts}=require('./conflict-fronts.cjs');
const gedState={state:'not_loaded',events:[],updatedAt:null,error:null,source:'UCDP GED 26.1',yearRange:'2022–2025',revision:'26.1',retriedAt:0,counts:{}};
const csvNumber=x=>{const n=Number(x);return Number.isFinite(n)?n:null};
function startUCDP(){
 if(gedState.state==='loading'||gedState.state==='ready')return;
 if(gedState.retriedAt&&Date.now()-gedState.retriedAt<15*60*1000)return;
 gedState.state='loading';gedState.error=null;gedState.retriedAt=Date.now();
 (async()=>{
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),155000);
  try{
   const response=await fetch('https://ucdp.uu.se/downloads/ged/ged261-csv.zip',{signal:controller.signal,headers:{'User-Agent':'GEOPULSE/2.0 historical research explorer'}});
   if(!response.ok||!response.body)throw Error('UCDP download unavailable: HTTP '+response.status);
   const rows=[];let seen=0;
   const stream=Readable.fromWeb(response.body).pipe(unzipper.ParseOne(/\.csv$/i)).pipe(csv());
   for await(const row of stream){
    const year=Number(row.year||String(row.date_start||'').slice(0,4));
    if(!(year>=2022&&year<=2025))continue;
    const lat=csvNumber(row.latitude),lng=csvNumber(row.longitude);
    if(lat===null||lng===null||lat<-90||lat>90||lng<-180||lng>180)continue;
    seen++;
    // Keep a bounded, reproducible 1-in-n event sample. This is not a full database in memory.
    if(seen%3!==0)continue;
    if(rows.length>=45000)continue;
    rows.push({id:String(row.id||row.relid||seen),date:String(row.date_start||row.date_end||''),year,lat,lng,country:String(row.country||''),region:String(row.region||''),conflict:String(row.conflict_name||''),actors:[row.side_a,row.side_b].filter(Boolean).join(' / ').slice(0,200),type:Number(row.type_of_violence)||null,description:String(row.source_article||row.source_headline||'').slice(0,350),best:csvNumber(row.best),precision:String(row.where_prec||''),source:'UCDP GED v26.1'});
   }
   gedState.events=rows;gedState.counts=rows.reduce((x,r)=>(x[r.year]=(x[r.year]||0)+1,x),{});
   gedState.sourceTotalCandidate=seen;gedState.state='ready';gedState.updatedAt=new Date().toISOString();
  }catch(e){gedState.state='unavailable';gedState.error=String(e?.message||e).slice(0,230);console.error('UCDP feed:',gedState.error)}
  finally{clearTimeout(timeout)}
 })();
}
function countriesPayload(rows){return (Array.isArray(rows)&&Array.isArray(rows[1])?rows[1]:[]).filter(r=>r?.region?.id&&r.region.id!=='NA'&&/^[A-Z]{3}$/.test(r.id||'')).map(r=>({iso:r.id,iso2:r.iso2Code||'',name:r.name,region:r.region.value,capital:r.capitalCity||'',lat:Number(r.latitude)||null,lng:Number(r.longitude)||null,income:r.incomeLevel?.value||'',lending:r.lendingType?.value||'',source:'World Bank Country API'}))}
const http=require('node:http');const fs=require('node:fs');const path=require('node:path');
const PORT=Number(process.env.PORT)||10000;const ROOT=path.resolve(__dirname,'dist');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon','.webp':'image/webp','.woff2':'font/woff2'};
const cache=new Map();async function remote(key,url,ttl){const previous=cache.get(key);if(previous&&Date.now()-previous.time<ttl)return previous.value;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8500);try{const response=await fetch(url,{signal:controller.signal,headers:{'User-Agent':'GeoPulse/1.0 (+public-data-aggregation)','Accept':'application/json'}});if(!response.ok)throw Error('upstream '+response.status);const body=await response.json();cache.set(key,{time:Date.now(),value:body});return body;}finally{clearTimeout(timer);}}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=180'});res.end(JSON.stringify(data));}
async function api(url,res){
if(url.pathname==='/api/fronts') {const d=await getFronts(url);return json(res,d.status==='invalid'?400:200,d)}
if(url.pathname==='/api/countries'){
 try{const data=await remote('countries-v2','https://api.worldbank.org/v2/country?format=json&per_page=400',7*24*60*60*1000);return json(res,200,{source:'World Bank',retrievedAt:new Date().toISOString(),countries:countriesPayload(data)})}catch(e){return json(res,503,{source:'World Bank',countries:[],status:'unavailable'})}
}
if(url.pathname==='/api/boundaries'){
 try{const data=await remote('boundaries','https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json',7*24*60*60*1000);return json(res,200,data)}catch(e){return json(res,503,{error:'World boundaries currently unavailable',fallback:'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'})}
}
if(url.pathname==='/api/series'){
 const iso=(url.searchParams.get('iso')||'GRC').toUpperCase();const key=url.searchParams.get('indicator')||'MS.MIL.XPND.CD';
 const allowed=['MS.MIL.XPND.CD','MS.MIL.XPND.GD.ZS','NY.GDP.MKTP.CD','FP.CPI.TOTL.ZG','NE.TRD.GNFS.ZS','SP.POP.TOTL'];
 if(!/^[A-Z]{3}$/.test(iso)||!allowed.includes(key))return json(res,400,{error:'Invalid country or indicator'});
 try{const data=await remote('series-'+iso+key,'https://api.worldbank.org/v2/country/'+iso+'/indicator/'+key+'?format=json&per_page=70',24*60*60*1000);
 const points=(Array.isArray(data)&&Array.isArray(data[1])?data[1]:[]).filter(r=>r.value!==null).map(r=>({year:Number(r.date),value:r.value})).sort((a,b)=>a.year-b.year);
 return json(res,200,{source:key.startsWith('MS.MIL')?'World Bank indicator (original source: SIPRI)':'World Bank Open Data',country:iso,indicator:key,points,updatedAt:new Date().toISOString()})
 }catch(e){return json(res,503,{points:[],error:'Series currently unavailable'})}
}
if(url.pathname==='/api/trade'){
 const numeric=url.searchParams.get('reporter')||'300',year=Number(url.searchParams.get('year')||2024),flow=url.searchParams.get('flow')||'X';
 if(!/^\d{1,3}$/.test(numeric)||!Number.isInteger(year)||year<2015||year>2025||!['X','M'].includes(flow))return json(res,400,{error:'Invalid trade request'});
 const query='?reporterCode='+numeric+'&period='+year+'&flowCode='+flow+'&cmdCode=TOTAL&maxRecords=500';
 try{const d=await remote('trade'+numeric+year+flow,'https://comtradeapi.un.org/public/v1/preview/C/A/HS'+query,12*60*60*1000);
 const rows=(Array.isArray(d.data)?d.data:[]).filter(r=>Number(r.partnerCode)>0&&Number.isFinite(Number(r.primaryValue))&&(!r.cmdCode||r.cmdCode==='TOTAL')).map(r=>({partner:String(r.partnerDesc||''),partnerCode:String(r.partnerCode),value:Number(r.primaryValue),flow:String(r.flowDesc||flow),year:Number(r.period||year)})).sort((a,b)=>b.value-a.value).slice(0,40);
 return json(res,200,{source:'UN Comtrade preview (limited)',reporter:numeric,year,flow,rows,rawCount:d.count||d.data?.length||0,preview:true,message:rows.length?'Preview records, not exhaustive trade matrix':'No bilateral TOTAL records in limited preview',updatedAt:new Date().toISOString()})
 }catch(e){return json(res,503,{source:'UN Comtrade preview',status:'unavailable',rows:[],message:'The limited no-key trade preview did not respond'})}
}
if(url.pathname==='/api/wikidata'){
 const q=(url.searchParams.get('q')||'').trim().slice(0,80);
 if(q.length<3)return json(res,400,{error:'Enter at least 3 characters'});
 try{const d=await remote('wikidata'+q,'https://www.wikidata.org/w/api.php?action=wbsearchentities&search='+encodeURIComponent(q)+'&language=en&format=json&limit=10',24*60*60*1000);
 return json(res,200,{source:'Wikidata entity search',items:(d.search||[]).map(x=>({id:x.id,label:x.label,description:x.description||'',url:x.concepturi})),updatedAt:new Date().toISOString()})
 }catch(e){return json(res,503,{items:[],error:'Wikidata temporarily unavailable'})}
}
if(url.pathname==='/api/ucdp/status'){
 if(process.env.VERCEL)return json(res,200,{state:'unavailable',rows:0,source:'UCDP GED 26.1',revision:'26.1',updatedAt:null,error:'The large UCDP ZIP importer is not supported by ephemeral Vercel Functions. Use curated records or the source archive.',counts:{}});
 if(gedState.state='not_loaded')startUCDP();
 return json(res,200,{state:gedState.state,rows:gedState.events.length,yearRange:gedState.yearRange,source:gedState.source,revision:gedState.revision,updatedAt:gedState.updatedAt,error:gedState.error,counts:gedState.counts,sourceTotalCandidate:gedState.sourceTotalCandidate||0,sampling:'Every third eligible geocoded event from 2022–2025, max 45,000 stored; sample is incomplete'})
}
if(url.pathname==='/api/ucdp/events'){
 if(process.env.VERCEL)return json(res,200,{state:'unavailable',rows:[],source:'UCDP GED 26.1',revision:'26.1',error:'Bulk archive loading is unavailable on Vercel; curated historical records remain available'});
 if(gedState.state='not_loaded')startUCDP();
 const year=Number(url.searchParams.get('year')||2025),country=(url.searchParams.get('country')||'').slice(0,55).toLowerCase(),limit=Math.min(1000,Math.max(1,Number(url.searchParams.get('limit')||500)||500));
 if(!Number.isInteger(year)||year<2022||year>2025)return json(res,400,{error:'Supported years: 2022–2025'});
 const matching=gedState.events.filter(e=>e.year===year&&(!country||e.country.toLowerCase().includes(country)));
 const stride=Math.max(1,Math.ceil(matching.length/limit));const rows=matching.filter((_,i)=>i%stride===0).slice(0,limit);
 return json(res,200,{state:gedState.state,year,totalInSample:matching.length,rows,source:gedState.source,revision:gedState.revision,coverage:'Historical 2022–2025; sample of every third eligible event, max 45k; not an exhaustive or live feed',updatedAt:gedState.updatedAt,error:gedState.error})
}
if(url.pathname==='/api/health')return json(res,200,{ok:true,version:'1.2.0',time:new Date().toISOString()});
if(url.pathname==='/api/news'){const query='(geopolitics OR diplomacy OR conflict OR airstrike)';const upstream='https://api.gdeltproject.org/api/v2/doc/doc?query='+encodeURIComponent(query)+'&mode=artlist&maxrecords=60&format=json&sort=datedesc';try{const data=await remote('news',upstream,15*60*1000);const articles=(data.articles||[]).filter(x=>x.title&&x.url).map(x=>({title:x.title,url:x.url,domain:x.domain||'',date:x.seendate||'',country:x.sourcecountry||'',language:x.language||''}));return json(res,200,{status:'ok',source:'GDELT DOC 2.0',updatedAt:new Date().toISOString(),articles});}catch(e){const prior=cache.get('news');return json(res,200,{status:prior?'cached':'unavailable',source:'GDELT DOC 2.0',articles:(prior?.value?.articles||[]).map(x=>({title:x.title,url:x.url,domain:x.domain||'',date:x.seendate||'',country:x.sourcecountry||''})),message:'External news feed currently unavailable'});}}
if(url.pathname==='/api/economy'){const iso=(url.searchParams.get('iso')||'GRC').toUpperCase();if(!/^[A-Z]{3}$/.test(iso))return json(res,400,{error:'Invalid ISO country code'});const indicators={'NY.GDP.MKTP.CD':'gdp','NY.GDP.PCAP.CD':'gdpPerCapita','SP.POP.TOTL':'population','FP.CPI.TOTL.ZG':'inflation','NE.TRD.GNFS.ZS':'tradePctGDP','MS.MIL.XPND.GD.ZS':'militaryPctGDP'};try{const result=await Promise.all(Object.entries(indicators).map(async([indicator,k])=>{const url='https://api.worldbank.org/v2/country/'+iso+'/indicator/'+indicator+'?format=json&per_page=12';try{const rows=await remote(iso+indicator,url,24*60*60*1000);const row=Array.isArray(rows)&&Array.isArray(rows[1])?rows[1].find(r=>r.value!==null):null;return[k,row?{value:row.value,year:row.date}:null]}catch{return[k,null]}}));return json(res,200,{country:iso,source:'World Bank Open Data',indicators:Object.fromEntries(result)});}catch{return json(res,503,{error:'World Bank data unavailable'})}}
return json(res,404,{error:'Unknown API endpoint'});}
async function handle(req,res){if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end()}let url;try{url=new URL(req.url,'http://localhost')}catch{res.writeHead(400);return res.end()}if(url.pathname.startsWith('/api/')){try{return await api(url,res)}catch(e){return json(res,500,{error:'Internal request error'})}}let pathname;try{pathname=decodeURIComponent(url.pathname)}catch{res.writeHead(400);return res.end()}const file=path.resolve(ROOT,'.'+pathname);if(!file.startsWith(ROOT+path.sep)&&file!==ROOT){res.writeHead(403);return res.end()}let target=file;if(!fs.existsSync(target)||!fs.statSync(target).isFile())target=path.join(ROOT,'index.html');const ext=path.extname(target);res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','Cache-Control':ext==='.html'?'no-cache':'public, max-age=3600','X-Content-Type-Options':'nosniff'});if(req.method==='HEAD')return res.end();fs.createReadStream(target).pipe(res);}
module.exports={handle};
if(require.main===module){http.createServer(handle).listen(PORT,'0.0.0.0',()=>console.log('GEOPULSE production server on port '+PORT));}