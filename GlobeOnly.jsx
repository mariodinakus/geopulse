import React,{Suspense,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {countries,events} from './data.js';
import {bases,chokepoints,memberships,nuclearStatus} from './strategic.js';
import './globe.css';

const Globe=React.lazy(()=>import('react-globe.gl'));
const INITIAL_LAYERS={countries:true,battles:true,strikes:true,bases:false,chokepoints:true};
const TYPES={country:{color:'#67e8e8',label:'COUNTRY'},battle:{color:'#ff756e',label:'HISTORICAL CONFLICT'},strike:{color:'#ffc476',label:'HISTORICAL ATTACK'},base:{color:'#b9a6ff',label:'PUBLIC INSTALLATION'},choke:{color:'#83e9b2',label:'MARITIME CHOKEPOINT'}};
const getLabel=(p)=>p?.name||p?.title||'Unknown reference';
const flagFor=(iso)=>iso?String.fromCodePoint(...iso.slice(0,2).toUpperCase().split('').map(c=>127397+c.charCodeAt(0))):'';
const labels={countries:'Countries',battles:'Battles',strikes:'Strikes',bases:'Public bases',chokepoints:'Chokepoints'};
const countryPoints=countries.map(c=>({...c,kind:'country',label:c.name,source:'https://data.worldbank.org/country/'+c.iso.toLowerCase()}));
const battlePoints=events.filter(e=>['Battle','Siege','Naval'].includes(e.type)).map(e=>({...e,kind:'battle',label:e.title}));
const strikePoints=events.filter(e=>['Strike','Attack'].includes(e.type)).map(e=>({...e,kind:'strike',label:e.title}));
const basePoints=bases.map(e=>({...e,kind:'base',label:e.name}));
const chokePoints=chokepoints.map(e=>({...e,kind:'choke',label:e.name}));
const allPoints=[...countryPoints,...battlePoints,...strikePoints,...basePoints,...chokePoints];
const cacheKey='geopulse-3d-device';

function canWebGL(){try{const el=document.createElement('canvas');const gl=el.getContext('webgl2',{failIfMajorPerformanceCaveat:false})||el.getContext('webgl',{failIfMajorPerformanceCaveat:false});if(gl){gl.getExtension('WEBGL_lose_context')?.loseContext();return true}return false}catch{return false}}
function VisError({message}){return <div className="webgl-error"><span>◈</span><strong>3D renderer could not start</strong><p>{message||'This device or browser has blocked WebGL.'}</p><a href="/status.html">Check 3D support</a><a href="/">Open the full GEOPULSE app</a></div>}
class GlobeBoundary extends React.Component{constructor(props){super(props);this.state={error:null}}static getDerivedStateFromError(error){return{error}}componentDidCatch(error){console.error('GEOPULSE globe initialization:',error)}render(){return this.state.error?<VisError message={this.state.error.message}/>:this.props.children}}

function App(){
 const [width,setWidth]=useState(typeof window!=='undefined'?window.innerWidth:1000);
 const [height,setHeight]=useState(typeof window!=='undefined'?window.innerHeight:740);
 const [ready,setReady]=useState(false);
 const [supported,setSupported]=useState(true);
 const [layers,setLayers]=useState(INITIAL_LAYERS);
 const [chosen,setChosen]=useState(countryPoints.find(p=>p.iso==='GRC')||countryPoints[0]);
 const [paneOpen,setPaneOpen]=useState(false);
 const [paused,setPaused]=useState(false);
 const [search,setSearch]=useState('');
 const [filteredMenu,setFilteredMenu]=useState(false);
 const [indicators,setIndicators]=useState(null);
 const [datastate,setDatastate]=useState('idle');
 const globe=useRef(null);
 useEffect(()=>{const resize=()=>{setWidth(window.innerWidth);setHeight(window.innerHeight)};resize();setSupported(canWebGL());window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize)},[]);
 const mobile=width<=820;
 const globeHeight=mobile?Math.max(430,Math.min(height-66,height*.84)):Math.max(540,height-66);
 const globeWidth=mobile?width:Math.max(500,Math.round(width*.74));
 const toggle=useCallback(name=>setLayers(prev=>({...prev,[name]:!prev[name]})),[]);
 const points=useMemo(()=>[
 ...(layers.countries?countryPoints:[]),
 ...(layers.battles?battlePoints:[]),
 ...(layers.strikes?strikePoints:[]),
 ...(layers.bases?basePoints:[]),
 ...(layers.chokepoints?chokePoints:[])
 ],[layers]);
 const list=useMemo(()=>allPoints.filter(p=>getLabel(p).toLowerCase().includes(search.trim().toLowerCase())).slice(0,32),[search]);
 const focus=useCallback(p=>{
   if(!p||!Number.isFinite(Number(p.lat))||!Number.isFinite(Number(p.lng)))return;
   setChosen(p);setPaneOpen(true);setFilteredMenu(false);
   try{const ctrl=globe.current?.controls?.();if(ctrl)ctrl.autoRotate=false;globe.current?.pointOfView({lat:p.lat,lng:p.lng,altitude:1.7},1000)}catch(e){console.warn('Globe fly-to unavailable',e)}
 },[]);
 useEffect(()=>{if(chosen?.kind!=='country'){setIndicators(null);setDatastate('idle');return}
  let active=true;setDatastate('loading');setIndicators(null);
  fetch('/api/economy?iso='+encodeURIComponent(chosen.iso),{signal:AbortSignal.timeout?.(12000)}).then(r=>r.ok?r.json():Promise.reject(Error('No response'))).then(r=>{if(active){setIndicators(r.indicators||null);setDatastate('loaded')}}).catch(()=>{if(active)setDatastate('offline')});
  return()=>{active=false}
 },[chosen]);
 const init=useCallback(()=>{if(!globe.current)return;setReady(true);
  try{
    globe.current.renderer().setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));
    globe.current.pointOfView({lat:28,lng:27,altitude:2.35},1100);
    const ctl=globe.current.controls();
    ctl.autoRotate=true;ctl.autoRotateSpeed=.32;ctl.enableDamping=true;ctl.dampingFactor=.08;ctl.enablePan=false;
  }catch(e){console.warn('Globe controls unavailable',e)}
 },[]);
 const resume=()=>{
  setPaused(p=>{try{if(globe.current?.controls())globe.current.controls().autoRotate=p}catch{};return !p})
 };
 const resultDescription=(p)=>{
  if(!p)return '';
  if(p.kind==='country')return p.region+' · '+p.iso;
  if(p.kind==='battle'||p.kind==='strike')return (p.period||p.year)+' · '+(p.location||p.region);
  if(p.kind==='base')return p.kind+' · '+p.host+' · '+p.operator;
  return p.region+' · '+p.relevance;
 };
 const currentMeta=TYPES[chosen?.kind||'country'];
 const compactFormat=n=>typeof n==='number'?new Intl.NumberFormat('en-US',{notation:Math.abs(n)>=1e6?'compact':'standard',maximumFractionDigits:1}).format(n):'—';
 const focusCountry=e=>{const p=countryPoints.find(c=>c.iso===e.target.value);if(p)focus(p)};
 return <div className="globeapp">
 <header className="globalbar">
   <a href="/" className="identity"><span className="mark">◈</span><span><b>GEO<em>PULSE</em></b><small>3D GLOBAL INTELLIGENCE</small></span></a>
   <span className="header-pill"><i/> 3D WORLD EXPLORER</span>
   <a href="/" className="all-app">FULL DASHBOARD ↗</a>
 </header>
 <main className="globe-layout">
  <section className="globe-stage">
   <div className="starfield" aria-hidden="true"/>
   <div className="stage-top"><div><small>GEOPULSE / GLOBAL SITUATION ROOM</small><h1>The world in perspective<span>.</span></h1></div><div className="brief-stat"><b>{points.length}</b><span>VISIBLE MAP MARKERS</span></div></div>
   {supported?<GlobeBoundary><Suspense fallback={<div className="preloader"><span className="spin">◎</span><strong>Loading 3D planet</strong><p>Optimized Three.js globe · no paid API keys</p><a href="/status.html">Connection diagnostic ↗</a></div>}>
     <Globe ref={globe}
       width={globeWidth} height={globeHeight}
       backgroundColor="rgba(0,0,0,0)"
       globeImageUrl="/earth.svg"
       waitForGlobeReady={false}
       animateIn={false}
       rendererConfig={{antialias:false,alpha:true,powerPreference:'low-power',preserveDrawingBuffer:false}}
       showAtmosphere={true} atmosphereColor="#50b7d6" atmosphereAltitude={.16}
       showGraticules={false}
       pointsData={points}
       pointLat="lat" pointLng="lng"
       pointAltitude={p=>p.kind==='country'?.028:.06}
       pointRadius={p=>p.kind==='country'?.32:p.kind==='base'?.3:.44}
       pointResolution={7}
       pointColor={p=>TYPES[p.kind]?.color||'#94d3d8'}
       pointLabel={p=>getLabel(p)}
       onPointClick={focus}
       ringsData={paneOpen&&chosen?[chosen]:[]}
       ringLat="lat" ringLng="lng"
       ringColor={()=>t=>'rgba(112,236,234,'+(1-t)+')'}
       ringMaxRadius={2.5}
       ringPropagationSpeed={.7}
       ringRepeatPeriod={1650}
       onGlobeReady={init}
     />
   </Suspense></GlobeBoundary>:<VisError message="3D graphics (WebGL) are unavailable in this browser. Please try Chrome or enable hardware acceleration."/>}
   <div className="layerbar" aria-label="Globe overlays">
    <div className="layerhead">MAP LAYERS <span>TURN ON / OFF</span></div>
    <div className="layerchips">{Object.keys(INITIAL_LAYERS).map(k=><button key={k} className={layers[k]?'on':''} onClick={()=>toggle(k)}><span className="layerdot" style={{background:TYPES[{countries:'country',battles:'battle',strikes:'strike',bases:'base',chokepoints:'choke'}[k]].color}}/>{labels[k]}</button>)}</div>
   </div>
   <div className="stage-controls">
     <button onClick={resume} title="Toggle globe rotation">{paused?'▶ ROTATE':'Ⅱ PAUSE'}</button>
     <button onClick={()=>{try{globe.current?.pointOfView({lat:28,lng:27,altitude:2.35},950)}catch{}}}>⌖ WORLD VIEW</button>
   </div>
   <div className="legendbar">DRAG TO ROTATE <b>·</b> PINCH TO ZOOM <b>·</b> TAP MARKERS TO EXPLORE</div>
  </section>
  <aside className={'intelligence '+(paneOpen?'expanded':'')}>
    <div className="panel-caption"><span className="live-indicator"/> FIELD DOSSIER <span className="source-type">REFERENCE DATA</span></div>
    <div className="explore-search">
      <input value={search} onChange={e=>{setSearch(e.target.value);setFilteredMenu(Boolean(e.target.value))}} onFocus={()=>setFilteredMenu(Boolean(search))} placeholder="Find a country, battle, location…" aria-label="Search globe"/>
      <button onClick={()=>{setSearch('');setFilteredMenu(false)}} aria-label="Clear search">{search?'×':'⌕'}</button>
    </div>
    {filteredMenu&&<div className="search-results">{list.length?list.map(p=><button key={p.kind+getLabel(p)} onClick={()=>{focus(p);setSearch('')}}><span style={{color:TYPES[p.kind].color}}>●</span> {getLabel(p)} <small>{TYPES[p.kind].label}</small></button>):<p>No matching reference markers</p>}</div>}
    <div className="dossier-card">
      <div className="classification"><span className="marker-color" style={{background:currentMeta.color}}/>{currentMeta.label}</div>
      <h2>{getLabel(chosen)}</h2>
      <p className="dossier-meta">{resultDescription(chosen)}</p>
      {chosen?.kind==='country'?<div className="country-dossier">
        <select value={chosen.iso} onChange={focusCountry} aria-label="Country">{countryPoints.map(c=><option key={c.iso} value={c.iso}>{c.name}</option>)}</select>
        <div className="dossier-tags">{memberships(chosen.iso).map(g=><span key={g.id}>{g.label}</span>)}</div>
        <p>{nuclearStatus(chosen.iso)}</p>
        <div className="two-stats">
          <div><small>GDP · LATEST AVAILABLE</small><b>{indicators?.gdp?.value!=null?'$'+compactFormat(indicators.gdp.value):'—'}</b><small>{indicators?.gdp?.year||datastate==='loading'?'': 'World Bank'}</small></div>
          <div><small>POPULATION</small><b>{indicators?.population?.value!=null?compactFormat(indicators.population.value):'—'}</b><small>{indicators?.population?.year||'World Bank'}</small></div>
        </div>
        <a href={chosen.source} target="_blank" rel="noopener noreferrer" className="source-btn">COUNTRY DATA ↗</a>
      </div>:<div className="historical-dossier">
        <p>{chosen?.summary||chosen?.details||chosen?.relevance||chosen?.kind||'Public historical reference point.'}</p>
        <div className="dossier-chips"><span>{chosen?.type||chosen?.kind}</span><span>{chosen?.year||chosen?.region||chosen?.host||''}</span></div>
        {chosen?.source&&<a href={chosen.source} target="_blank" rel="noopener noreferrer" className="source-btn">READ SOURCE ↗</a>}
      </div>}
      <p className="caveat">Historical events and installation markers are approximate locations for research, not live tactical positions.</p>
    </div>
    <div className="quick-links"><b>QUICK EXPLORE</b>{[battlePoints[0],strikePoints[0],chokePoints[0],basePoints[0]].map((p,i)=><button key={p.label} onClick={()=>focus(p)}><span className="quick-icon" style={{color:TYPES[p.kind].color}}>◉</span><span><strong>{getLabel(p)}</strong><small>{resultDescription(p)}</small></span><i>↗</i></button>)}</div>
    <div className="bottom-action"><a href="/">ALL GEOPULSE MODULES ↗</a><a href="/status.html">CONNECTION DIAGNOSTIC</a></div>
  </aside>
 </main>
 </div>
}

class RootError extends React.Component{constructor(p){super(p);this.state={error:null}}static getDerivedStateFromError(error){return{error}}componentDidCatch(e){console.error('GEOPULSE 3D crash',e)}render(){return this.state.error?<VisError message={this.state.error.message}/>:this.props.children}}
createRoot(document.getElementById('root')).render(<RootError><App/></RootError>);
