// MMO2 GM POS + World Boss UI. Realtime packets are handled by 33-realtime.js.
(function(){
'use strict';
let gm=false,menu=[],boss=null;
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function ensure(){
 if(document.getElementById('gm-pos-btn'))return;
 const root=document.createElement('div');root.id='gm-pos-root';
 root.innerHTML=`<button id="gm-pos-btn" type="button" aria-label="GM POS">GM POS</button>
 <div id="gm-pos-modal" class="gm-pos-modal hidden"><div class="gm-pos-card"><div class="gm-pos-head"><div><b>滋味亭 POS</b><small>世界 BOSS 製造系統</small></div><button id="gm-pos-close" type="button">×</button></div><div id="gm-pos-menu"></div><div class="gm-pos-foot"><button id="gm-boss-cancel" class="btn" type="button">結束目前 BOSS</button></div></div></div>
 <div id="world-boss-banner" class="world-boss-banner hidden"></div>`;
 document.body.appendChild(root);
 const btn=document.getElementById('gm-pos-btn');
 btn.onclick=()=>{renderMenu();document.getElementById('gm-pos-modal')?.classList.remove('hidden')};
 document.getElementById('gm-pos-close').onclick=()=>document.getElementById('gm-pos-modal')?.classList.add('hidden');
 document.getElementById('gm-boss-cancel').onclick=()=>window.MMO149Realtime?.gmBossCancel?.();
 syncButton();
}
function isLiveGm(){return gm===true||window.MMO149Realtime?.isGM?.()===true}
function syncButton(){
 const btn=document.getElementById('gm-pos-btn');if(!btn)return;
 const live=isLiveGm();
 btn.style.cssText=live?
 'display:block!important;visibility:visible!important;opacity:1!important;position:fixed!important;right:16px!important;bottom:86px!important;z-index:2147483647!important;width:76px!important;height:76px!important;border:3px solid #ffd56a!important;border-radius:50%!important;background:radial-gradient(circle,#a93b1d,#541305)!important;color:#fff2a8!important;font:900 12px/1.1 sans-serif!important;box-shadow:0 0 0 3px #210800,0 0 24px #ff9f2f!important;cursor:pointer!important;pointer-events:auto!important;transform:none!important;clip:auto!important;overflow:visible!important':
 'display:none!important';
}
function renderMenu(){
 ensure();const box=document.getElementById('gm-pos-menu');if(!box)return;
 if(!menu.length){box.innerHTML='<div style="padding:22px;text-align:center;color:#6b4b31">GM 已登入，但 POS 菜單尚未由伺服器送達。請稍候 1 秒再開啟。</div>';return;}
 const groups={};for(const x of menu)(groups[x.category]||(groups[x.category]=[])).push(x);
 box.innerHTML=Object.entries(groups).map(([cat,rows])=>`<section class="pos-group"><h3>${esc(cat)}</h3><div class="pos-grid">${rows.map(x=>`<button class="pos-item" type="button" data-menu-id="${esc(x.id)}"><b>${esc(x.name)}</b><span>$${Number(x.price)||0}</span><small>製造 BOSS</small></button>`).join('')}</div></section>`).join('');
 box.querySelectorAll('[data-menu-id]').forEach(b=>b.onclick=()=>window.MMO149Realtime?.gmBossSpawn?.(b.dataset.menuId));
}
function status(p){gm=!!p?.gm;if(Array.isArray(p?.menu)&&p.menu.length)menu=p.menu;if(p?.boss)boss=p.boss;ensure();syncButton();renderMenu();if(boss)update({active:true,boss});}
function update(p){ensure();const bar=document.getElementById('world-boss-banner');if(!bar)return;if(!p||!p.active){boss=null;bar.classList.add('hidden');if(p?.defeated)alert(`世界 BOSS「${p.defeated.name}」已被討伐！\n最後一擊：${p.defeated.killer||'冒險者'}`);return;}boss=p.boss||boss;if(!boss)return;bar.classList.remove('hidden');const hp=Math.max(0,Number(boss.hp)||0),max=Math.max(1,Number(boss.maxHp)||1),pc=Math.max(0,Math.min(100,hp/max*100));bar.innerHTML=`<div class="boss-title">⚔ 世界 BOSS　${esc(boss.name)} <small>${esc(boss.category||'')} / POS $${Number(boss.price)||0}</small></div><div class="boss-hp"><i style="width:${pc}%"></i><span>${hp.toLocaleString()} / ${max.toLocaleString()}</span></div><div class="boss-meta">GM：${esc(boss.spawnedBy||'GM')}　參戰 ${Number(boss.participants)||0} 人</div>`;}
window.MMO149BossUI={status,update,isGM:()=>isLiveGm(),syncButton,open:()=>{ensure();renderMenu();document.getElementById('gm-pos-modal')?.classList.remove('hidden')}};
function boot(){ensure();syncButton();setInterval(syncButton,250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();