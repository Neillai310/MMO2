// MMO2 1.49 presentation effects: village NPCs, attack animation and auto battle.
// This file is visual/input only. Server remains authoritative for combat and rewards.
(function(){
'use strict';
const VILLAGE_NPCS={
  town_talking:[['100','雜貨商人'],['118','倉庫管理員'],['1148','傳送師']],
  town_silver_knight:[['1208','武器商人'],['1222','倉庫管理員'],['1254','治療師']],
  town_elf:[['1256','妖精商人'],['1276','倉庫管理員'],['1278','長老']],
  town_gludio:[['1296','雜貨商人'],['1305','倉庫管理員'],['1307','傳送師']],
  town_gludin:[['1312','武器商人'],['100','倉庫管理員'],['118','旅店主人']]
};
let npcFrame=0,autoTimer=null,lastWorld=null,lastSelf=null;
function $(id){return document.getElementById(id);}
function enc(s){return encodeURI(s)}
function ensureNpcLayer(){let world=document.querySelector('.world');if(!world)return null;let layer=$('npc-layer');if(!layer){layer=document.createElement('div');layer.id='npc-layer';layer.className='npc-layer';let mobs=$('mob-list');world.insertBefore(layer,mobs||null);}return layer;}
function renderNpcs(map){let layer=ensureNpcLayer();if(!layer)return;let rows=VILLAGE_NPCS[map]||[];layer.innerHTML=rows.map((n,i)=>`<div class="npc-card" data-npc="${n[0]}"><img src="${enc(`assets/npc/${n[0]}/idle_${(npcFrame+i)%6}.png`)}" onerror="this.src='${enc(`assets/npc/${n[0]}/idle_0.png`)}'"><b>${n[1]}</b><small>NPC</small></div>`).join('');layer.style.display=rows.length?'grid':'none';}
function tickNpc(){npcFrame=(npcFrame+1)%6;if(lastWorld)renderNpcs(lastWorld.map);}
function mobNameFromCard(uid){return document.querySelector(`.mob-card[onclick*="${CSS.escape(uid)}"] img`)}
function animateMobAttack(uid,template){let img=mobNameFromCard(uid);if(!img)return;let f=0;clearInterval(img._atkTimer);img._atkTimer=setInterval(()=>{img.src=enc(`assets/anim/${template}/attack_${f}.png`);f++;if(f>4){clearInterval(img._atkTimer);img.src=enc(`assets/anim/${template}/attack_0.png`);}},70);}
function animatePlayerAttack(){let p=$('char-portrait');if(!p)return;p.classList.remove('player-attack');void p.offsetWidth;p.classList.add('player-attack');setTimeout(()=>p.classList.remove('player-attack'),360);}
function flashTarget(uid){let card=document.querySelector(`.mob-card[onclick*="${CSS.escape(uid)}"]`);if(!card)return;card.classList.remove('hit-flash');void card.offsetWidth;card.classList.add('hit-flash');setTimeout(()=>card.classList.remove('hit-flash'),240);}
function handleEvent(evt){if(!evt)return;if(evt.type==='attack'){if(evt.attacker===window.MMO149Realtime?.clientId?.()||!evt.attacker)animatePlayerAttack();let mob=(lastWorld?.mobs||[]).find(m=>m.uid===evt.target);if(mob){animateMobAttack(evt.target,mob.templateId);flashTarget(evt.target);}}if(evt.type==='tick'){// server monster retaliation snapshot: make alive mobs visibly attack
  (lastWorld?.mobs||[]).filter(m=>!m.dead).slice(0,2).forEach((m,i)=>setTimeout(()=>animateMobAttack(m.uid,m.templateId),i*120));
}}
function autoBattleTick(){let rt=window.MMO149Realtime;if(!rt?.isAuthoritative?.())return;let snap=rt.snapshot?.();if(!snap?.self||snap.self.hp<=0)return;let target=(snap.world?.mobs||[]).find(m=>!m.dead&&m.hp>0);if(!target)return;animatePlayerAttack();rt.attack(target.uid);}
function startAuto(){if(autoTimer)return;autoTimer=setInterval(autoBattleTick,800);let b=$('auto-state');if(b)b.textContent='自動攻擊：ON';}
function stopAuto(){clearInterval(autoTimer);autoTimer=null;let b=$('auto-state');if(b)b.textContent='自動攻擊：OFF';}
function toggleAuto(){autoTimer?stopAuto():startAuto();}
function injectControl(){let bar=document.querySelector('.mapbar');if(!bar||$('auto-state'))return;let b=document.createElement('button');b.id='auto-state';b.className='btn auto-on';b.textContent='自動攻擊：ON';b.onclick=toggleAuto;bar.appendChild(b);startAuto();}
function patchUI(){if(!window.ThinUI||window.ThinUI.__effectsPatched)return false;let oldWorld=window.ThinUI.renderWorld,oldEvent=window.ThinUI.appendEvent,oldChar=window.ThinUI.renderCharacter;
 window.ThinUI.renderWorld=function(w){lastWorld=w;oldWorld.call(this,w);renderNpcs(w?.map);};
 window.ThinUI.renderCharacter=function(c){lastSelf=c;oldChar.call(this,c);};
 window.ThinUI.appendEvent=function(evt){oldEvent.call(this,evt);handleEvent(evt);};
 window.ThinUI.__effectsPatched=true;injectControl();return true;}
function styles(){let s=document.createElement('style');s.textContent=`
.npc-layer{grid-template-columns:repeat(3,minmax(90px,130px));gap:12px;justify-content:center;margin:12px auto 18px}.npc-card{background:#07111dcc;border:1px solid #b58a42;border-radius:8px;padding:8px;text-align:center;box-shadow:0 5px 14px #0008}.npc-card img{width:72px;height:72px;object-fit:contain;display:block;margin:auto;image-rendering:pixelated}.npc-card b{display:block;color:#fde68a;font-size:13px}.npc-card small{color:#94a3b8}.player-attack{animation:playerLunge .36s ease}.hit-flash{animation:hitFlash .24s ease}.auto-on{border-color:#16a34a!important}@keyframes playerLunge{0%{transform:translateX(0) scale(1)}45%{transform:translateX(24px) scale(1.08)}100%{transform:translateX(0) scale(1)}}@keyframes hitFlash{0%,100%{filter:none}50%{filter:brightness(2) sepia(1)}}`;
 document.head.appendChild(s);}
function boot(){styles();if(!patchUI()){let t=setInterval(()=>{if(patchUI())clearInterval(t)},50);}setInterval(tickNpc,180);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();