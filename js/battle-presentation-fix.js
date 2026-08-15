// MMO2 1.49 battle presentation compatibility layer.
// Core player and monster animation is owned by asset-player.js.
(function(){
'use strict';
function hookUi(){
  if(!window.ThinUI||!window.MMO149Visuals)return false;
  window.ThinUI.animatePlayerAttack=window.MMO149Visuals.animatePlayerAttack;
  if(!window.ThinUI.__correctPlayerAttackHook){
    const old=window.ThinUI.attack;
    window.ThinUI.attack=function(uid){
      window.MMO149Visuals?.animatePlayerAttack?.();
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
#battle-player-img{width:310px!important;height:310px!important;object-fit:contain!important;image-rendering:pixelated;display:block!important;filter:drop-shadow(0 8px 8px #000)}
#battle-player-name{position:relative;z-index:2;margin-top:-30px}
@media(max-width:760px){#mob-list{top:-18px!important}#battle-player{position:relative!important;left:auto!important;bottom:-12px!important;width:100%!important;min-height:255px!important;margin:0 auto 6px!important}#battle-player-img{width:250px!important;height:250px!important}}
`;
  document.head.appendChild(s);
}
function boot(){
  injectStyles();
  if(!hookUi()){
    const retry=setInterval(()=>{if(hookUi())clearInterval(retry);},50);
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
