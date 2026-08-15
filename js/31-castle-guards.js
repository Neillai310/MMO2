// MMO2 1.49 hard world boundary + realtime loader
(function(){
'use strict';
const allowed=new Set([
'town_silver_knight','town_elf','town_talking','town_gludio','town_gludin',
'training','silver_knight','talking_island','talking_island_port','zone_01','elf_forest','gludio','windwood','desert','kent','dragon_valley',
'zone_06','zone_07','zone_08','zone_09','zone_10','zone_11','zone_12','zone_13','zone_14','zone_15','zone_16','zone_17',
'zone_22','zone_23','zone_24','zone_25','zone_26','zone_27','zone_28','zone_29','zone_30','zone_31','zone_32','zone_33'
]);
const allowedTowns=new Set(['town_silver_knight','town_elf','town_talking','town_gludio','town_gludin']);
function prune(){try{
 if(typeof DB!=='undefined'){
   if(DB.maps)Object.keys(DB.maps).forEach(k=>{if(!allowed.has(k))delete DB.maps[k];});
   if(DB.towns)Object.keys(DB.towns).forEach(k=>{if(!allowedTowns.has(k))delete DB.towns[k];});
   // 地圖刪除後，沒有任何保留地圖引用的怪物也一起移除。
   if(DB.mobs&&DB.maps){let keep=new Set();Object.keys(DB.maps).forEach(k=>(DB.maps[k]||[]).forEach(id=>keep.add(id)));Object.keys(DB.mobs).forEach(k=>{if(!keep.has(k))delete DB.mobs[k];});}
 }
 if(typeof MAP_CATEGORIES!=='undefined')Object.keys(MAP_CATEGORIES).forEach(g=>{if(Array.isArray(MAP_CATEGORIES[g]))MAP_CATEGORIES[g]=MAP_CATEGORIES[g].filter(e=>e&&allowed.has(e.v));});
 if(typeof MAP_REGIONS!=='undefined'&&Array.isArray(MAP_REGIONS)){
   for(let i=MAP_REGIONS.length-1;i>=0;i--){let r=MAP_REGIONS[i];r.maps=(r.maps||[]).filter(e=>e&&allowed.has(e.v));if(!r.maps.length)MAP_REGIONS.splice(i,1);}
 }
 // 舊存檔若停在威頓/奇岩/海音/歐瑞/亞丁等已刪區域，強制送回早期出生村。
 if(typeof player!=='undefined'&&player&&typeof mapState!=='undefined'&&mapState&&!allowed.has(mapState.current)){
   mapState.current=player.cls==='elf'?'town_elf':(player.cls==='knight'?'town_silver_knight':'town_talking');
   player.lastBattleMap='training'; player.lastTownVisited=mapState.current;
 }
 document.querySelectorAll('option').forEach(o=>{let v=o.value;if(v&&!allowed.has(v)&&(/^(town_|zone_)/.test(v)||v.indexOf('_')>=0))o.remove();});
}catch(e){console.warn('[1.49 boundary]',e);}}
function loadRealtime(){if(document.querySelector('script[data-mmo149-realtime]'))return;let s=document.createElement('script');s.src='js/33-realtime.js?v=authoritative-149';s.async=false;s.dataset.mmo149Realtime='1';document.head.appendChild(s);}
prune();loadRealtime();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',prune,{once:true});
setTimeout(prune,0);setTimeout(prune,500);setInterval(prune,5000);
})();
