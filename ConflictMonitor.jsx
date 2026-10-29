import React,{useEffect,useMemo,useState} from 'react';
import {Radio,RefreshCw,AlertTriangle,ExternalLink,Clock3,Globe2,ChevronRight,Info} from 'lucide-react';
import './conflict-live.css';
const WINDOWS=[['24h','24 ώρες'],['72h','3 ημέρες'],['7d','7 ημέρες']];
const classify=t=>{const s=String(t||'').toLowerCase();return /\\b(airstrike|strike|attack|missile|drone|bombardment|shelling|clashes|clash|fighting|offensive|battle|explosion)\\b/.test(s)?'clashes':/\\b(ceasefire|peace talks|negotiations|truce|diplomacy|deal)\\b/.test(s)?'diplomacy':'other'};
const stamp=s=>{if(!s)return 'Χρόνος μη διαθέσιμος';const d=String(s);return /^\d{12,14}$/.test(d)?d.slice(6,8)+'/'+d.slice(4,6)+'/'+d.slice(0,4)+' '+d.slice(8,10)+':'+d.slice(10,12)+' UTC':d};
function Status({status,updatedAt}){return <div className={'gp-live-status '+(status==='ok'?'ok':status==='stale'?'stale':'')}><span className="gp-live-ping"/><span>{status==='loading'?'Ανάκτηση δημοσιευμάτων…':status==='ok'?'Σύνδεση GDELT ενεργή':status==='stale'?'Προσωρινά παλαιότερα δεδομένα':'Η τροφοδοσία δεν είναι διαθέσιμη'}</span>{updatedAt&&<small>Έλεγχος {new Date(updatedAt).toLocaleString('el-GR')}</small>}</div>}
export default function ConflictMonitor({selected,onFocus,onFronts}){
 const [fronts,setFronts]=useState([]),[catalogStatus,setCatalogStatus]=useState('loading');
 const [window,setWindow]=useState('72h'),[articleState,setArticleState]=useState({status:'loading',articles:[]}),[tick,setTick]=useState(0),[filter,setFilter]=useState('all');
 useEffect(()=>{let live=true;fetch('/api/fronts').then(r=>r.ok?r.json():Promise.reject(Error('Catalogue unavailable'))).then(d=>{if(!live)return;setFronts(d.fronts||[]);onFronts(d.fronts||[]);setCatalogStatus('ok')}).catch(()=>{if(live)setCatalogStatus('unavailable')});return()=>{live=false}},[onFronts]);
 const current=useMemo(()=>fronts.find(f=>f.id===(selected?.kind==='front'?selected.id:null))||fronts[0],[fronts,selected?.id,selected?.kind]);
 useEffect(()=>{
  if(!current)return;
  let live=true;const ctrl=new AbortController();
  const load=()=>{if(!live)return;setArticleState(s=>({...s,status:'loading'}));fetch('/api/fronts?id='+encodeURIComponent(current.id)+'&window='+window,{signal:ctrl.signal}).then(r=>r.ok?r.json():Promise.reject(Error('Upstream unavailable'))).then(d=>{if(live)setArticleState(d)}).catch(e=>{if(live&&e.name!=='AbortError')setArticleState({status:'unavailable',articles:[],message:'Δεν είναι διαθέσιμες νέες πηγές.'})})};
  load();const id=setInterval(load,8*60*1000);
  return()=>{live=false;clearInterval(id);ctrl.abort()};
 },[current?.id,window,tick]);
 const choose=f=>{setFilter('all');onFocus({...f,kind:'front',name:f.labelEl||f.label,title:f.labelEl||f.label,source:'https://www.gdeltproject.org/'})};
 const stories=articleState.articles||[];
 const filteredStories=stories.filter(a=>filter==='all'||classify(a.title)===filter);
 return <section className="gp-live" aria-label="Παρακολούθηση συγκρούσεων">
  <div className="gp-live-hero"><div className="gp-live-kicker"><Radio size={15}/> GLOBAL CONFLICT MONITOR <span className="gp-live-chip">NEWS RADAR</span></div>
    <h2>Τα μέτωπα που επηρεάζουν τον κόσμο.</h2><p>Παρακολούθηση συγκρούσεων και στρατηγικών εστιών έντασης, με πηγές και ευρύτερες συνέπειες.</p>
    <div className="gp-live-note"><Info size={14}/> Οι δείκτες δείχνουν γενικές περιοχές, όχι θέσεις μαχών ή μετακινήσεις δυνάμεων.</div>
  </div>
  {catalogStatus==='unavailable'&&<div className="gp-live-warning"><AlertTriangle size={15}/> Ο κατάλογος δεν φορτώθηκε. Δεν εμφανίζουμε υποθετικά μέτωπα.</div>}
  <div className="gp-live-heading"><strong>ΠΑΓΚΟΣΜΙΟΣ ΧΑΡΤΗΣ ΕΣΤΙΩΝ</strong><small>{fronts.length} περιοχές παρακολούθησης</small></div>
  <div className="gp-live-fronts">{fronts.map((f,i)=><button key={f.id} onClick={()=>choose(f)} className={'gp-live-front '+(current?.id===f.id?'active':'')} aria-pressed={current?.id===f.id}><span className="gp-live-rank">{String(i+1).padStart(2,'0')}</span><span className="gp-live-front-name"><strong>{f.labelEl||f.label}</strong><small>{f.category==='flashpoint'?'Στρατηγική εστία έντασης':'Ένοπλη σύγκρουση'} · {f.region}</small></span><ChevronRight size={15}/></button>)}</div>
  {current&&<div className="gp-live-dossier">
   <div className="gp-live-heading"><strong>ΑΝΑΛΥΣΗ ΜΕΤΩΠΟΥ</strong><small>{current.impact==='Global'?'Παγκόσμια σημασία':'Περιφερειακή σημασία'}</small></div>
   <h3>{current.labelEl||current.label}</h3>
   <p>{current.why}</p>
   <div className="gp-live-tags">{(current.channels||[]).map(ch=><span key={ch}>{ch}</span>)}</div>
   {current.category==='flashpoint'&&<div className="gp-live-warning"><Info size={14}/> Εστία έντασης — δεν δηλώνει ότι διεξάγεται πόλεμος.</div>}
   <div className="gp-live-heading gp-live-reporthead"><strong>ΝΕΟΤΕΡΑ ΔΗΜΟΣΙΕΥΜΑΤΑ</strong><button onClick={()=>setTick(t=>t+1)} title="Έλεγχος ενημέρωσης" aria-label="Έλεγχος ενημέρωσης"><RefreshCw size={16}/></button></div>
   <div className="gp-live-windows">{WINDOWS.map(([id,name])=><button key={id} onClick={()=>setWindow(id)} className={window===id?'active':''}>{name}</button>)}</div>
   <Status status={articleState.status} updatedAt={articleState.updatedAt}/>
   <div className="gp-live-windows">{[['all','Όλα'],['clashes','Αναφορές μαχών'],['diplomacy','Διπλωματία']].map(([id,label])=><button key={id} className={filter===id?'active':''} onClick={()=>setFilter(id)}>{label}</button>)}</div>
   {stories.length>0&&<div className="gp-live-result-count">{stories.length} δημοσιεύματα στο επιστρεφόμενο δείγμα — <strong>όχι</strong> αριθμός μαχών</div>}
   <div className="gp-live-articles">{filteredStories.length?filteredStories.map((a,i)=><a href={a.url} key={a.url+i} target="_blank" rel="noopener noreferrer" className="gp-live-article"><span className="gp-live-article-meta"><Clock3 size={12}/> Εντοπίστηκε {stamp(a.date)} · {a.domain||'Πηγή'}</span><span className="gp-live-read">{classify(a.title)==='clashes'?'ΤΙΤΛΟΣ ΜΕ ΑΝΑΦΟΡΑ ΣΕ ΜΑΧΗ/ΕΠΙΘΕΣΗ':classify(a.title)==='diplomacy'?'ΤΙΤΛΟΣ ΔΙΠΛΩΜΑΤΙΚΗΣ ΕΞΕΛΙΞΗΣ':'ΔΙΕΘΝΗΣ ΕΞΕΛΙΞΗ'} · ΑΥΤΟΜΑΤΗ ΤΑΞΙΝΟΜΗΣΗ</span><strong>{a.title}</strong><span className="gp-live-read">ΑΝΟΙΓΜΑ ΠΡΩΤΟΓΕΝΟΥΣ ΔΗΜΟΣΙΕΥΜΑΤΟΣ <ExternalLink size={12}/></span></a>):<p className="gp-live-empty">{articleState.status==='loading'?'Αναζητούνται πρόσφατες πηγές…':articleState.message||'Δεν επιστράφηκαν άρθρα για αυτό το διάστημα ή για το επιλεγμένο φίλτρο. Δεν σημαίνει ότι δεν υπάρχουν εξελίξεις.'}</p>}</div>
   <div className="gp-live-foot"><AlertTriangle size={15}/> Το GDELT καταγράφει ειδησεογραφική κάλυψη. Δεν επαληθεύει ανεξάρτητα την έκβαση μαχών, τις απώλειες ή τα σύνορα ελέγχου. Οι τίτλοι μπορεί να περιέχουν ανακριβείς ισχυρισμούς.</div>
   <a href="https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/" target="_blank" rel="noopener noreferrer" className="gp-live-method">ΜΕΘΟΔΟΛΟΓΙΑ ΚΑΙ ΠΗΓΗ <ExternalLink size={13}/></a>
  </div>}
 </section>;
}
