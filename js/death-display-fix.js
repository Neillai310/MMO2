// MMO2 1.49 anchored two-stage monster death presentation + combat rewards.
// Death animation stays inside the original mob card so monsters never jump to guessed absolute positions.
(function(){
'use strict';
const FALL_MS=420;
const HALF_HOLD_MS=620;
const FINISH_MS=460;
const FRAME_TICK_MS=70;
const MOB_NAMES={orc:'妖魔',goblin:'哥布林',orc_archer:'妖魔弓箭手',gremlin:'格利芬',zombie:'殭屍',wolf:'狼',skeleton:'骷髏',fighter:'妖魔鬥士',stone_golem:'石頭高崙',spider:'蜘蛛',ghoul:'食屍鬼',sparto:'史巴托',lycan:'狼人',gaster:'卡司特',orc_mage:'妖魔法師',hobgoblin:'哈柏哥布林',bear:'熊',lizardman:'蜥蜴人',ant:'螞蟻',giant_ant:'巨大螞蟻',scorpion:'蠍子',evil_lizard:'邪惡蜥蜴',skel_archer:'骷髏弓箭手',skel_spear:'骷髏槍兵',skel_axe:'骷髏斧兵',ogre:'歐吉',cerberus:'地獄犬',elder:'長者',necromancer:'死靈法師',dk:'死亡騎士',black_knight:'黑騎士',b_knight:'黑騎士',kurt:'克特',dark_elf:'黑暗妖精',ogre_warrior:'歐吉戰士',arian:'亞力安',wyvern:'飛龍',blackelder:'黑長者',dragon:'巨龍',ant_queen:'巨大蟻后'};
const ITEM_NAMES={potion_red:'紅色藥水',potion_orange:'橙色藥水',potion_clear:'透明藥水',wpn_5:'箭',wpn_22:'銀箭',scroll_weapon:'對武器施法的卷軸',scroll_armor:'對盔甲施法的卷軸',item_dagger:'匕首',item_sword:'長劍',item_bow:'獵人之弓',item_staff:'魔杖',item_leather_armor:'皮甲',item_chain_mail:'鎖子甲',item_helmet:'頭盔',item_shield:'盾牌',skillbook_light:'魔法書(光箭)',skillbook_heal:'魔法書(初級治癒術)'};
const deathStates=new Map();
const deathFrames=new Map();
const loadingFrames=new Set();
function enc(s){return encodeURI(s)}
function folderFor(templateId){return MOB_NAMES[templateId]||templateId;}
function deathSrc(folder,i){return enc(`assets/anim/${folder}/death_${i}.png`);}
function imageExists(src){return new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(true);im.onerror=()=>resolve(false);im.src=src;});}
async function discoverDeathFrames(folder){
  if(deathFrames.has(folder)||loadingFrames.has(folder))return;
  loadingFrames.add(folder);
  const arr=[];
  for(let i=0;i<32;i++){
    const src=deathSrc(folder,i);
    if(await imageExists(src))arr.push(src);else break;
  }
  if(!arr.length)arr.push(deathSrc(folder,0));
  deathFrames.set(folder,arr);
  loadingFrames.delete(folder);
}
function getFrames(folder){discoverDeathFrames(folder);return deathFrames.get(folder)||[deathSrc(folder,0)];}
function stateFor(mob){
  let s=deathStates.get(mob.uid);
  if(!s){s={started:Date.now(),folder:folderFor(mob.templateId)};deathStates.set(mob.uid,s);}
  return s;
}
function prune(w){
  const current=new Set((w?.mobs||[]).map(m=>m.uid));
  for(const uid of [...deathStates.keys()])if(!current.has(uid))deathStates.delete(uid);
}
function frameFor(state,frames,now){
  const count=Math.max(1,frames.length);
  const last=count-1;
  const mid=Math.max(0,Math.min(last,Math.floor(last*0.55)));
  const elapsed=Math.max(0,now-state.started);
  if(elapsed<FALL_MS){
    const p=elapsed/FALL_MS;
    return Math.min(mid,Math.floor(p*(mid+1)));
  }
  if(elapsed<FALL_MS+HALF_HOLD_MS)return mid;
  if(elapsed<FALL_MS+HALF_HOLD_MS+FINISH_MS){
    const p=(elapsed-FALL_MS-HALF_HOLD_MS)/FINISH_MS;
    return Math.min(last,mid+Math.floor(p*Math.max(1,last-mid+1)));
  }
  return last;
}
function phaseFor(state,now){
  const elapsed=Math.max(0,now-state.started);
  if(elapsed<FALL_MS)return 'falling';
  if(elapsed<FALL_MS+HALF_HOLD_MS)return 'half-dead';
  if(elapsed<FALL_MS+HALF_HOLD_MS+FINISH_MS)return 'finishing';
  return 'dead-ground';
}
function renderDeathState(w){
  const mobs=w?.mobs||[];
  const cards=document.querySelectorAll('#mob-list .mob-card');
  prune(w);
  cards.forEach((card,i)=>{
    const mob=mobs[i],img=card.querySelector('.mob-sprite');
    if(!mob||!img)return;
    if(!mob.dead){
      deathStates.delete(mob.uid);
      card.classList.remove('death-sequence','death-half','death-ground');
      delete card.dataset.deathPhase;
      img.style.removeProperty('transform');
      img.style.removeProperty('opacity');
      return;
    }
    const state=stateFor(mob);
    const frames=getFrames(state.folder);
    const now=Date.now();
    const index=frameFor(state,frames,now);
    const phase=phaseFor(state,now);
    const finalFrame=frames[frames.length-1];
    // asset-player.js checks this marker before forcing its own final death frame.
    // Keep it set to the final frame while we control src through the two-stage sequence.
    img.dataset.deathLocked=finalFrame;
    img.src=frames[index]||finalFrame;
    card.disabled=true;
    card.style.removeProperty('visibility');
    card.style.setProperty('pointer-events','none','important');
    card.classList.add('death-sequence');
    card.classList.toggle('death-half',phase==='half-dead');
    card.classList.toggle('death-ground',phase==='dead-ground');
    card.dataset.deathPhase=phase;
  });
}
function renderLoop(){
  const snap=window.MMO149Realtime?.snapshot?.();
  if(snap?.world)renderDeathState(snap.world);
}
function appendLine(box,text,cls){const d=document.createElement('div');d.textContent=text;if(cls)d.className=cls;box.appendChild(d);}
function aggregateDrops(rows){const totals=new Map();for(const row of rows||[]){if(!row||!row.id)continue;totals.set(row.id,(totals.get(row.id)||0)+Math.max(1,Number(row.cnt)||1));}return [...totals.entries()];}
function renderKillEvent(evt){const box=document.getElementById('combat-log');if(!box)return;const snap=window.MMO149Realtime?.snapshot?.();const mob=snap?.world?.mobs?.find(m=>m.uid===evt.target);appendLine(box,'擊倒 '+(MOB_NAMES[mob?.templateId]||'怪物'),'combat-kill');appendLine(box,'獲得 '+Number(evt.exp||0)+' EXP','combat-reward');appendLine(box,'獲得 '+Number(evt.gold||0)+' 金幣','combat-reward');for(const [id,cnt] of aggregateDrops(evt.drops)){const name=ITEM_NAMES[id]||id;appendLine(box,'獲得 '+name+(cnt>1?' ('+cnt+')':''),'combat-drop');}box.scrollTop=box.scrollHeight;}
function hook(){
  if(!window.ThinUI||window.ThinUI.__anchoredDeathRenderer)return false;
  const originalRenderWorld=window.ThinUI.renderWorld;
  const originalAppendEvent=window.ThinUI.appendEvent;
  window.ThinUI.renderWorld=function(w){const result=originalRenderWorld?originalRenderWorld(w):undefined;renderDeathState(w);return result;};
  window.ThinUI.appendEvent=function(evt){if(evt?.type==='attack'&&evt.kill){renderKillEvent(evt);return;}return originalAppendEvent?originalAppendEvent(evt):undefined;};
  window.ThinUI.__anchoredDeathRenderer=true;
  return true;
}
function injectStyles(){
  if(document.getElementById('anchored-death-renderer-style'))return;
  const s=document.createElement('style');
  s.id='anchored-death-renderer-style';
  s.textContent=`
#monster-death-layer{display:none!important}
#mob-list .mob-card.death-sequence{visibility:visible!important;opacity:1!important;transform:none!important}
#mob-list .mob-card.death-sequence .mob-sprite{display:block!important;opacity:1!important;transform:none!important;transition:none!important}
#mob-list .mob-card.death-half .mob-sprite{transform:translateY(-5px)!important}
#mob-list .mob-card.death-ground .mob-sprite{transform:translateY(9px)!important}
.combat-kill{color:#fde68a;font-weight:700;margin-top:5px}
.combat-reward{color:#86efac}.combat-drop{color:#93c5fd}
`;
  document.head.appendChild(s);
}
function boot(){
  document.getElementById('monster-death-layer')?.remove();
  injectStyles();
  if(!hook()){const retry=setInterval(()=>{if(hook())clearInterval(retry);},25);}
  setInterval(renderLoop,FRAME_TICK_MS);
  renderLoop();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
