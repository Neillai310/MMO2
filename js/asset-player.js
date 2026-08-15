// MMO2 1.49 visual asset player. Presentation only; no game authority.
(function(){
'use strict';
const NPCS={
 town_talking:[['100','雜貨商人'],['118','倉庫管理員']],
 town_silver_knight:[['100','武器商人'],['118','倉庫管理員']],
 town_elf:[['100','妖精商人'],['118','倉庫管理員']],
 town_gludio:[['100','雜貨商人'],['118','倉庫管理員']],
 town_gludin:[['100','武器商人'],['118','倉庫管理員']]
};
const MOB_NAMES={orc:'妖魔',goblin:'哥布林',orc_archer:'妖魔弓箭手',gremlin:'格利芬',zombie:'殭屍',wolf:'狼',skeleton:'骷髏',fighter:'妖魔鬥士',stone_golem:'石頭高崙',spider:'蜘蛛',ghoul:'食屍鬼',sparto:'史巴托',lycan:'狼人',gaster:'卡司特',orc_mage:'妖魔法師',hobgoblin:'哈柏哥布林',bear:'熊',lizardman:'蜥蜴人',ant:'螞蟻',giant_ant:'巨大螞蟻',scorpion:'蠍子',evil_lizard:'邪惡蜥蜴',skel_archer:'骷髏弓箭手',skel_spear:'骷髏槍兵',skel_axe:'骷髏斧兵',ogre:'歐吉',cerberus:'地獄犬',elder:'長者',necromancer:'死靈法師',dk:'死亡騎士',black_knight:'黑騎士',b_knight:'黑騎士',kurt:'克特',dark_elf:'黑暗妖精',ogre_warrior:'歐吉戰士',arian:'亞力安',wyvern:'飛龍',blackelder:'黑長者',dragon:'巨龍',ant_queen:'巨大蟻后'};
const npcFrames=new Map(),mobFrames=new Map(),loadingMob=new Set();
let tick=0,lastNpcMap='';
function pathNpc(id,i){return encodeURI(`assets/npc/${id}/idle_${i}.png`)}
function pathMob(folder,i){return encodeURI(`assets/anim/${folder}/attack_${i}.png`)}
async function getNpcFrames(id){if(npcFrames.has(id))return npcFrames.get(id);let count=1;try{let r=await fetch(`assets/npc/${encodeURIComponent(id)}/meta.json`,{cache:'force-cache'});if(r.ok){let j=await r.json();count=Math.max(1,Number(j?.files?.idle?.frames)||1)}}catch(_){}npcFrames.set(id,count);return count;}
function imageExists(src){return new Promise(resolve=>{let im=new Image();im.onload=()=>resolve(true);im.onerror=()=>resolve(false);im.src=src;});}
async function discoverMob(folder){if(mobFrames.has(folder)||loadingMob.has(folder))return;loadingMob.add(folder);let frames=[];for(let i=0;i<24;i++){let src=pathMob(folder,i);if(await imageExists(src))frames.push(src);else break;}if(!frames.length){let fallback=pathMob(folder,0);frames=[fallback];}mobFrames.set(folder,frames);loadingMob.delete(folder);}
async function renderNpcCards(map){let box=document.getElementById('npc-layer');if(!box)return;let rows=NPCS[map]||[];if(!rows.length){box.innerHTML='';lastNpcMap=map;return;}if(lastNpcMap!==map||box.children.length!==rows.length){box.innerHTML=rows.map(n=>`<div class="npc-card" data-npc-id="${n[0]}"><img class="npc-sprite" src="${pathNpc(n[0],0)}" alt="${n[1]}"><b>${n[1]}</b></div>`).join('');lastNpcMap=map;}for(let card of box.querySelectorAll('[data-npc-id]')){let id=card.dataset.npcId,count=await getNpcFrames(id),img=card.querySelector('.npc-sprite');if(img)img.src=pathNpc(id,tick%count);}}
function animateMobs(){let snap=window.MMO149Realtime?.snapshot?.(),mobs=snap?.world?.mobs||[],imgs=document.querySelectorAll('#mob-list .mob-sprite');imgs.forEach((img,i)=>{let mob=mobs[i];if(!mob)return;let folder=MOB_NAMES[mob.templateId]||mob.templateId;discoverMob(folder);let frames=mobFrames.get(folder);if(frames&&frames.length){img.onerror=()=>{img.onerror=null;img.src=frames[0]};img.src=frames[tick%frames.length];}});}
function animatePlayer(){let p=document.getElementById('char-portrait');if(!p)return;p.classList.remove('player-attack');void p.offsetWidth;p.classList.add('player-attack');}
function loop(){tick++;let snap=window.MMO149Realtime?.snapshot?.(),map=snap?.world?.map||lastNpcMap;if(map)renderNpcCards(map);animateMobs();}
window.MMO149Visuals={animatePlayerAttack:animatePlayer};
function patchThinUI(){if(!window.ThinUI)return false;window.ThinUI.animatePlayerAttack=animatePlayer;return true;}
function boot(){if(!patchThinUI()){let p=setInterval(()=>{if(patchThinUI())clearInterval(p)},50);}setInterval(loop,180);loop();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
