import React,{useEffect,useMemo,useState} from 'react';
import {Radio,RefreshCw,AlertTriangle,ExternalLink,Clock3,ChevronRight,Info,ArrowUpRight,MapPin,ShieldAlert,Activity} from 'lucide-react';
import './conflict-live.css';
import './conflict-radar.css';

const WINDOWS=[['24h','24 ΩΡΕΣ'],['72h','3 ΗΜΕΡΕΣ'],['7d','7 ΗΜΕΡΕΣ']];
const FOCUSES=[
 ['territory','Καταλήψεις'],
 ['withdrawals','Υποχωρήσεις'],
 ['losses','Απώλειες'],
 ['attacks','Επιθέσεις'],
 ['diplomacy','Διπλωματία'],
 ['all','Όλα']
];
const TOPICS={
 territory:{label:'ΚΑΤΑΛΗΨΕΙΣ / ΑΝΑΚΑΤΑΛΗΨΕΙΣ',short:'Εδαφικές αλλαγές',color:'#ecae70'},
 withdrawals:{label:'ΥΠΟΧΩΡΗΣΕΙΣ / ΑΠΩΛΕΙΑ ΕΛΕΓΧΟΥ',short:'Υποχωρήσεις',color:'#ed8c91'},
 losses:{label:'ΑΝΑΦΟΡΕΣ ΑΠΩΛΕΙΩΝ',short:'Απώλειες',color:'#d99ade'},
 attacks:{label:'ΜΑΧΕΣ / ΕΠΙΘΕΣΕΙΣ',short:'Επιθέσεις',color:'#f07778'},
 diplomacy:{label:'ΔΙΠΛΩΜΑΤΙΚΕΣ ΕΞΕΛΙΞΕΙΣ',short:'Διπλωματία',color:'#6ed8c7'},
 other:{label:'ΣΥΝΑΦΗΣ ΔΗΜΟΣΙΟΓΡΑΦΙΚΗ ΑΝΑΦΟΡΑ',short:'Άλλη εξέλιξη',color:'#96b9d0'}
};
function dateString(s){
 const x=String(s||'');
 if(/^\d{12,14}$/.test(x))return x.slice(6,8)+'/'+x.slice(4,6)+'/'+x.slice(0,4)+' · '+x.slice(8,10)+':'+x.slice(10,12)+' UTC';
 return x||'Ώρα μη διαθέσιμη';
}
function useFeed(url){
 const [response,setResponse]=useState({status:'loading',articles:[]});
 const [loading,setLoading]=useState(true),[refreshId,setRefreshId]=useState(0);
 useEffect(()=>{
  if(!url)return;
  let active=true;
  const fetchLatest=async()=>{
   if(!active)return;
   setLoading(true);
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),21000);
   try{
    const res=await fetch(url,{signal:controller.signal,cache:'no-store'});
    if(!res.ok)throw Error('HTTP '+res.status);
    const body=await res.json();
    if(active)setResponse(body);
   }catch(e){
    if(active)setResponse(previous=>({...previous,status:previous.articles?.length?'stale':'unavailable',
     message:'Δεν κατέστη δυνατή η ανάκτηση νεότερων δημοσιευμάτων.'}));
   }finally{clearTimeout(timeout);if(active)setLoading(false)}
  };
  fetchLatest();
  const timer=setInterval(fetchLatest,5*60*1000);
  return()=>{active=false;clearInterval(timer)};
 },[url,refreshId]);
 return {...response,loading,refresh:()=>setRefreshId(v=>v+1)};
}
function FeedStatus({feed}){
 return <div className={'gp-radar-status '+(feed.status==='ok'?'ok':feed.status==='stale'?'stale':'')}>
  <span className="gp-radar-status-dot"/>
  <strong>{feed.loading?'Έλεγχος πηγών…':feed.status==='ok'?'Πηγή: '+(feed.source||'ειδησεογραφικό ευρετήριο'):feed.status==='stale'?'Παλιότερες αναφορές':'Η πηγή δεν απαντά'}</strong>
  {feed.updatedAt&&<span>Τελευταία ανάκτηση {new Date(feed.updatedAt).toLocaleString('el-GR')}</span>}
  <button onClick={feed.refresh} title="Έλεγχος νέων ειδήσεων" aria-label="Έλεγχος νέων ειδήσεων"><RefreshCw size={15}/></button>
 </div>;
}
function WindowTabs({value,onChange}){
 return <div className="gp-radar-periods">{WINDOWS.map(([id,label])=><button key={id} className={value===id?'selected':''} onClick={()=>onChange(id)}>{label}</button>)}</div>;
}
function FocusTabs({value,onChange}){
 return <div className="gp-radar-filters">{FOCUSES.map(([id,label])=><button key={id} className={value===id?'selected':''} onClick={()=>onChange(id)}><span className="gp-radar-filter-dot" style={{background:TOPICS[id]?.color||'#89cbd0'}}/>{label}</button>)}</div>;
}
function Story({item,global=false}){
 const category=TOPICS[item.category]||TOPICS.other;
 return <a className="gp-radar-story" href={item.url} target="_blank" rel="noopener noreferrer">
  <div className="gp-radar-story-top">
   <span className="gp-radar-category" style={{borderColor:category.color,color:category.color}}>{category.label}</span>
   {global&&<span className="gp-radar-frontlabel"><MapPin size={11}/>{item.frontLabel||'Παγκόσμια'}</span>}
  </div>
  <strong>{item.title}</strong>
  <div className="gp-radar-meta"><Clock3 size={12}/>{dateString(item.date)}<span className="gp-radar-dot"/> {item.domain||'Άγνωστη πηγή'}</div>
  <div className="gp-radar-story-bottom"><span>ΑΝΑΦΟΡΑ ΜΕΣΟΥ · ΟΧΙ ΕΠΑΛΗΘΕΥΜΕΝΟ ΑΠΟ ΤΟ GEOPULSE</span><ExternalLink size={13}/></div>
 </a>;
}
function StoryFeed({feed,global=false,limit=24}){
 const records=Array.isArray(feed.articles)?feed.articles:[];
 return <div className="gp-radar-stories">
  {records.length>0&&<p className="gp-radar-count">Εμφανίζονται {Math.min(records.length,limit)} από {records.length} καταχωρισμένα δημοσιεύματα. Δεν είναι αριθμός πραγματικών μαχών ή απωλειών.</p>}
  {records.slice(0,limit).map((a,i)=><Story item={a} global={global} key={a.url+i}/>)}
  {!records.length&&<div className="gp-radar-empty">
   <AlertTriangle size={19}/>
   <strong>{feed.loading?'Ανάκτηση ειδήσεων…':'Δεν υπάρχουν διαθέσιμα αποτελέσματα σε αυτό το δείγμα.'}</strong>
   <p>{feed.message||'Άλλαξε κατηγορία ή χρονικό διάστημα. Η απουσία τίτλων δεν σημαίνει ότι δεν σημειώθηκαν γεγονότα.'}</p>
  </div>}
 </div>;
}
export default function ConflictMonitor({selected,onFocus,onFronts}){
 const [fronts,setFronts]=useState([]),[catalogStatus,setCatalogStatus]=useState('loading');
 const [globalWindow,setGlobalWindow]=useState('24h'),[globalFocus,setGlobalFocus]=useState('territory');
 const [localWindow,setLocalWindow]=useState('24h'),[localFocus,setLocalFocus]=useState('territory');
 const [showFronts,setShowFronts]=useState(false);
 useEffect(()=>{
  let active=true;
  fetch('/api/fronts',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(Error('Not available'))).then(data=>{
   if(!active)return;
   setFronts(data.fronts||[]);onFronts(data.fronts||[]);setCatalogStatus('ok');
  }).catch(()=>{if(active)setCatalogStatus('unavailable')});
  return()=>{active=false};
 },[onFronts]);
 const current=useMemo(()=>fronts.find(f=>f.id===(selected?.kind==='front'?selected.id:null))||fronts[0],[fronts,selected?.id,selected?.kind]);
 const globalUrl='/api/fronts?scope=global&window='+globalWindow+'&focus='+globalFocus;
 const localUrl=current?'/api/fronts?id='+encodeURIComponent(current.id)+'&window='+localWindow+'&focus='+localFocus:null;
 const globalFeed=useFeed(globalUrl),localFeed=useFeed(localUrl);
 const choose=f=>{
  setShowFronts(false);
  onFocus({...f,kind:'front',name:f.labelEl||f.label,title:f.labelEl||f.label,source:'https://www.gdeltproject.org/'});
 };
 return <section className="gp-radar" aria-label="Συνεχής ενημέρωση πολεμικών μετώπων">
  <div className="gp-radar-hero">
   <div className="gp-radar-kicker"><Radio size={16}/> GEOPULSE / BATTLEFIELD UPDATES <span className="gp-radar-live-pill">NEWS RADAR</span></div>
   <h2>Ποιος προελαύνει. Ποιος υποχωρεί. Τι αναφέρεται.</h2>
   <p>Δημοσιεύματα για καταλήψεις, ανακαταλήψεις, υποχωρήσεις, απώλειες και επιθέσεις από όλα τα μεγάλα μέτωπα.</p>
   <div className="gp-radar-update"><Activity size={14}/> Αυτόματος έλεγχος κάθε 5 λεπτά όσο η καρτέλα είναι ανοιχτή</div>
  </div>
  <div className="gp-radar-head"><div><span>01 / ΠΑΓΚΟΣΜΙΟΣ ΠΑΛΜΟΣ</span><h3>Νεότερες πολεμικές εξελίξεις</h3></div><span className="gp-radar-tiny">Κυλιόμενη ειδησεογραφία</span></div>
  <FocusTabs value={globalFocus} onChange={setGlobalFocus}/>
  <WindowTabs value={globalWindow} onChange={setGlobalWindow}/>
  <FeedStatus feed={globalFeed}/>
  <StoryFeed feed={globalFeed} global limit={12}/>
  <div className="gp-radar-separator"/>
  <div className="gp-radar-head"><div><span>02 / ΑΝΑ ΜΕΤΩΠΟ</span><h3>Στοχευμένη παρακολούθηση</h3></div><span className="gp-radar-tiny">{fronts.length} περιοχές</span></div>
  {catalogStatus==='unavailable'&&<div className="gp-radar-empty">Ο κατάλογος περιοχών είναι προσωρινά μη διαθέσιμος.</div>}
  <button className="gp-radar-front-selector" onClick={()=>setShowFronts(v=>!v)} aria-expanded={showFronts}>
   <span><MapPin size={17}/> <strong>{current?.labelEl||current?.label||'Επιλογή μετώπου'}</strong><small>{current?.region||''}</small></span><ChevronRight className={showFronts?'gp-radar-rotated':''} size={18}/>
  </button>
  {showFronts&&<div className="gp-radar-front-list">{fronts.map(f=><button className={f.id===current?.id?'active':''} key={f.id} onClick={()=>choose(f)}>
   <strong>{f.labelEl||f.label}</strong><small>{f.category==='flashpoint'?'Στρατηγική ένταση, όχι αναγκαστικά πόλεμος':'Σύγκρουση / περιοχή παρακολούθησης'}</small>
  </button>)}</div>}
  {current&&<>
   <div className="gp-radar-context"><p>{current.why}</p><span>Γεωγραφικός δείκτης περιοχής, όχι τρέχουσα στρατιωτική θέση.</span></div>
   <FocusTabs value={localFocus} onChange={setLocalFocus}/>
   <WindowTabs value={localWindow} onChange={setLocalWindow}/>
   <FeedStatus feed={localFeed}/>
   <StoryFeed feed={localFeed} limit={28}/>
  </>}
  <div className="gp-radar-ethics"><ShieldAlert size={18}/><div><strong>Τι γνωρίζουμε πραγματικά</strong><p>Πηγές: GDELT και εναλλακτικά Google News RSS / Bing News RSS. Αν η κύρια πηγή περιορίζει τα αιτήματα, εμφανίζεται η διαθέσιμη εφεδρική. Η κατηγορία προκύπτει αυτόματα από τον τίτλο ή τη θεματική αναζήτηση. Οι ειδήσεις μπορεί να περιλαμβάνουν ισχυρισμούς εμπόλεμων πλευρών. Χωρίς ανεξάρτητη τεκμηρίωση δεν επιβεβαιώνουμε καταλήψεις, αριθμό νεκρών ή αλλαγές συνόρων. Η θέση στη σφαίρα είναι περιφερειακή, όχι τρέχον επιχειρησιακό στίγμα.</p><a href="https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/" target="_blank" rel="noopener noreferrer">Πηγή ειδησεογραφικής αναζήτησης: GDELT DOC 2.0 <ArrowUpRight size={13}/></a></div></div>
 </section>;
}
