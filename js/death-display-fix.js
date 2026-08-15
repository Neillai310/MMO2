// MMO2 1.49 single-source monster death presentation + combat rewards.
// Dead monster cards are hidden synchronously after ThinUI.renderWorld and a separate
// one-shot death sprite is shown. No timer mutates the normal monster sprite.
(function(){
'use strict';
const HOLD_MS=520;
const MOB_NAMES={orc:'妖魔',goblin:'哥布林',orc_archer:'妖魔弓箭手',gremlin:'格利芬',zombie:'殭屍',wolf:'狼',skeleton:'骷髏',fighter:'妖魔鬥士',stone_golem:'石頭高崙',spider:'蜘蛛',ghoul:'食屍鬼',sparto:'史巴托',lycan:'狼人',gaster:'卡司特',orc_mage:'妖魔法師',hobgoblin:'哈柏哥布林',bear:'熊',lizardman:'蜥蜴人',ant:'螞蟻',giant_ant:'巨大螞蟻',scorpion:'蠍子',evil_lizard:'邪惡蜥蜴',skel_archer:'骷髏弓箭手',skel_spear:'骷髏槍兵',skel_axe:'骷髏斧兵',ogre:'歐吉',cerberus:'地獄犬',elder:'長者',necromancer:'死靈法師',dk:'死亡騎士',black_knight:'黑騎士',b_knight:'黑騎士',kurt:'克特',dark_elf:'黑暗妖精',ogre_warrior:'歐吉戰士',arian:'亞力安',wyvern:'飛龍',blackelder:'黑長者',dragon:'巨龍',ant_queen:'巨大蟻后'};
const ITEM_NAMES={potion_red:'紅色藥水',potion_orange:'橙色藥水',potion_clear:'透明藥水',wpn_5:'箭',wpn_22:'銀箭',scroll_weapon:'對武器施法的卷軸',scroll_armor:'對盔甲施法的卷軸',item_dagger:'匕首',item_sword:'長劍',item_bow:'獵人之弓',item_staff:'魔杖',item_leather_armor:'皮甲',item_chain_mail:'鎖子甲',item_helmet:'頭盔',item_shield:'盾牌',skillbook_light:'魔法書(光箭)',skillbook_heal:'魔法書(初級治癒術)'};
const shownDeaths=new Set();
function enc(s){return encodeURI(s)}
function deathSrc(templateId){const folder=MOB_NAMES[templateId]||templateId;return enc(`assets/anim/${folder}/death_0.png`);}
function ensureLayer(){let world=document.querySelector('.world');if(!world)return null;let layer=document.getElementById('monster-death-layer');if(layer)return layer;layer=document.createElement('div');layer.id='monster-death-layer';world.appendChild(layer);return layer;}
function showDeathOnce(mob,index){if(!mob||shownDeaths.has(mob.uid))return;shownDeaths.add(mob.uid);const layer=ensureLayer();if(!layer)return;const ghost=document.createElement('div');ghost.className='monster-death-once';ghost.dataset.uid=mob.uid;ghost.dataset.slot=String(index);const image=document.createElement('img');image.src=deathSrc(mob.templateId);image.alt='';image.draggable=false;ghost.appendChild(image);layer.appendChild(ghost);setTimeout(()=>ghost.remove(),HOLD_MS);}
function prune(w){const current=new Set((w?.mobs||[]).map(m=>m.uid));for(const uid of [...shownDeaths])if(!current.has(uid))shownDeaths.delete(uid);}
function renderDeathState(w){const mobs=w?.mobs||[];const cards=document.querySelectorAll('#mob-list .mob-card');prune(w);cards.forEach((card,i)=>{const mob=mobs[i];if(!mob)return;if(mob.dead){card.style.setProperty('visibility','hidden','important');card.style.setProperty('pointer-events','none','important');showDeathOnce(mob,i);}else{card.style.removeProperty('visibility');card.style.removeProperty('pointer-events');}});}
function appendLine(box,text,cls){const d=document.createElement('div');d.textContent=text;if(cls)d.className=cls;box.appendChild(d);}
function aggregateDrops(rows){const totals=new Map();for(const row of rows||[]){if(!row||!row.id)continue;totals.set(row.id,(totals.get(row.id)||0)+Math.max(1,Number(row.cnt)||1));}return [...totals.entries()];}
function renderKillEvent(evt){const box=document.getElementById('combat-log');if(!box)return;const snap=window.MMO149Realtime?.snapshot?.();const mob=snap?.world?.mobs?.find(m=>m.uid===evt.target);appendLine(box,'擊倒 '+(MOB_NAMES[mob?.templateId]||'怪物'),'combat-kill');appendLine(box,'獲得 '+Number(evt.exp||0)+' EXP','combat-reward');appendLine(box,'獲得 '+Number(evt.gold||0)+' 金幣','combat-reward');for(const [id,cnt] of aggregateDrops(evt.drops)){const name=ITEM_NAMES[id]||id;appendLine(box,'獲得 '+name+(cnt>1?' ('+cnt+')':''),'combat-drop');}box.scrollTop=box.scrollHeight;}
function hook(){if(!window.ThinUI||window.ThinUI.__singleDeathRenderer)return false;const originalRenderWorld=window.ThinUI.renderWorld;const originalAppendEvent=window.ThinUI.appendEvent;window.ThinUI.renderWorld=function(w){const result=originalRenderWorld?originalRenderWorld(w):undefined;renderDeathState(w);return result;};window.ThinUI.appendEvent=function(evt){if(evt?.type==='attack'&&evt.kill){renderKillEvent(evt);return;}return originalAppendEvent?originalAppendEvent(evt):undefined;};window.ThinUI.__singleDeathRenderer=true;return true;}
function injectStyles(){if(document.getElementById('single-death-renderer-style'))return;const s=document.createElement('style');s.id='single-death-renderer-style';s.textContent=`
.world{position:relative}
#monster-death-layer{position:absolute;inset:0;pointer-events:none;z-index:6}
.monster-death-once{position:absolute;width:160px;height:160px;display:flex;align-items:center;justify-content:center}
.monster-death-once img{width:150px;height:150px;object-fit:contain;image-rendering:pixelated;filter:none}
.monster-death-once[data-slot="0"]{left:30%;top:48%}
.monster-death-once[data-slot="1"]{left:50%;top:48%;transform:translateX(-50%)}
.monster-death-once[data-slot="2"]{right:8%;top:48%}
.combat-kill{color:#fde68a;font-weight:700;margin-top:5px}
.combat-reward{color:#86efac}.combat-drop{color:#93c5fd}
@media(max-width:760px){.monster-death-once{width:120px;height:120px}.monster-death-once img{width:112px;height:112px}.monster-death-once[data-slot="0"]{left:8%;top:54%}.monster-death-once[data-slot="1"]{left:50%;top:54%}.monster-death-once[data-slot="2"]{right:4%;top:54%}}
`;document.head.appendChild(s);}
function boot(){injectStyles();if(!hook()){const retry=setInterval(()=>{if(hook())clearInterval(retry);},25);}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
