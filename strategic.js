// Public, approximate geographic reference layers, not operational positions.
export const nato=['ALB','BEL','BGR','CAN','HRV','CZE','DNK','EST','FIN','FRA','DEU','GRC','HUN','ISL','ITA','LVA','LTU','LUX','MNE','NLD','MKD','NOR','POL','PRT','ROU','SVK','SVN','ESP','SWE','TUR','GBR','USA'];
export const eu=['AUT','BEL','BGR','HRV','CYP','CZE','DNK','EST','FIN','FRA','DEU','GRC','HUN','IRL','ITA','LVA','LTU','LUX','MLT','NLD','POL','PRT','ROU','SVK','SVN','ESP','SWE'];
export const g7=['CAN','FRA','DEU','ITA','JPN','GBR','USA'];
export const nuclear=['USA','RUS','GBR','FRA','CHN','IND','PAK','PRK','ISR'];
export const alliances=[
{id:'nato',label:'NATO',members:nato,color:'#63c5e9',source:'https://www.nato.int/cps/en/natohq/topics_52044.htm',scope:'Formal membership'},
{id:'eu',label:'European Union',members:eu,color:'#8a9bff',source:'https://european-union.europa.eu/principles-countries-history/eu-countries_en',scope:'Formal membership'},
{id:'g7',label:'G7',members:g7,color:'#efb66b',source:'https://www.g7germany.de/g7-en',scope:'Informal group membership'}
];
export const bases=[
{name:'Ramstein Air Base',lat:49.44,lng:7.60,host:'DEU',operator:'USA',kind:'Air base',source:'https://www.ramstein.af.mil/'},
{name:'Naval Support Activity Souda Bay',lat:35.49,lng:24.12,host:'GRC',operator:'USA',kind:'Naval support',source:'https://cnreurafcent.cnic.navy.mil/Installations/NSA-Souda-Bay/'},
{name:'Incirlik Air Base',lat:37.00,lng:35.43,host:'TUR',operator:'TUR',kind:'Air base / allied presence',source:'https://www.incirlik.af.mil/'},
{name:'Al Udeid Air Base',lat:25.12,lng:51.32,host:'QAT',operator:'QAT',kind:'Air base / allied presence',source:'https://www.afcent.af.mil/'},
{name:'Naval Support Activity Bahrain',lat:26.21,lng:50.60,host:'BHR',operator:'USA',kind:'Naval support',source:'https://cnreurafcent.cnic.navy.mil/Installations/NSA-Bahrain/'},
{name:'Naval Base Rota',lat:36.63,lng:-6.35,host:'ESP',operator:'ESP',kind:'Naval base / allied presence',source:'https://cnreurafcent.cnic.navy.mil/Installations/NAVSTA-Rota/'},
{name:'RAF Lakenheath',lat:52.41,lng:.56,host:'GBR',operator:'USA',kind:'Air base',source:'https://www.lakenheath.af.mil/'},
{name:'Kadena Air Base',lat:26.35,lng:127.77,host:'JPN',operator:'USA',kind:'Air base',source:'https://www.kadena.af.mil/'},
{name:'Yokosuka Naval Base',lat:35.28,lng:139.66,host:'JPN',operator:'USA',kind:'Naval base',source:'https://cnrj.cnic.navy.mil/Installations/CFA-Yokosuka/'},
{name:'Camp Humphreys',lat:36.96,lng:127.03,host:'KOR',operator:'USA',kind:'Military garrison',source:'https://home.army.mil/humphreys/'},
{name:'Andersen Air Force Base',lat:13.58,lng:144.93,host:'GUM',operator:'USA',kind:'Air base',source:'https://www.andersen.af.mil/'},
{name:'Camp Lemonnier',lat:11.55,lng:43.15,host:'DJI',operator:'USA',kind:'Military base',source:'https://cnreurafcent.cnic.navy.mil/Installations/Camp-Lemonnier/'},
{name:'Pituffik Space Base',lat:76.53,lng:-68.70,host:'GRL',operator:'USA',kind:'Space base',source:'https://www.petersonschriever.spaceforce.mil/'},
{name:'Diego Garcia Naval Support Facility',lat:-7.31,lng:72.42,host:'IOT',operator:'GBR',kind:'Naval / air support',source:'https://www.cnic.navy.mil/'}
].map((b,i)=>({...b,id:'base-'+i,precision:'approximate public installation reference; not a live operational position'}));
export const chokepoints=[
{id:'hormuz',name:'Strait of Hormuz',lat:26.57,lng:56.25,region:'Middle East',relevance:'Oil and gas shipping corridor',source:'https://www.eia.gov/todayinenergy/'},
{id:'suez',name:'Suez Canal',lat:30.45,lng:32.35,region:'Middle East',relevance:'Europe–Asia maritime shortcut',source:'https://www.suezcanal.gov.eg/'},
{id:'bab',name:'Bab el-Mandeb',lat:12.58,lng:43.33,region:'Middle East',relevance:'Red Sea gateway',source:'https://www.eia.gov/todayinenergy/'},
{id:'malacca',name:'Strait of Malacca',lat:2.60,lng:101.10,region:'Asia',relevance:'Indian–Pacific Ocean corridor',source:'https://www.eia.gov/todayinenergy/'},
{id:'panama',name:'Panama Canal',lat:9.08,lng:-79.68,region:'Americas',relevance:'Atlantic–Pacific maritime shortcut',source:'https://pancanal.com/'},
{id:'bosphorus',name:'Bosporus',lat:41.12,lng:29.07,region:'Europe',relevance:'Black Sea shipping route',source:'https://www.imo.org/'},
{id:'gibraltar',name:'Strait of Gibraltar',lat:35.97,lng:-5.58,region:'Europe',relevance:'Mediterranean–Atlantic maritime route',source:'https://www.imo.org/'},
{id:'taiwan',name:'Taiwan Strait',lat:24.4,lng:119.3,region:'Asia',relevance:'East Asian shipping corridor',source:'https://www.imo.org/'},
{id:'denmark',name:'Danish Straits',lat:55.7,lng:11.1,region:'Europe',relevance:'Baltic shipping gateway',source:'https://www.imo.org/'},
{id:'cape',name:'Cape of Good Hope',lat:-34.35,lng:18.48,region:'Africa',relevance:'Alternative route around southern Africa',source:'https://www.imo.org/'}
];
export const nuclearStatus=(iso)=>nuclear.includes(iso)?iso==='ISR'?'Widely assessed to possess nuclear weapons (not officially acknowledged)':'Nuclear-armed state':'No publicly established national nuclear arsenal';
export const memberships=(iso)=>alliances.filter(a=>a.members.includes(iso));
export const commonMemberships=(a,b)=>alliances.filter(x=>x.members.includes(a)&&x.members.includes(b));
export const approximateTradeLinks=[
  // Indicative named maritime routes, not asserted trade quantities.
  {from:[1.32,103.82],to:[51.50,-.12],name:'Asia–Europe maritime corridor',via:[12.58,43.33],source:'https://www.imo.org/'},
  {from:[25.27,55.30],to:[51.50,-.12],name:'Gulf–Europe maritime corridor',via:[30.45,32.35],source:'https://www.eia.gov/todayinenergy/'},
  {from:[31.23,121.47],to:[34.05,-118.25],name:'Trans-Pacific trade corridor',via:[34.5,170],source:'https://unctad.org/topic/transport-and-trade-logistics/review-of-maritime-transport'}
];
