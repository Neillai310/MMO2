// MMO2 AFK controls.
(function(){
'use strict';
function setStatus(enabled){const b=document.getElementById('offline-afk-btn');if(!b)return;b.textContent='離線掛機：'+(enabled?'ON':'OFF');b.classList.toggle('active',!!enabled);b.title=enabled?'關閉網頁後最多自動結算 8 小時':'開啟後，離線期間會由伺服器結算掛機獎勵';}
function setup(){const bar=document.querySelector('.mapbar');if(!bar||document.getElementById('offline-afk-btn'))return false;const online=document.getElementById('auto-attack-btn');if(online){online.textContent='掛機：ON';online.title='開啟網頁期間自動攻擊';}const b=document.createElement('button');b.id='offline-afk-btn';b.className='btn';b.type='button';b.textContent='離線掛機：OFF';b.onclick=()=>window.MMO149Realtime?.toggleOfflineAfk?.();bar.appendChild(b);const info=document.createElement('span');info.id='afk-info';info.textContent='離線掛機最多 8 小時';info.title='需先移動到有怪物的野外或地監；村莊安全區不產生離線收益。';bar.appendChild(info);inject();setStatus(window.MMO149Realtime?.isOfflineAfk?.());return true;}
function inject(){if(document.getElementById('afk-ui-style'))return;const s=document.createElement('style');s.id='afk-ui-style';s.textContent=`#offline-afk-btn.active{background:#7c3aed!important;border-color:#c4b5fd!important}#afk-info{font-size:11px;color:#cbd5e1;white-space:nowrap}@media(max-width:760px){#afk-info{width:100%;text-align:right}}`;document.head.appendChild(s);}
function boot(){if(!setup()){const t=setInterval(()=>{if(setup())clearInterval(t)},50)}}
window.MMO149AfkUI={setStatus};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
