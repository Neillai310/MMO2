// MMO2 1.49 battle presentation compatibility layer.
// Player attack animation follows the currently equipped weapon in self.equipment.wpn.
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
function equippedWeapon(self){
  if(!self)return null;
  const uid=self.equipment?.wpn;
  if(!uid)return null;
  return (self.inventory||[]).find(item=>item?.uid===uid)||null;
}
function weaponFamily(self){
  const item=equippedWeapon(self);
  const id=String(item?.id||'').toLowerCase();
  const name=String(item?.name||'');
  if(id==='item_bow'||/(^|[_-])bow([_-]|$)|crossbow/.test(id)||/[弓弩]/.test(name))return 'bow';
  if(id==='item_staff'||/(staff|wand|rod)/.test(id)||/[杖]/.test(name))return 'staff';
  if(/(axe|blunt|club|mace|hammer|morning|flail)/.test(id)||/[斧錘槌棍棒]/.test(name))return 'blunt';
  if(id==='item_sword'||id==='item_dagger'||/(sword|dagger|blade|katana|saber)/.test(id)||/[劍刀匕]/.test(name))return 'sword';
  if(self?.cls==='elf')return 'bow';
  if(self?.cls==='mage')return 'staff';
  return 'sword';
}
function prefixOrder(folder,family){
  const wanted={sword:'sword_attack',blunt:'blunt_attack',bow:'bow_attack',staff:'staff_attack'}[family]||'attack';
  const fallback=folder==='男妖精'?['bow_attack','sword_attack','attack']:
    folder==='男法師'?['staff_attack','magic_attack','attack']:
    ['sword_attack','blunt_attack','attack'];
  return [wanted,...fallback].filter((v,i,a)=>a.indexOf(v)===i);
}
async function loadFrames(folder,prefix){
  const key=folder+'|'+prefix;
  if(frameCache.has(key))return frameCache.get(key);
  if(loadingFrames.has(key))return loadingFrames.get(key);
  const p=(async()=>{const arr=[];for(let i=0;i<20;i++){const src=pathClass(folder,prefix,i);if(await imageExists(src))arr.push(src);else break;}frameCache.set(key,arr);loadingFrames.delete(key);return arr;})();
  loadingFrames.set(key,p);
  return p;
}
async function framesFor(self){
  const folder=CLASS_FOLDER[self?.cls]||'男騎士';
  const family=weaponFamily(self);
  for(const prefix of prefixOrder(folder,family)){
    const arr=await loadFrames(folder,prefix);
    if(arr.length)return {arr,family,prefix,folder};
  }
  return {arr:[],family,prefix:'',folder};
}
function ensureWeaponImage(){
  const stage=document.getElementById('battle-player');
  if(!stage)return null;
  let img=document.getElementById('battle-player-weapon-img');
  if(!img){
    img=document.createElement('img');
    img.id='battle-player-weapon-img';
    img.alt='player';
    img.draggable=false;
    const original=document.getElementById('battle-player-img');
    if(original)stage.insertBefore(img,original.nextSibling);else stage.insertBefore(img,stage.firstChild);
  }
  return img;
}
async function syncWeaponIdle(){
  if(attackTimer)return;
  const self=window.MMO149Realtime?.snapshot?.()?.self;
  if(!self)return;
  const img=ensureWeaponImage();
  if(!img)return;
  const info=await framesFor(self);
  if(!info.arr.length)return;
  img.src=info.arr[0];
  img.dataset.weaponFamily=info.family;
  img.dataset.weaponPrefix=info.prefix;
}
async function animateEquippedWeaponAttack(){
  const self=window.MMO149Realtime?.snapshot?.()?.self;
  if(!self)return;
  const img=ensureWeaponImage();
  if(!img)return;
  const token=++attackToken;
  const info=await framesFor(self);
  if(token!==attackToken||!info.arr.length)return;
  clearInterval(attackTimer);
  let frame=0;
  img.dataset.weaponFamily=info.family;
  img.dataset.weaponPrefix=info.prefix;
  attackTimer=setInterval(()=>{
    if(token!==attackToken){clearInterval(attackTimer);attackTimer=null;return;}
    img.src=info.arr[Math.min(frame,info.arr.length-1)];
    frame++;
    if(frame>=info.arr.length){
      clearInterval(attackTimer);
      attackTimer=null;
      img.src=info.arr[0];
    }
  },75);
}
function hookUi(){
  if(!window.ThinUI||!window.MMO149Visuals)return false;
  window.MMO149Visuals.animatePlayerAttack=animateEquippedWeaponAttack;
  window.ThinUI.animatePlayerAttack=animateEquippedWeaponAttack;
  if(!window.ThinUI.__correctPlayerAttackHook){
    const old=window.ThinUI.attack;
    window.ThinUI.attack=function(uid){
      animateEquippedWeaponAttack();
      return old?old(uid):window.MMO149Realtime?.attack?.(uid);
    };
    window.ThinUI.__correctPlayerAttackHook=true;
  }
  return true;
}
function injectStyles(){
  if(document.getElementById('battle-presentation-fix-style'))return;
  const s=document.createElement('style');
  s.id='battle-presentation-fix-style';
  s.textContent=`
#mob-list{position:relative!important;top:-34px!important}
#mob-list .mob-card{min-height:170px!important;height:170px!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:visible!important}
#mob-list .mob-card strong,#mob-list .mob-card span,#mob-list .mob-card small,#mob-list .mob-card em,#mob-list .mob-card .mini-bar{display:none!important}
#mob-list .mob-card .mob-sprite{width:160px!important;height:160px!important;object-fit:contain!important;display:block!important;opacity:1!important;filter:none}
#mob-list .mob-card[data-anim="hurt"] .mob-sprite{filter:brightness(1.55)!important}
#mob-list .mob-card[data-anim="attack"] .mob-sprite{transform:translateX(-7px) scale(1.05)}
#mob-list .mob-card.dead,#mob-list .mob-card.death-static{opacity:1!important}
#mob-list .mob-card.death-static::before{display:none!important;content:none!important}
#battle-player{left:4px!important;bottom:-22px!important;width:350px!important;min-height:310px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-end!important;position:relative!important;z-index:5!important}
#battle-player-img{display:none!important}
#battle-player-weapon-img{width:310px!important;height:310px!important;object-fit:contain!important;image-rendering:pixelated;display:block!important;filter:drop-shadow(0 8px 8px #000)}
#battle-player-name{position:relative;z-index:2;margin-top:-30px}
@media(max-width:760px){#mob-list{top:-18px!important}#battle-player{position:relative!important;left:auto!important;bottom:-12px!important;width:100%!important;min-height:255px!important;margin:0 auto 6px!important}#battle-player-weapon-img{width:250px!important;height:250px!important}}
`;
  document.head.appendChild(s);
}
function boot(){
  injectStyles();
  if(!hookUi()){
    const retry=setInterval(()=>{if(hookUi())clearInterval(retry);},50);
  }
  setInterval(syncWeaponIdle,140);
  syncWeaponIdle();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
