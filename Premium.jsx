import React,{Suspense,useEffect,useMemo,useRef,useState,useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import {Globe2,Search,Layers,Activity,Clock3,Shield,Anchor,Landmark,Globe as WorldIcon,BarChart3,GitBranch,ArrowUpRight,ChevronRight,ChevronLeft,Info,Menu,X,Pause,Play,ExternalLink,MapPin,Database,Satellite,Filter,ArrowLeftRight,Radio,ZoomIn,Compass,ChevronDown} from 'lucide-react';
import {countries as seedCountries,events,arsenal} from './data.js';
import {bases,chokepoints,alliances,nuclear,memberships,nuclearStatus,commonMemberships} from './strategic.js';
import './premium.css';
import ConflictMonitor from './ConflictMonitor.jsx';
const ThreeGlobe=React.lazy(()=>import('react-globe.gl'));
const MODULES=[{id:'world',label:'World',icon:Globe2},{id:'conflicts',label:'Conflicts',icon:Shield},{id:'relations',label:'Relations',icon:GitBranch},{id:'trade',label:'Trade',icon:Anchor},{id:'military',label:'Military',icon:Satellite},{id:'rewind',label:'Rewind',icon:Clock3},{id:'intelligence',label:'Intelligence',icon:Activity}];
const MODES=['CAUSE & EFFECT','RIPPLE EFFECT','BLIND SPOTS','WHAT IF?'];
const LAYERS=[{id:'battles',name:'Conflicts',color:'#ff806e'},{id:'attacks',name:'Attacks',color:'#eeb76e'},{id:'chokes',name:'Chokepoints',color:'#6cdbd0'},{id:'bases',name:'Public bases',color:'#bc9ffa'},{id:'relations',name:'Relationships',color:'#79bdf4'}];
const FLAG_SOURCE='https://flagcdn.com/w80/';
const fmt=n=>typeof n==='number'?new Intl.NumberFormat('en-US',{notation:Math.abs(n)>1e6?'compact':'standard',maximumFractionDigits:1}).format(n):'—';
const titleOf=p=>p?.title||p?.name||'—';
const isoOf=p=>p?.iso||p?.properties?.iso3||'';
const dateOf=s=>/^\d{8}/.test(s||'')?s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8):s||'';
const allEvents=events.map(p=>({...p,kind:p.type==='Strike'||p.type==='Attack'?'attack':'battle',name:p.title}));
const basesLayer=bases.map(p=>({...p,kind:'base',name:p.name}));
const chokesLayer=chokepoints.map(p=>({...p,kind:'choke'}));
const allMapItems=[...allEvents,...basesLayer,...chokesLayer];
const groups={country:'#7adfdf',battle:'#ff806e',attack:'#eeb76e',base:'#c7a7f5',choke:'#6cdbd0',front:'#ff6464'};
const worldUrl='/world-countries.geojson';
function boundaryCountry(f){return{kind:'country',name:f.properties.name,iso:f.properties.iso3,region:f.properties.continent,source:'https://data.worldbank.org/country/'+String(f.properties.iso3||'').toLowerCase()}}
function countryFromGeo(f){const target=boundaryCountry(f);const known=seedCountries.find(x=>x.iso===target.iso);if(known)return{...target,lat:known.lat,lng:known.lng};const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;const ring=polys.sort((a,b)=>b[0]?.length-a[0]?.length)[0]?.[0]||[];if(!ring.length)return{...target,lat:0,lng:0};let lats=ring.map(x=>x[1]),lngs=ring.map(x=>x[0]);return{...target,lat:(Math.min(...lats)+Math.max(...lats))/2,lng:(Math.min(...lngs)+Math.max(...lngs))/2}}
function Label({children}){return <div className="gp-label">{children}</div>}
function Metric({name,value,year}){return <div className="gp-metric"><small>{name}</small><strong>{value}</strong><span>{year||'No observation'}</span></div>}
function External({href,children}){return href?<a href={href} target="_blank" rel="noopener noreferrer" className="gp-source">{children}<ExternalLink size={13}/></a>:null}
function MinimalFallback({message}){return <div className="gp-error"><Globe2 size={40}/><h2>3D globe unavailable</h2><p>{message||'The browser could not initialize WebGL. The data, dossiers and headlines remain accessible.'}</p><a href="/status.html">Check graphics support ↗</a></div>}
class GlobeBoundary extends React.Component{constructor(p){super(p);this.state={error:null}}static getDerivedStateFromError(error){return{error}}componentDidCatch(e){console.error('GEOPULSE globe error',e)}render(){return this.state.error?<MinimalFallback message={this.state.error.message}/>:this.props.children}}
function App(){
 const [features,setFeatures]=useState([]),[geoStatus,setGeoStatus]=useState('loading');
 const [frontCatalog,setFrontCatalog]=useState([]);
 const [selected,setSelected]=useState({...seedCountries[0],kind:'country'}),[hovered,setHovered]=useState(null);
 const [mode,setMode]=useState('world'),[rail,setRail]=useState('archive'),[layers,setLayers]=useState({battles:true,attacks:false,chokes:true,bases:false,relations:false});
 const [dossierTab,setDossierTab]=useState('overview'),[sheet,setSheet]=useState(false),[searchOpen,setSearchOpen]=useState(false),[search,setSearch]=useState('');
 const [menuOpen,setMenuOpen]=useState(false),[tour,setTour]=useState(false),[tourIndex,setTourIndex]=useState(0);
 const [w,setW]=useState(typeof window==='undefined'?1200:window.innerWidth),[h,setH]=useState(typeof window==='undefined'?800:window.innerHeight),[globeReady,setGlobeReady]=useState(false);
 const [economy,setEconomy]=useState(null),[economyStatus,setEconomyStatus]=useState('idle'),[news,setNews]=useState([]),[newsStatus,setNewsStatus]=useState('loading'),[newsUpdated,setNewsUpdated]=useState(null);
 const [year,setYear]=useState(2026),[analysisMode,setAnalysisMode]=useState('CAUSE & EFFECT'),[shock,setShock]=useState(40),[dependency,setDependency]=useState(60),[compareIso,setCompareIso]=useState('USA');
 const globe=useRef(null),canvas=useRef(null),searchRef=useRef(null);
 const isMobile=w<900;
 useEffect(()=>{const fn=()=>{setW(window.innerWidth);setH(window.innerHeight)};window.addEventListener('resize',fn);return()=>window.removeEventListener('resize',fn)},[]);
 useEffect(()=>{let active=true;fetch(worldUrl).then(r=>r.ok?r.json():Promise.reject(Error('map data missing'))).then(r=>{if(active){setFeatures(r.features||[]);setGeoStatus('ready')}}).catch(()=>{if(active)setGeoStatus('offline')});return()=>{active=false}},[]);
 useEffect(()=>{let active=true;const timer=AbortSignal.timeout?.(12500);fetch('/api/news',{signal:timer}).then(r=>r.ok?r.json():Promise.reject()).then(r=>{if(active){setNews((r.articles||[]).filter(n=>n.url&&n.title).slice(0,55));setNewsStatus(r.status);setNewsUpdated(r.updatedAt||null)}}).catch(()=>{if(active)setNewsStatus('unavailable')});return()=>{active=false}},[]);
 useEffect(()=>{if(selected?.kind!=='country'){setEconomy(null);setEconomyStatus('idle');return}let active=true;setEconomy(null);setEconomyStatus('loading');const ctrl=new AbortController();const id=setTimeout(()=>ctrl.abort(),12000);fetch('/api/economy?iso='+selected.iso,{signal:ctrl.signal}).then(r=>r.ok?r.json():Promise.reject()).then(r=>{if(active){setEconomy(r.indicators||null);setEconomyStatus('loaded')}}).catch(()=>{if(active)setEconomyStatus('offline')}).finally(()=>clearTimeout(id));return()=>{active=false;clearTimeout(id);ctrl.abort()}},[selected?.iso,selected?.kind]);
 const countries=useMemo(()=>features.length?features.map(countryFromGeo).sort((a,b)=>a.name.localeCompare(b.name)):seedCountries.map(p=>({...p,kind:'country'})).sort((a,b)=>a.name.localeCompare(b.name)),[features]);
 const matchedSelected=selected?.kind==='country'?(countries.find(c=>c.iso===selected.iso)||selected):selected;
 const countryIso=selected?.kind==='country'?selected.iso:'GRC';
 const comparisons=useMemo(()=>countries.filter(c=>memberships(countryIso).some(a=>a.members.includes(c.iso))&&c.iso!==countryIso).slice(0,30),[countryIso,countries]);
 const associated=useMemo(()=>countries.find(c=>c.iso===compareIso),[compareIso,countries]);
 const activeEvents=useMemo(()=>mode==='rewind'?allEvents.filter(x=>x.year<=year):allEvents,[mode,year]);
 const pointData=useMemo(()=>mode==='conflicts'?frontCatalog.map(f=>({...f,kind:'front',name:f.labelEl||f.label,title:f.labelEl||f.label})):[
  ...(features.length===0?countries:[]),
  ...(layers.battles?activeEvents.filter(p=>p.kind==='battle'):[]),
  ...(layers.attacks?activeEvents.filter(p=>p.kind==='attack'):[]),
  ...(layers.bases?basesLayer:[]),
  ...(layers.chokes?chokesLayer:[])
 ],[mode,frontCatalog,layers,activeEvents,features.length,countries]);
 const relationArcs=useMemo(()=>layers.relations&&selected?.kind==='country'&&Number.isFinite(selected.lat)&&Number.isFinite(selected.lng)?comparisons.filter(c=>Number.isFinite(c.lat)&&Number.isFinite(c.lng)).map(c=>({from:[selected.lat,selected.lng],to:[c.lat,c.lng],label:c.name})):[],[layers.relations,selected,comparisons]);
 const searchData=useMemo(()=>[...countries,...allMapItems].filter(p=>titleOf(p).toLowerCase().includes(search.trim().toLowerCase())).slice(0,18),[search,countries]);
 const newsDomains=useMemo(()=>Object.entries(news.reduce((a,n)=>{let k=n.domain||'Unknown';a[k]=(a[k]||0)+1;return a},{})).sort((a,b)=>b[1]-a[1]).slice(0,7),[news]);
 const thisCountryNews=selected?.kind==='country'?news.filter(n=>String(n.title).toLowerCase().includes(selected.name.toLowerCase())).slice(0,4):[];
 const currentArchive=useMemo(()=>allEvents.filter(e=>e.year<=year).sort((a,b)=>b.year-a.year),[year]);
 const featured=useMemo(()=>[events[0],events[31],events[9],events[34],events[21],events[18]].filter(Boolean).map(e=>({...e,name:e.title,kind:e.type==='Strike'||e.type==='Attack'?'attack':'battle'})),[]);
 function onReady(){setGlobeReady(true);try{globe.current?.renderer()?.setPixelRatio(Math.min(window.devicePixelRatio||1,1.4));const ctrl=globe.current?.controls?.();if(ctrl){ctrl.autoRotate=true;ctrl.autoRotateSpeed=.25;ctrl.enableDamping=true;ctrl.dampingFactor=.08;ctrl.enablePan=false}globe.current?.pointOfView({lat:27,lng:21,altitude:isMobile?2.9:2.4},900)}catch(e){console.warn('3D controls',e)}}
 const focus=useCallback((p,coords)=>{if(!p)return;const item=p.geometry?countryFromGeo(p):p;const pos=coords||item;setSelected({...item,lat:Number.isFinite(pos?.lat)?pos.lat:item.lat,lng:Number.isFinite(pos?.lng)?pos.lng:item.lng});setDossierTab('overview');setSheet(true);setSearchOpen(false);setSearch('');setMenuOpen(false);try{let c=globe.current?.controls?.();if(c)c.autoRotate=false;globe.current?.pointOfView({lat:pos?.lat??item.lat??20,lng:pos?.lng??item.lng??0,altitude:isMobile?2.35:1.8},1050)}catch(e){console.warn(e)}},[isMobile]);
 useEffect(()=>{if(!tour)return;const id=setInterval(()=>setTourIndex(i=>(i+1)%featured.length),8500);return()=>clearInterval(id)},[tour,featured.length]);
 useEffect(()=>{if(tour&&featured[tourIndex])focus(featured[tourIndex])},[tourIndex,tour]);
 function onMode(id){setMode(id);setMenuOpen(false);if(id==='conflicts'){setLayers(x=>({...x,battles:true,attacks:true}));setRail('news');setSheet(true)}if(id==='military')setLayers(x=>({...x,bases:true}));if(id==='trade')setLayers(x=>({...x,chokes:true}));if(id==='relations')setLayers(x=>({...x,relations:true}));if(id==='intelligence')setSheet(true)}
 function chooseCountry(iso){const c=countries.find(x=>x.iso===iso);if(c)focus(c)}
 const pointPaint=p=>groups[p.kind]||'#7acbcc';
 const gs=canvas.current?.clientWidth||(isMobile?w:Math.floor(w*.76));
 const viewWidth=isMobile?w:gs;
 const viewHeight=isMobile?Math.max(490,Math.round(h*.83)):Math.max(540,h-76);
 const isSelectedCountry=selected?.kind==='country';
 const summaryData=selected?.kind==='country'?economy||{}:{};
 const partnerGroup=selected?.kind==='country'?memberships(selected.iso):[];
 const visibleHeadlines=news.slice(0,8);
 return <div className="gp-app">
  <header className="gp-top">
   <div className="gp-identity" onClick={()=>onMode('world')} role="button" tabIndex={0}><span className="gp-logo">◈</span><div><b>GEO<span>PULSE</span></b><small>WORLD INTELLIGENCE</small></div></div>
   <nav className={'gp-nav '+(menuOpen?'open':'')}>{MODULES.map(({id,label,icon:Icon})=><button key={id} onClick={()=>onMode(id)} className={mode===id?'active':''}><Icon size={15}/>{label}</button>)}</nav>
   <div className="gp-topright"><span className="gp-source-status"><span className="gp-status-dot"/> SOURCE-BACKED</span><button onClick={()=>{setSearchOpen(v=>!v);setTimeout(()=>searchRef.current?.focus(),0)}} aria-label="Search"><Search size={19}/></button><button className="gp-menu" onClick={()=>setMenuOpen(v=>!v)} aria-label="Open navigation">{menuOpen?<X size={20}/>:<Menu size={20}/>}</button></div>
  </header>
  <div className="gp-view">
   <div className="gp-canvas" ref={canvas}>
    <div className="gp-stars" aria-hidden="true"/>
    <div className="gp-heading"><div className="gp-eyebrow"><span className="gp-pulse"/> GEOPOLITICAL INTELLIGENCE SYSTEM <span className="gp-heading-separator">/</span> EXPLORE THE WORLD</div><h1>{mode==='conflicts'?<>Global conflicts. <em>Source-backed.</em></>:<>Understand what moves <em>the world.</em></>}</h1><p>{mode==='conflicts'?'Regional watchpoints · incoming reports · strategic effects. Not live battle coordinates.':'Countries. Power. Conflicts. Connections. One interactive Earth.'}</p></div>
    <div className="gp-globe">
    <GlobeBoundary><Suspense fallback={<div className="gp-globe-loading"><span className="gp-orb">◉</span><strong>Preparing the real Earth...</strong><p>Natural Earth geography · 3D interactive globe</p></div>}>
     <ThreeGlobe ref={globe} width={viewWidth} height={viewHeight}
       globeImageUrl="/earth-real.svg"
       backgroundColor="rgba(0,0,0,0)" showAtmosphere atmosphereColor="#45a2c8" atmosphereAltitude={.14}
       animateIn={false} waitForGlobeReady={false} rendererConfig={{antialias:false,alpha:true,powerPreference:'low-power'}}
       onGlobeReady={onReady}
       polygonsData={features}
       polygonGeoJsonGeometry="geometry"
       polygonCapColor={p=>p.properties?.iso3===isoOf(selected)?'rgba(69,222,216,.18)':'rgba(9,29,46,.015)'}
       polygonSideColor={()=> 'rgba(71,154,185,.04)'}
       polygonStrokeColor={p=>p.properties?.iso3===isoOf(selected)?'#91f0e6':'rgba(168,218,219,.34)'}
       polygonAltitude={p=>p.properties?.iso3===isoOf(selected)?.014:.001}
       polygonLabel={p=>p.properties?.name||''}
       polygonCapCurvatureResolution={5}
       polygonsTransitionDuration={350}
       onPolygonClick={(p,e,coords)=>focus(p,coords)}
       onPolygonHover={p=>setHovered(p?.properties?.name||null)}
       pointsData={pointData}
       pointLat="lat" pointLng="lng" pointResolution={6}
       pointAltitude={p=>p.id===selected?.id ? 0.07 : 0.024}
       pointRadius={p=>p.kind==='front'?(p.id===selected?.id ? 0.82 : 0.56):p.id===selected?.id ? 0.42 : p.kind==='choke' ? 0.34 : 0.26}
       pointColor={pointPaint}
       pointLabel={p=>titleOf(p)}
       onPointClick={focus}
       ringsData={selected?.kind!=='country'?[selected]:[]}
       ringLat="lat" ringLng="lng" ringMaxRadius={2.2} ringRepeatPeriod={1500} ringPropagationSpeed={.8}
       ringColor={()=>t=>'rgba(243,180,106,'+(1-t)+')'}
       arcsData={relationArcs} arcStartLat={p=>p.from[0]} arcStartLng={p=>p.from[1]} arcEndLat={p=>p.to[0]} arcEndLng={p=>p.to[1]}
       arcColor={()=>['#48d5c9','#c1a2ff']} arcAltitude={.18} arcDashLength={.18} arcDashGap={1} arcDashAnimateTime={5500}
     />
    </Suspense></GlobeBoundary>
    </div>
    <div className="gp-map-nav">
      <div className="gp-map-nav-head"><Layers size={14}/> INTELLIGENCE LAYERS <span>{pointData.length} markers</span></div>
      {mode==='conflicts'?<div className="gp-chip-scroll"><span className="gp-layer-chip on"><span style={{background:'#ff6464'}}/>MONITORED REGIONS · NOT LIVE STRIKES</span></div>:<div className="gp-chip-scroll">{LAYERS.map(l=><button key={l.id} className={'gp-layer-chip '+(layers[l.id]?'on':'')} onClick={()=>setLayers(prev=>({...prev,[l.id]:!prev[l.id]}))}><span style={{background:l.color}}/>{l.name}</button>)}</div>}
    </div>
    <div className="gp-map-buttons"><button onClick={()=>{try{const c=globe.current?.controls?.();if(c)c.autoRotate=!c.autoRotate}catch{}}} title="Toggle globe rotation"><Compass size={17}/></button><button onClick={()=>globe.current?.pointOfView({lat:27,lng:21,altitude:2.6},850)} title="Reset globe position"><Globe2 size={17}/></button><button onClick={()=>{setSearchOpen(true);setTimeout(()=>searchRef.current?.focus(),0)}} title="Find a country"><Search size={17}/></button></div>
    <div className="gp-map-hint">DRAG TO ROTATE <span>·</span> PINCH TO ZOOM <span>·</span> SELECT ANY COUNTRY</div>
    {geoStatus!=='ready'&&<div className="gp-map-warning">{geoStatus==='loading'?'Loading real borders…':'Country polygons unavailable; reference points remain accessible'}</div>}
    {hovered&&<div className="gp-hover-tag">{hovered}</div>}
    <div className="gp-timeline">
      <div className="gp-timeline-head"><div><span className="gp-beacon"/><b>{mode==='rewind'?'WORLD REWIND':rail==='news'?'GLOBAL REPORTING':'KEY DEVELOPMENTS'}</b><small>{mode==='rewind'?'Historic references':rail==='news'?'GDELT indexed · '+(newsStatus==='ok'?'updated':'unavailable'):'Historical archive · sourced cases'}</small></div><div className="gp-timeline-actions">{mode!=='rewind'&&<div className="gp-rail-tabs"><button className={rail==='news'?'active':''} onClick={()=>{setRail('news');setTour(false)}}>NEWS</button><button className={rail==='archive'?'active':''} onClick={()=>setRail('archive')}>ARCHIVE</button></div>}{(mode==='rewind'||rail==='archive')&&<button onClick={()=>setTour(v=>!v)}>{tour?<Pause size={13}/>:<Play size={13}/>} {tour?'PAUSE TOUR':'START TOUR'}</button>}</div></div>
      {mode==='rewind'&&<div className="gp-rewind-bar"><span>1863</span><input type="range" min="1863" max="2026" value={year} onChange={e=>setYear(+e.target.value)}/><b>{year}</b></div>}
      <div className="gp-story-list">{mode!=='rewind'&&rail==='news'?(visibleHeadlines.length?visibleHeadlines.map((n,i)=><a key={n.url+i} className="gp-news-card" href={n.url} target="_blank" rel="noopener noreferrer"><small><span className="gp-report-dot"/> {n.domain||'GDELT INDEXED'} · {dateOf(n.date)}</small><strong>{n.title}</strong><span>READ ORIGINAL ARTICLE ↗</span></a>):<div className="gp-news-empty">News feed {newsStatus==='loading'?'is loading': 'is unavailable'}. No fabricated headlines.</div>):(mode==='rewind'?currentArchive.slice(0,10):featured).map((e,i)=><button key={e.id+'story'} className={selected?.id===e.id?'chosen':''} onClick={()=>focus(e)}><small><span style={{background:groups[e.kind]}}/> {e.period||e.year} · {e.type}</small><strong>{e.title}</strong><span>{e.location}</span></button>)}</div>
    </div>
   </div>
   <aside className={'gp-side '+(sheet?'gp-sheet-open':'')}>
    <div className="gp-side-title"><div><span className="gp-side-pip"/> INTELLIGENCE DOSSIER</div><button className="gp-side-close" onClick={()=>setSheet(false)} aria-label="Close dossier"><X size={19}/></button><span className="gp-side-source">OPEN DATA</span></div>
    {mode==='conflicts'?<ConflictMonitor selected={selected} onFocus={focus} onFronts={setFrontCatalog}/>:mode==='intelligence'?<>
      <div className="gp-intel-head"><Label>ADVANCED ANALYSIS</Label><h2>Understand the connections.</h2><p>Explore hypotheses, coverage differences and transparent scenarios.</p></div>
      <div className="gp-intel-tabs">{MODES.map(a=><button key={a} className={analysisMode===a?'active':''} onClick={()=>setAnalysisMode(a)}>{a}</button>)}</div>
      <div className="gp-analysis">
       {analysisMode==='CAUSE & EFFECT'&&<><Label>EVENT → POSSIBLE OUTCOME</Label><h3>{selected?.kind!=='country'?titleOf(selected):'Example geopolitical event'}</h3>{['Recorded event','Potential supply / transport shock','Trade, commodity and policy transmission','Possible social and economic impact'].map((x,i)=><div className="gp-causal" key={x}><span>0{i+1}</span><strong>{x}</strong><ChevronDown size={14}/></div>)}<p>Illustrative causal chain. Does not prove the particular event caused a measured outcome.</p></>}
       {analysisMode==='RIPPLE EFFECT'&&<><Label>EXPOSURE CHANNELS · GREECE</Label><h3>Global shocks reach local economies.</h3>{[['ENERGY','Imported energy and electricity input prices'],['LOGISTICS','Shipping, insurance and freight'],['TRADE','Intermediate goods and supply chains'],['TOURISM','Travel, demand and confidence']].map(([a,b])=><div className="gp-impact" key={a}><span>{a}</span><strong>{b}</strong></div>)}<p>Transmission pathways, not measured scenario forecasts.</p></>}
       {analysisMode==='BLIND SPOTS'&&<><Label>SOURCE DISTRIBUTION</Label><h3>Who is covering the story?</h3><p>{newsStatus==='ok'?news.length+' GDELT indexed articles in this sampled feed.':'GDELT feed unavailable; showing no invented source statistics.'}</p>{newsDomains.map(([domain,count])=><div className="gp-bar-item" key={domain}><div><span>{domain}</span><strong>{count}</strong></div><div className="gp-bar"><span style={{width:(count/(newsDomains[0]?.[1]||1)*100)+'%'}}/></div></div>)}<p>Sample concentration is not evidence of media suppression.</p></>}
       {analysisMode==='WHAT IF?'&&<><Label>SCENARIO EXPLORER</Label><h3>How large could the exposure be?</h3><div className="gp-scenario-row"><span>Hypothetical disruption</span><b>{shock}%</b></div><input type="range" min="0" max="100" value={shock} onChange={e=>setShock(+e.target.value)}/><div className="gp-scenario-row"><span>Assumed dependence</span><b>{dependency}%</b></div><input type="range" min="0" max="100" value={dependency} onChange={e=>setDependency(+e.target.value)}/><div className="gp-index"><small>ILLUSTRATIVE EXPOSURE INDEX</small><b>{Math.round(shock*dependency/100)}<span>/100</span></b></div><p>Arithmetic sandbox: disruption × dependence ÷ 100. Not a calibrated geopolitical forecast.</p></>}
      </div>
    </>:<>
    <div className="gp-dossier-top">
      <div className="gp-subrow">{isSelectedCountry?'COUNTRY PROFILE':selected?.kind==='choke'?'MARITIME STRATEGY':selected?.kind==='base'?'PUBLIC DEFENSE REFERENCE':'HISTORICAL EVENT'} <span>◉ REFERENCE</span></div>
      <div className="gp-country-identity">{isSelectedCountry&&<span className="gp-flag">{selected?.iso?.slice(0,3)}</span>}<h2>{titleOf(selected)}</h2></div>
      <div className="gp-country-meta"><MapPin size={13}/>{selected?.region||selected?.location||selected?.host||'Geopolitical reference'}</div>
      {isSelectedCountry&&<select className="gp-country-select" value={selected.iso} onChange={e=>chooseCountry(e.target.value)}>{countries.map(c=><option value={c.iso} key={c.iso}>{c.name}</option>)}</select>}
    </div>
    {isSelectedCountry?<div className="gp-dossier-body">
      <div className="gp-dossier-tabs">{[['overview','Overview'],['economy','Economy'],['relations','Relations']].map(([key,label])=><button key={key} className={dossierTab===key?'active':''} onClick={()=>setDossierTab(key)}>{label}</button>)}</div>
      {(dossierTab==='overview'||dossierTab==='economy')&&<div className="gp-metrics">
       <Metric name="GDP · CURRENT USD" value={summaryData.gdp?.value!=null?'$'+fmt(summaryData.gdp.value):'—'} year={summaryData.gdp?.year?'World Bank · '+summaryData.gdp.year:'World Bank · unavailable'}/>
       <Metric name="POPULATION" value={fmt(summaryData.population?.value)} year={summaryData.population?.year?'World Bank · '+summaryData.population.year:'World Bank · unavailable'}/>
       <Metric name="INFLATION" value={summaryData.inflation?.value!=null?summaryData.inflation.value.toFixed(1)+'%':'—'} year={summaryData.inflation?.year?'World Bank · '+summaryData.inflation.year:'World Bank · unavailable'}/>
       <Metric name="MILITARY SPEND / GDP" value={summaryData.militaryPctGDP?.value!=null?summaryData.militaryPctGDP.value.toFixed(1)+'%':'—'} year={summaryData.militaryPctGDP?.year?'World Bank · '+summaryData.militaryPctGDP.year:'World Bank · unavailable'}/>
      </div>}
      {dossierTab==='relations'?<div className="gp-partners"><Label>SELECT A SECOND COUNTRY</Label><select className="gp-country-select" value={compareIso} onChange={e=>setCompareIso(e.target.value)}>{countries.map(c=><option key={c.iso} value={c.iso}>{c.name}</option>)}</select><p>Shared memberships with <strong>{associated?.name||compareIso}</strong>:</p><div className="gp-tagrow">{commonMemberships(countryIso,compareIso).map(m=><span key={m.id}>{m.label}</span>)}{!commonMemberships(countryIso,compareIso).length&&<span>None in curated groups</span>}</div><button className="gp-secondary" onClick={()=>setLayers(x=>({...x,relations:!x.relations}))}>Toggle shared membership arcs <GitBranch size={14}/></button></div>:<div className="gp-alliances"><Label>MULTILATERAL MEMBERSHIPS</Label><div className="gp-tagrow">{partnerGroup.length?partnerGroup.map(m=><span key={m.id}>{m.label}</span>):<span>No match in curated groups</span>}</div><div className="gp-nuclear"><Shield size={15}/><span>{nuclearStatus(countryIso)}</span></div></div>}
      {economyStatus==='offline'&&<div className="gp-info">Live country indicators are unavailable; no values were generated.</div>}
      <External href={selected.source||'https://data.worldbank.org/country/'+countryIso.toLowerCase()}>VIEW OFFICIAL COUNTRY DATA</External>
      {thisCountryNews.length>0&&<div className="gp-local-news"><Label>RELATED INDEXED HEADLINES</Label>{thisCountryNews.map((n,i)=><a href={n.url} target="_blank" rel="noopener noreferrer" key={i}>{n.title}<ArrowUpRight size={13}/></a>)}</div>}
    </div>:<div className="gp-event-dossier"><div className="gp-event-flags"><span>{selected?.type||selected?.kind||'REFERENCE'}</span><span>{selected?.period||selected?.year||''}</span></div><p>{selected?.summary||selected?.relevance||selected?.precision||'Approximate geographic reference to a publicly documented location.'}</p><External href={selected?.source}>VIEW EVENT SOURCE</External><div className="gp-info"><Info size={15}/> Historical and strategic reference locations are approximate, not live military positions.</div></div>}
    </>}
    <div className="gp-side-footer"><div><Database size={15}/><span>Sources and methods are visible. Data refresh times vary by provider.</span></div><a href="/research.html">OPEN FULL RESEARCH LAB <ArrowUpRight size={14}/></a></div>
   </aside>
   {searchOpen&&<div className="gp-search-backdrop" onClick={()=>setSearchOpen(false)}><div className="gp-search-modal" onClick={e=>e.stopPropagation()}><div className="gp-search-input"><Search size={21}/><input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search 177 countries, events and places" onKeyDown={e=>e.key==='Escape'&&setSearchOpen(false)}/><button onClick={()=>setSearchOpen(false)}><X size={19}/></button></div><div className="gp-search-items">{searchData.length?searchData.map((p,i)=><button key={i} onClick={()=>focus(p)}><span>{p.kind==='country'?<Globe2 size={16}/>:p.kind==='choke'?<Anchor size={16}/>:<MapPin size={16}/>}</span><strong>{titleOf(p)}</strong><small>{p.region||p.location||p.type||p.kind}</small><ChevronRight size={16}/></button>):<div className="gp-no-results">No matching places or references</div>}</div><div className="gp-search-note">Type to explore real Natural Earth countries and curated historical events</div></div></div>}
  </div>
  <div className="gp-mobile-navigation">{MODULES.filter(m=>['world','conflicts','relations','rewind','intelligence'].includes(m.id)).map(({id,label,icon:Icon})=><button key={id} className={mode===id?'active':''} onClick={()=>onMode(id)}><Icon size={19}/><span>{label}</span></button>)}</div>
 </div>
}
class RootError extends React.Component{constructor(p){super(p);this.state={error:null}}static getDerivedStateFromError(error){return{error}}componentDidCatch(e){console.error('GEOPULSE 3.0 error',e)}render(){return this.state.error?<div className="gp-error gp-fatal"><Globe2 size={40}/><h2>Unable to load the GEOPULSE interface</h2><p>{this.state.error.message}</p><a href="/status.html">Check connection ↗</a><a href="/open.html">Open the lightweight archive ↗</a></div>:this.props.children}}
createRoot(document.getElementById('root')).render(<RootError><App/></RootError>);
