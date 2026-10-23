import React,{useEffect,useMemo,useRef} from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './atlas.css';
const empty={type:'FeatureCollection',features:[]};
const fc=(items,point)=>({type:'FeatureCollection',features:items.map((item,i)=>({type:'Feature',id:i,geometry:{type:'Point',coordinates:[item.lng,item.lat]},properties:{idx:i,name:item.name||item.title||'',type:item.type||item.kind||'Reference'}}))});
export default function Map2D({features,points=[],bases=[],chokepoints=[],selectedIso='',onCountrySelect,onPointSelect,onBaseSelect,onChokeSelect,showBorders=true,showBases=false,showChokes=false,arcs=[]}){
const el=useRef(null),map=useRef(null),callbacks=useRef({}),latestData=useRef(null),data=useMemo(()=>({countries:features?.type==='FeatureCollection'?features:empty,points:fc(points),bases:fc(bases),chokes:fc(chokepoints),arcs:{type:'FeatureCollection',features:arcs.filter(x=>Array.isArray(x.start)&&Array.isArray(x.end)).map((a,i)=>({type:'Feature',id:i,geometry:{type:'LineString',coordinates:[[a.start[1],a.start[0]],[a.end[1],a.end[0]]]},properties:{label:a.label||'Connection'}}))}}),[features,points,bases,chokepoints,arcs]);
latestData.current=data;callbacks.current={onCountrySelect,onPointSelect,onBaseSelect,onChokeSelect,selectedIso};
useEffect(()=>{
if(!el.current)return;
let ready=false,alive=true;
try{
const m=new maplibregl.Map({container:el.current,center:[18,19],zoom:1.4,minZoom:1,maxZoom:11,attributionControl:false,style:{version:8,glyphs:'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]}});
map.current=m;m.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-right');m.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-left');
m.on('load',()=>{if(!alive)return;ready=true;
const src=(id,v)=>m.addSource(id,{type:'geojson',data:v});
src('countries',latestData.current.countries);src('points',latestData.current.points);src('bases',latestData.current.bases);src('chokes',latestData.current.chokes);src('arcs',latestData.current.arcs);
m.addLayer({id:'country-fill',type:'fill',source:'countries',paint:{'fill-color':'#31aac8','fill-opacity':['case',['==',['get','iso'],callbacks.current.selectedIso],.21,.02]}});
m.addLayer({id:'country-line',type:'line',source:'countries',paint:{'line-color':'#8daabe','line-width':.45,'line-opacity':.5}});
m.addLayer({id:'arc-lines',type:'line',source:'arcs',paint:{'line-color':'#f3b968','line-width':1.9,'line-opacity':.8},layout:{'line-cap':'round'}});
const layer=(id,color,radius)=>{m.addLayer({id,type:'circle',source:id,paint:{'circle-color':color,'circle-radius':radius,'circle-opacity':.9,'circle-stroke-width':1.2,'circle-stroke-color':'#effaff'}})};
layer('points','#ff765f',5);layer('bases','#bf95f4',5);layer('chokes','#6bd9ad',6);
m.on('click','country-fill',e=>{const iso=e.features?.[0]?.properties?.iso;if(iso)callbacks.current.onCountrySelect?.(iso)});
for(const [id,fn] of [['points','onPointSelect'],['bases','onBaseSelect'],['chokes','onChokeSelect']]){m.on('click',id,e=>{const idx=Number(e.features?.[0]?.properties?.idx);if(Number.isInteger(idx))callbacks.current[fn]?.(idx)});m.on('mouseenter',id,()=>m.getCanvas().style.cursor='pointer');m.on('mouseleave',id,()=>m.getCanvas().style.cursor='')};
m.on('mouseenter','country-fill',()=>m.getCanvas().style.cursor='pointer');m.on('mouseleave','country-fill',()=>m.getCanvas().style.cursor='');
});
}catch(e){if(el.current)el.current.innerText='2D map could not initialize on this device';}
return()=>{alive=false;try{map.current?.remove()}catch{};map.current=null};
},[]);
useEffect(()=>{const m=map.current;if(!m||!m.isStyleLoaded())return;for(const [name,v] of Object.entries(data))m.getSource(name)?.setData(v);try{m.setPaintProperty('country-fill','fill-opacity',['case',['==',['get','iso'],selectedIso],.22,.02])}catch{}},[data,selectedIso]);
useEffect(()=>{const m=map.current;if(!m||!m.isStyleLoaded())return;
m.setLayoutProperty('country-line','visibility',showBorders?'visible':'none');
m.setLayoutProperty('country-fill','visibility',showBorders?'visible':'none');
m.setLayoutProperty('bases','visibility',showBases?'visible':'none');
m.setLayoutProperty('chokes','visibility',showChokes?'visible':'none');
},[showBorders,showBases,showChokes]);
return <div className="maplibre-root" ref={el} role="application" aria-label="Interactive 2D map with OpenStreetMap tiles"/>}
