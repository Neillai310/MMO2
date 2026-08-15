// MMO2 1.49 battle presentation compatibility layer.
// Player attack animation follows the currently equipped weapon in self.equipment.wpn.
// Monsters live in three fixed absolute slots inside .world and never participate in document flow.
(function(){
'use strict';
const CLASS_FOLDER={royal:'王子',knight:'男騎士',mage:'男法師',elf:'男妖精'};
const frameCache=new Map();
const loadingFrames=new Map();
let attackTimer=null;
let attackToken=0;
function enc(s){return encodeURI(s)}
function pathClass(folder,prefix,i){return enc(`assets/classanim/${folder}/${prefix}_${i}.png`)}
function imageExists(src){return new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(true);im.onerror=()=>resolve(false);im.src=src;});}
function equippedWeapon(self){if(!self)return null;const uid=self.equipment?.wpn;if(!uid)return null;return (self.inventory||[]).find(item=>item?.uid===uid)||null;}
function weaponFamily(self){const item=equippedWeapon(self),id=String(item?.id||'').toLowerCase(),name=String(item?.name||'');if(id==='item_bow'||/(^|[_-])bow([_-]|$)|crossbow/.test(id)||/[弓弩]/.test(name))return 'bow';if(id==='item_staff'||/(staff|wand|rod)/.test(id)||/[杖]/.test(name))return 'staff';if(/(axe|blunt|club|mace|hammer|morning|flail)/.test(id)||/[斧錘槌棍棒]/.test(name))return 'blunt';if(id==='item_sword'||id==='item_dagger'||/(sword|dagger|blade|katana|saber)/.test(id)||/[劍刀匕]/.test(name))return 'sword';if(self?.cls==='elf')return 'bow';if(self?.cls==='mage')return 'staff';return 'sword';}
function prefixOrder(folder,family){const wanted={sword:'sword_attack',blunt:'blunt_attack',bow:'bow_attack',staff:'staff_attack'}[family]||'attack';const fallback=folder==='男妖精'?['bow_attack','sword_attack','attack']:folder==='男法師'?['staff_attack','magic_attack','attack']:['sword_attack','blunt_attack','attack'];return [wanted,...fallback].filter((v,i,a)=>a.indexOf(v)===i);}
async function loadFrames(folder,prefix){const key=folder+'|'+prefix;if(frameCache.has(key))return frameCache.get(key);if(loadingFrames.has(key))return loadingFrames.get(key);const p=(async()=>{const arr=[];for(let i=0;i<20;i++){const src=pathClass(folder,prefix,i);if(await imageExists(src))arr.push(src);else break;}frameCache.set(key,arr);loadingFrames.delete(key);return arr;})();loadingFrames.set(key,p);return p;}
async function framesFor(self){const folder=CLASS_FOLDER[self?.cls]||'男騎士',family=weaponFamily(self);for(const prefix of prefixOrder(folder,family)){const arr=await loadFrames(folder,prefix);if(arr.length)return {arr,family,prefix,folder};}return {arr:[],family,prefix:'',folder};}
function ensureWeaponImage(){const stage=document.getElementById('battle-player');if(!stage)return null;let img=document.getElementById('battle-player-weapon-img');if(!img){img=document.createElement('img');img.id='battle-player-weapon-img';img.alt='player';img.draggable=false;const original=document.getElementById('battle-player-img');if(original)stage.insertBefore(img,original.nextSibling);else stage.insertBefore(img,stage.firstChild);}return img;}
async function syncWeaponIdle(){if(attackTimer)return;const self=window.MMO149Realtime?.snapshot?.()?.self;if(!self)return;const img=ensureWeaponImage();if(!img)return;const info=await framesFor(self);if(!info.arr.length)return;img.src=info.arr[0];img.dataset.weaponFamily=info.family;img.dataset.weaponPrefix=info.prefix;}
async function animateEquippedWeaponAttack(){const self=window.MMO149Realtime?.snapshot?.()?.self;if(!self)return;const img=ensureWeaponImage();if(!img)return;const token=++attackToken,info=await framesFor(self);if(token!==attackToken||!info.arr.length)return;clearInterval(attackTimer);let frame=0;img.dataset.weaponFamily=info.family;img.dataset.weaponPrefix=info.prefix;attackTimer=setInterval(()=>{if(token!==attackToken){clearInterval(attackTimer);attackTimer=null;return;}img.src=info.arr[Math.min(frame,info.arr.length-1)];frame++;if(frame>=info.arr.length){clearInterval(attackTimer);attackTimer=null;img.src=info.arr[0];}},75);}
function hookUi(){if(!window.ThinUI||!window.MMO149Visuals)return false;window.MMO149Visuals.animatePlayerAttack=animateEquippedWeaponAttack;window.ThinUI.animatePlayerAttack=animateEquippedWeaponAttack;if(!window.ThinUI.__correctPlayerAttackHook){const old=window.ThinUI.attack;window.ThinUI.attack=function(uid){animateEquippedWeaponAttack();return old?old(uid):window.MMO149Realtime?.attack?.(uid);};window.ThinUI.__correctPlayerAttackHook=true;}return true;}
function injectStyles(){if(document.getElementById('battle-presentation-fix-style'))return;const s=document.createElement('style');s.id='battle-presentation-fix-style';s.textContent=`
.world{position:relative!important;overflow:hidden!important;min-height:430px!important;isolation:isolate}
.world>#map-name{position:relative!important;z-index:8!important;margin:0!important}
.world>#npc-layer{position:relative!important;z-index:8!important}
#mob-list{position:absolute!important;left:0!important;right:0!important;top:62px!important;bottom:0!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;display:block!important;overflow:hidden!important;z-index:4!important;pointer-events:none!important}
#mob-list .mob-card{position:absolute!important;top:15%!important;width:28%!important;height:46%!important;min-width:0!important;min-height:0!important;max-width:28%!important;max-height:46%!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:visible!important;pointer-events:auto!important;visibility:visible!important;opacity:1!important;transform:none!important}
#mob-list .mob-card:nth-child(1){left:6%!important}
#mob-list .mob-card:nth-child(2){left:36%!important}
#mob-list .mob-card:nth-child(3){left:66%!important}
#mob-list .mob-card strong,#mob-list .mob-card span,#mob-list .mob-card small,#mob-list .mob-card em,#mob-list .mob-card .mini-bar{display:none!important}
#mob-list .mob-card .mob-sprite{width:min(165px,92%)!important;height:min(165px,92%)!important;max-width:92%!important;max-height:92%!important;object-fit:contain!important;display:block!important;visibility:visible!important;opacity:1!important;filter:none;position:relative!important;z-index:2!important}
#mob-list .mob-card:not(.death-hidden){visibility:visible!important;opacity:1!important}
#mob-list .mob-card[data-anim="hurt"] .mob-sprite{filter:brightness(1.55)!important}
#mob-list .mob-card[data-anim="attack"] .mob-sprite{transform:translateX(-5px) scale(1.03)}
#mob-list .mob-card.dead,#mob-list .mob-card.death-static{opacity:1!important}
#mob-list .mob-card.death-static::before{display:none!important;content:none!important}
#battle-player{position:absolute!important;left:2%!important;bottom:-10px!important;width:34%!important;max-width:320px!important;height:62%!important;min-height:0!important;margin:0!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-end!important;z-index:5!important;pointer-events:none!important}
#battle-player-img{display:none!important}
#battle-player-weapon-img{width:min(300px,100%)!important;height:min(300px,100%)!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;image-rendering:pixelated;display:block!important;filter:drop-shadow(0 8px 8px #000)}
#battle-player-name{position:absolute!important;bottom:8px!important;z-index:2!important}
@media(max-width:1000px){.world{min-height:410px!important}#mob-list{top:58px!important}#mob-list .mob-card{top:12%!important;width:30%!important;max-width:30%!important;height:44%!important;max-height:44%!important}#mob-list .mob-card:nth-child(1){left:3%!important}#mob-list .mob-card:nth-child(2){left:35%!important}#mob-list .mob-card:nth-child(3){left:67%!important}#mob-list .mob-card .mob-sprite{width:min(148px,90%)!important;height:min(148px,90%)!important}#battle-player{width:36%!important;height:58%!important}}
@media(max-width:760px){.world{min-height:360px!important;padding:10px!important}#mob-list{top:52px!important}#mob-list .mob-card{top:10%!important;width:31%!important;max-width:31%!important;height:42%!important;max-height:42%!important}#mob-list .mob-card:nth-child(1){left:1.5%!important}#mob-list .mob-card:nth-child(2){left:34.5%!important}#mob-list .mob-card:nth-child(3){left:67.5%!important}#mob-list .mob-card .mob-sprite{width:min(118px,90%)!important;height:min(118px,90%)!important}#battle-player{left:1%!important;bottom:-4px!important;width:40%!important;height:54%!important}#battle-player-weapon-img{width:min(210px,100%)!important;height:min(210px,100%)!important}}
`;document.head.appendChild(s);}
function boot(){injectStyles();if(!hookUi()){const retry=setInterval(()=>{if(hookUi())clearInterval(retry);},50);}setInterval(syncWeaponIdle,140);syncWeaponIdle();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
