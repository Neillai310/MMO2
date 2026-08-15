// MMO2 1.49 battle presentation corrections. Visual-only; server remains authoritative.
(function(){
'use strict';
const CLASS_FOLDER={royal:'王子',knight:'男騎士',mage:'男法師',elf:'男妖精'};
const MOB_NAMES={orc:'妖魔',goblin:'哥布林',orc_archer:'妖魔弓箭手',gremlin:'格利芬',zombie:'殭屍',wolf:'狼',skeleton:'骷髏',fighter:'妖魔鬥士',stone_golem:'石頭高崙',spider:'蜘蛛',ghoul:'食屍鬼',sparto:'史巴托',lycan:'狼人',gaster:'卡司特',orc_mage:'妖魔法師',hobgoblin:'哈柏哥布林',bear:'熊',lizardman:'蜥蜴人',ant:'螞蟻',giant_ant:'巨大螞蟻',scorpion:'蠍子',evil_lizard:'邪惡蜥蜴',skel_archer:'骷髏弓箭手',skel_spear:'骷髏槍兵',skel_axe:'骷髏斧兵',ogre:'歐吉',cerberus:'地獄犬',elder:'長者',necromancer:'死靈法師',dk:'死亡騎士',black_knight:'黑騎士',b_knight:'黑騎士',kurt:'克特',dark_elf:'黑暗妖精',ogre_warrior:'歐吉戰士',arian:'亞力安',wyvern:'飛龍',blackelder:'黑長者',dragon:'巨龍',ant_queen:'巨大蟻后'};
const frameCache=new Map();
const loading=new Map();
let attacking=false,attackTimer=null,currentKey='';
function enc(v){return encodeURI(v)}
function exists(src){return new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(true);i.onerror=()=>resolve(false);i.src=src;});}
function snapshot(){return window.MMO149Realtime?.snapshot?.()||null;}
function weaponId(self){const uid=self?.equipment?.wpn;if(!uid)return null;return (self.inventory||[]).find(i=>i.uid===uid)?.id||null;}
function profile(self){const id=weaponId(self);
 if(id==='item_bow')return{key:'bow',prefixes:['bow_attack','attack']};
 if(id==='item_staff')return{key:'staff',prefixes:['staff_attack','magic_attack','attack']};
 if(id==='item_dagger')return{key:'dagger',prefixes:['attack']};
 if(id==='item_sword')return{key:'sword',prefixes:['attack']};
 if(self?.cls==='elf')return{key:'bow',prefixes:['bow_attack','attack']};
 if(self?.cls==='mage')return{key:'staff',prefixes:['staff_attack','magic_attack','attack']};
 // 原版王族／騎士在無法辨識武器時，預設使用基礎劍系 attack 動畫。
 return{key:'sword',prefixes:['attack']};
}
async function loadFrames(folder,p){const key=folder+'|'+p.key;if(frameCache.has(key))return frameCache.get(key);if(loading.has(key))return loading.get(key);const task=(async()=>{for(const prefix of p.prefixes){const arr=[];for(let n=0;n<24;n++){const src=enc(`assets/classanim/${folder}/${prefix}_${n}.png`);if(await exists(src))arr.push(src);else break;}if(arr.length){frameCache.set(key,arr);loading.delete(key);return arr;}}frameCache.set(key,[]);loading.delete(key);return[];})();loading.set(key,task);return task;}
function ensurePlayer(){let stage=document.getElementById('battle-player');if(!stage)return null;let old=document.getElementById('battle-player-img');if(old)old.classList.add('legacy-battle-player-img');let img=document.getElementById('battle-player-correct');if(!img){img=document.createElement('img');img.id='battle-player-correct';img.alt='player';img.draggable=false;stage.insertBefore(img,stage.firstChild);}return img;}
async function refreshPlayer(){const self=snapshot()?.self,img=ensurePlayer();if(!self||!img||attacking)return;const folder=CLASS_FOLDER[self.cls]||'男騎士',p=profile(self),key=folder+'|'+p.key,frames=await loadFrames(folder,p);currentKey=key;if(frames.length&&currentKey===key&&!attacking)img.src=frames[0];}
async function animatePlayerAttack(){const self=snapshot()?.self,img=ensurePlayer();if(!self||!img)return;const folder=CLASS_FOLDER[self.cls]||'男騎士',p=profile(self),key=folder+'|'+p.key,frames=await loadFrames(folder,p);if(!frames.length)return;currentKey=key;clearInterval(attackTimer);attacking=true;let n=0;img.src=frames[0];attackTimer=setInterval(()=>{if(currentKey!==key){clearInterval(attackTimer);attacking=false;return;}n++;if(n>=frames.length){clearInterval(attackTimer);attackTimer=null;attacking=false;img.src=frames[0];return;}img.src=frames[n];},75);}
function fixMonsters(){const snap=snapshot(),mobs=snap?.world?.mobs||[],cards=document.querySelectorAll('#mob-list .mob-card');cards.forEach((card,i)=>{const mob=mobs[i],img=card.querySelector('.mob-sprite');if(!mob||!img)return;card.classList.add('sprite-only');if(mob.dead){const folder=MOB_NAMES[mob.templateId]||mob.templateId;const death0=enc(`assets/anim/${folder}/death_0.png`);card.classList.add('death-fixed');card.classList.remove('death-static');card.dataset.anim='death';img.style.setProperty('display','block','important');img.style.setProperty('opacity','1','important');if(img.dataset.fixedDeath!==death0){img.dataset.fixedDeath=death0;img.src=death0;}}else{card.classList.remove('death-fixed');delete img.dataset.fixedDeath;img.style.removeProperty('display');img.style.removeProperty('opacity');}});}
function hookUi(){if(!window.ThinUI)return false;window.ThinUI.animatePlayerAttack=animatePlayerAttack;if(!window.ThinUI.__correctPlayerAttackHook){const old=window.ThinUI.attack;window.ThinUI.attack=function(uid){animatePlayerAttack();return old?old(uid):window.MMO149Realtime?.attack?.(uid);};window.ThinUI.__correctPlayerAttackHook=true;}return true;}
function injectStyles(){if(document.getElementById('battle-presentation-fix-style'))return;const s=document.createElement('style');s.id='battle-presentation-fix-style';s.textContent=`
#mob-list .mob-card{min-height:160px!important;height:160px!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:visible!important}
#mob-list .mob-card strong,#mob-list .mob-card span,#mob-list .mob-card small,#mob-list .mob-card em,#mob-list .mob-card .mini-bar{display:none!important}
#mob-list .mob-card .mob-sprite{width:150px!important;height:150px!important;object-fit:contain!important;display:block!important;opacity:1!important;filter:none}
#mob-list .mob-card[data-anim="hurt"] .mob-sprite{filter:brightness(1.55)!important}
#mob-list .mob-card[data-anim="attack"] .mob-sprite{transform:translateX(-7px) scale(1.05)}
#mob-list .mob-card.dead,#mob-list .mob-card.death-fixed{opacity:1!important}
#mob-list .mob-card.death-static::before{display:none!important;content:none!important}
#battle-player{left:4px!important;bottom:10px!important;width:290px!important;min-height:255px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-end!important}
#battle-player .legacy-battle-player-img{display:none!important}
#battle-player-correct{width:240px!important;height:240px!important;object-fit:contain!important;image-rendering:pixelated;display:block!important;filter:drop-shadow(0 8px 8px #000)}
#battle-player-name{position:relative;z-index:2;margin-top:-22px}
@media(max-width:760px){#battle-player{position:relative!important;left:auto!important;bottom:auto!important;width:100%!important;min-height:205px!important;margin:0 auto 6px!important}#battle-player-correct{width:195px!important;height:195px!important}}
`;document.head.appendChild(s);}
function observeMobs(){const box=document.getElementById('mob-list');if(!box)return false;if(box.__battleFixObserved)return true;box.__battleFixObserved=true;new MutationObserver(()=>fixMonsters()).observe(box,{childList:true,subtree:true});return true;}
function boot(){injectStyles();hookUi();observeMobs();fixMonsters();refreshPlayer();setInterval(()=>{hookUi();observeMobs();fixMonsters();refreshPlayer();},120);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
