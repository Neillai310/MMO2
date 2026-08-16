// Reference-style HUD controller. Presentation only; gameplay stays server authoritative.
(function(){
'use strict';
const $=id=>document.getElementById(id);
const ITEM_NAMES={potion_red:'紅色藥水',potion_orange:'橙色藥水',potion_clear:'白色藥水'};
const ITEM_IMG={potion_red:'assets/icons/items/紅色藥水.png',potion_orange:'assets/icons/items/橙色藥水.png',potion_clear:'assets/icons/items/白色藥水.png'};
let lastEventKey='';
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function findItem(self,id){return (self?.inventory||[]).find(x=>x?.id===id);}
function renderTop(self){if(!self)return;const gold=$('hud-gold');if(gold)gold.textContent=Number(self.gold||0).toLocaleString();const lv=$('hud-level');if(lv)lv.textContent='Lv.'+(self.lv||1);}
function renderHotbar(self){const box=$('hud-hotbar');if(!box||!self)return;const potionIds=['potion_red','potion_orange','potion_clear'];const potionHtml=potionIds.map((id,i)=>{const it=findItem(self,id),cnt=Number(it?.cnt||0),src=ITEM_IMG[id];return `<button class="hot-slot potion-slot" ${it?'':'disabled'} data-uid="${esc(it?.uid||'')}"><img src="${encodeURI(src)}" onerror="this.style.opacity=.25"><b>${cnt}</b><small>F${i+1}</small></button>`;}).join('');const skillHtml=[['sk_light_arrow','⚡','1'],['sk_heal','✦','2'],['skill3','✹','3'],['skill4','✧','4']].map(([id,icon,key])=>`<button class="hot-slot skill-slot" data-skill="${id}"><span>${icon}</span><small>${key}</small></button>`).join('');box.innerHTML=potionHtml+skillHtml+`<button id="hud-auto" class="hud-auto ${window.MMO149Realtime?.isAutoAttack?.()?'active':''}"><span>⚔</span><b>AUTO</b></button>`;box.querySelectorAll('.potion-slot').forEach(b=>b.onclick=()=>{if(b.dataset.uid)window.MMO149Realtime?.useItem?.(b.dataset.uid);});$('hud-auto').onclick=()=>{window.MMO149Realtime?.toggleAutoAttack?.();setTimeout(()=>renderHotbar(window.MMO149Realtime?.snapshot?.()?.self),30);};}
function renderAfk(evt){const box=$('offline-summary');if(!box)return;if(!evt||evt.type!=='offline_afk')return;const sec=Number(evt.seconds)||0,mins=Math.floor(sec/60),drops=(evt.drops||[]).reduce((n,d)=>n+(Number(d.cnt)||0),0);box.innerHTML=`<h3>離線掛機結算</h3><div class="offline-body"><div class="offline-chest">◆</div><div><p>時間：<b>${mins}</b> 分鐘</p><p>擊殺：<b>${Number(evt.kills)||0}</b></p><p>EXP：<b>${Number(evt.exp||0).toLocaleString()}</b></p><p>金幣：<b>${Number(evt.gold||0).toLocaleString()}</b></p><p>掉落：<b>${drops}</b> 件</p></div></div>`;}
function renderMapMeta(snap){const e=$('hud-map-level');if(!e)return;const mobs=snap?.world?.mobs||[];const levels=mobs.map(m=>Number(m.lv)||0).filter(Boolean);if(!levels.length){e.textContent='安全區';return;}e.textContent='Lv.'+Math.min(...levels)+' ~ '+Math.max(...levels);}
function tick(){const snap=window.MMO149Realtime?.snapshot?.();if(!snap?.self)return;renderTop(snap.self);renderHotbar(snap.self);renderMapMeta(snap);const evt=snap.event;if(evt){const key=[evt.type,evt.seconds,evt.kills,evt.exp,evt.gold,evt.to].join('|');if(key!==lastEventKey){lastEventKey=key;renderAfk(evt);}}}
function setup(){const game=$('game-screen');if(!game)return false;tick();return true;}
function boot(){if(!setup()){const t=setInterval(()=>{if(setup())clearInterval(t)},50);}setInterval(tick,700);}
window.MMO149Hud={refresh:tick,renderAfk};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
