// MMO2 1.49 authoritative realtime client
(function(){
'use strict';
const CFG='mmo149_ws_url', TOKEN='mmo149_server_token';
const S={ws:null,connected:false,authed:false,id:null,online:[],snapshot:null,retry:null};
function url(){try{let q=new URLSearchParams(location.search).get('ws');if(q){localStorage.setItem(CFG,q);return q;}let s=localStorage.getItem(CFG);if(s)return s;}catch(_){}return 'ws://localhost:8080';}
function send(type,payload){if(!S.ws||S.ws.readyState!==WebSocket.OPEN)return false;S.ws.send(JSON.stringify({type,payload:payload||{}}));return true;}
function localIdentity(){let p=(typeof player!=='undefined'&&player)||{};return{name:String(p.name||'').slice(0,12),cls:p.cls||''};}
function auth(){let i=localIdentity();send('auth',{token:localStorage.getItem(TOKEN)||'',name:i.name,cls:i.cls});}
function badge(){let e=document.getElementById('mmo149-online-badge');if(!e){e=document.createElement('div');e.id='mmo149-online-badge';e.style.cssText='position:fixed;right:12px;top:12px;z-index:9999;background:rgba(5,15,25,.9);border:1px solid #44657a;color:#d9edf7;padding:6px 10px;border-radius:5px;font:12px Microsoft JhengHei,sans-serif';document.body.appendChild(e);}e.textContent=S.connected?(S.authed?'● 伺服器權威｜在線 '+S.online.length:'● 已連線｜等待角色登入'):'○ 多人伺服器離線';}
function applySelf(c){if(!c||typeof player==='undefined'||!player)return;player.name=c.name;player.cls=c.cls;player.lv=c.lv;player.hp=c.hp;player.mhp=c.maxHp;player.mp=c.mp;player.mmp=c.maxMp;player.gold=c.gold;player.exp=c.exp;if(typeof mapState!=='undefined'&&mapState)mapState.current=c.map;try{if(typeof calcStats==='function')calcStats();if(typeof updateUI==='function')updateUI();}catch(_){} }
function applyWorld(w){if(!w||typeof mapState==='undefined'||!mapState)return;mapState.current=w.map;mapState.mobs=(w.mobs||[]).map(function(sm){let base=(typeof DB!=='undefined'&&DB.mobs&&DB.mobs[sm.templateId])||{};return Object.assign({},base,{uid:sm.uid,_serverUid:sm.uid,_serverTemplate:sm.templateId,lv:sm.lv,hp:sm.maxHp,curHp:sm.hp,_dead:!!sm.dead});});while(mapState.mobs.length<5)mapState.mobs.push(null);try{if(typeof setMapSelectors==='function')setMapSelectors(w.map);if(typeof renderMobs==='function')renderMobs();}catch(_){} }
function packet(m){let p=m.payload||{};if(m.type==='welcome'){S.id=p.id;auth();}else if(m.type==='auth_ok'){S.authed=true;if(p.token)localStorage.setItem(TOKEN,p.token);applySelf(p.character);badge();}else if(m.type==='snapshot'){S.snapshot=p;applySelf(p.self);applyWorld(p.world);window.dispatchEvent(new CustomEvent('mmo149:snapshot',{detail:p}));}else if(m.type==='presence'){S.online=p.players||[];badge();}else if(m.type==='world_chat'){let e=document.getElementById('world-log');if(e){let d=document.createElement('div');d.textContent='['+(p.name||'玩家')+'] '+(p.text||'');e.appendChild(d);e.scrollTop=e.scrollHeight;}}else if(m.type==='error'){console.warn('[MMO149]',p.message||'server error');}}
function connect(){clearTimeout(S.retry);try{S.ws=new WebSocket(url());}catch(_){return retry();}S.ws.onopen=function(){S.connected=true;S.authed=false;badge();auth();};S.ws.onmessage=function(e){try{packet(JSON.parse(e.data));}catch(_){}};S.ws.onclose=function(){S.connected=false;S.authed=false;badge();retry();};S.ws.onerror=function(){try{S.ws.close();}catch(_){}};}
function retry(){clearTimeout(S.retry);S.retry=setTimeout(connect,3000);}
function hook(){
  // 地圖：多人連線時只向伺服器提出請求，不允許本機自行決定最終所在地。
  if(typeof window.changeMap==='function'&&!window.__mmo149MapHook){let old=window.changeMap;window.changeMap=function(force){if(S.authed&&!force){let el=document.getElementById('map-select'),target=el&&el.value;if(target){send('map_change',{map:target});return false;}}return old.apply(this,arguments);};window.__mmo149MapHook=true;}
  // 普攻：伺服器計算命中、傷害、擊殺、經驗與金幣；本機不再扣怪物 HP。
  if(typeof window.playerAttack==='function'&&!window.__mmo149AttackHook){let old=window.playerAttack;window.playerAttack=function(){if(S.authed){let t=typeof getTarget==='function'?getTarget():null;if(t&&t._serverUid)send('attack',{uid:t._serverUid});return;}return old.apply(this,arguments);};window.__mmo149AttackHook=true;}
  if(typeof window.worldChannelAsk==='function'&&!window.__mmo149ChatHook){let old=window.worldChannelAsk;window.worldChannelAsk=function(){let input=document.getElementById('world-input'),text=input?input.value.trim():'';if(S.authed&&text){send('world_chat',{text:text.slice(0,80)});input.value='';return;}return old.apply(this,arguments);};window.__mmo149ChatHook=true;}
}
window.MMO149Realtime={connect:connect,send:send,isConnected:()=>S.connected,isAuthoritative:()=>S.authed,onlinePlayers:()=>S.online.slice(),snapshot:()=>S.snapshot,setServerUrl:function(v){localStorage.setItem(CFG,String(v||''));try{S.ws.close();}catch(_){}connect();}};
function boot(){badge();hook();connect();setInterval(function(){hook();if(S.connected)send('ping',{t:Date.now()});},5000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
