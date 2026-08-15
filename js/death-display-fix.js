// MMO2 1.49 dead monster presentation: show one death frame briefly, then hide until respawn.
(function(){
'use strict';
const MOB_NAMES={orc:'妖魔',goblin:'哥布林',orc_archer:'妖魔弓箭手',gremlin:'格利芬',zombie:'殭屍',wolf:'狼',skeleton:'骷髏',fighter:'妖魔鬥士',stone_golem:'石頭高崙',spider:'蜘蛛',ghoul:'食屍鬼',sparto:'史巴托',lycan:'狼人',gaster:'卡司特',orc_mage:'妖魔法師',hobgoblin:'哈柏哥布林',bear:'熊',lizardman:'蜥蜴人',ant:'螞蟻',giant_ant:'巨大螞蟻',scorpion:'蠍子',evil_lizard:'邪惡蜥蜴',skel_archer:'骷髏弓箭手',skel_spear:'骷髏槍兵',skel_axe:'骷髏斧兵',ogre:'歐吉',cerberus:'地獄犬',elder:'長者',necromancer:'死靈法師',dk:'死亡騎士',black_knight:'黑騎士',b_knight:'黑騎士',kurt:'克特',dark_elf:'黑暗妖精',ogre_warrior:'歐吉戰士',arian:'亞力安',wyvern:'飛龍',blackelder:'黑長者',dragon:'巨龍',ant_queen:'巨大蟻后'};
const deadSince=new Map();
const HOLD_MS=450;
function enc(s){return encodeURI(s)}
function deathFrame(templateId){const folder=MOB_NAMES[templateId]||templateId;return enc(`assets/anim/${folder}/death_0.png`);}
function apply(w){const mobs=w?.mobs||[];const cards=document.querySelectorAll('#mob-list .mob-card');const now=Date.now();cards.forEach((card,i)=>{const mob=mobs[i];if(!mob)return;const img=card.querySelector('.mob-sprite');if(!img)return;if(mob.dead){if(!deadSince.has(mob.uid))deadSince.set(mob.uid,now);const started=deadSince.get(mob.uid);card.dataset.deathOnce='1';card.dataset.anim='death';card.classList.remove('death-static');card.style.opacity='1';img.style.setProperty('display','block','important');img.style.setProperty('opacity','1','important');img.src=deathFrame(mob.templateId);if(now-started>=HOLD_MS){card.style.setProperty('visibility','hidden','important');card.style.setProperty('pointer-events','none','important');}else{card.style.setProperty('visibility','visible','important');card.style.setProperty('pointer-events','none','important');}}else{deadSince.delete(mob.uid);delete card.dataset.deathOnce;card.style.removeProperty('visibility');card.style.removeProperty('pointer-events');card.style.opacity='1';}});
}
function prune(w){const alive=new Set((w?.mobs||[]).map(m=>m.uid));for(const uid of deadSince.keys())if(!alive.has(uid))deadSince.delete(uid);}
function hook(){if(!window.ThinUI||window.ThinUI.__deathOnceHook)return false;const old=window.ThinUI.renderWorld;window.ThinUI.renderWorld=function(w){const r=old?old(w):undefined;prune(w);apply(w);return r;};window.ThinUI.__deathOnceHook=true;return true;}
function tick(){hook();const snap=window.MMO149Realtime?.snapshot?.();if(snap?.world)apply(snap.world);}
function boot(){if(!hook()){const t=setInterval(()=>{if(hook())clearInterval(t)},25);}setInterval(tick,80);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
