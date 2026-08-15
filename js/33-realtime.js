// MMO2 1.49 thin realtime client. Browser sends intent; server owns all game state.
(function(){
'use strict';
const TOKEN='mmo149_server_token',SERVER_URL='wss://mmo2.onrender.com';
const S={ws:null,connected:false,authed:false,id:null,online:[],snapshot:null,retry:null,autoAttack:true,autoTimer:null};
function send(type,payload){if(!S.ws||S.ws.readyState!==WebSocket.OPEN)return false;S.ws.send(JSON.stringify({type,payload:payload||{}}));return true;}
function auth(){send('auth',{token:localStorage.getItem(TOKEN)||''});}
function updateAutoButton(){let b=document.getElementById('auto-attack-btn');if(!b)return;b.textContent='自動攻擊：'+(S.autoAttack?'ON':'OFF');b.classList.toggle('active',S.autoAttack);}
function autoAttackTick(){if(!S.autoAttack||!S.authed)return;let snap=S.snapshot;if(!snap||!snap.self||snap.self.hp<=0||!snap.world)return;let target=(snap.world.mobs||[]).find(m=>m&&!m.dead&&m.hp>0);if(!target)return;window.ThinUI?.animatePlayerAttack?.();send('attack',{uid:target.uid});}
function startAutoLoop(){if(S.autoTimer)return;S.autoTimer=setInterval(autoAttackTick,850);updateAutoButton();}
function setAutoAttack(v){S.autoAttack=!!v;updateAutoButton();return S.autoAttack;}
function toggleAutoAttack(){return setAutoAttack(!S.autoAttack);}
function packet(m){const p=m.payload||{};if(m.type==='welcome'){S.id=p.id;auth();return;}if(m.type==='auth_ok'){S.authed=true;if(p.token)localStorage.setItem(TOKEN,p.token);window.ThinUI?.renderCharacter(p.character);window.ThinUI?.connection(true,true);startAutoLoop();return;}if(m.type==='snapshot'){S.snapshot=p;window.ThinUI?.renderCharacter(p.self);window.ThinUI?.renderWorld(p.world);window.ThinUI?.appendEvent(p.event);return;}if(m.type==='presence'){S.online=p.players||[];window.ThinUI?.renderPresence(S.online);return;}if(m.type==='world_chat'){window.ThinUI?.appendChat(p);return;}if(m.type==='error'){console.warn('[MMO149]',p.message||'server error');return;}}
function connect(){clearTimeout(S.retry);try{S.ws=new WebSocket(SERVER_URL);}catch(_){return retry();}S.ws.onopen=()=>{S.connected=true;S.authed=false;window.ThinUI?.connection(true,false);auth();};S.ws.onmessage=e=>{try{packet(JSON.parse(e.data));}catch(err){console.warn('[MMO149] bad packet',err);}};S.ws.onclose=()=>{S.connected=false;S.authed=false;window.ThinUI?.connection(false,false);retry();};S.ws.onerror=()=>{try{S.ws.close();}catch(_){}};}
function retry(){clearTimeout(S.retry);S.retry=setTimeout(connect,3000);}
function serverOnly(type,payload){if(!S.authed)return false;return send(type,payload);}
window.MMO149Realtime={connect,send,isConnected:()=>S.connected,isAuthoritative:()=>S.authed,onlinePlayers:()=>S.online.slice(),snapshot:()=>S.snapshot,getServerUrl:()=>SERVER_URL,clientId:()=>S.id,isAutoAttack:()=>S.autoAttack,setAutoAttack,toggleAutoAttack,rollStats:()=>window.ThinUI?.showRoll({rollId:'server',stats:{str:'?',dex:'?',con:'?',int:'?',wis:'?',cha:'?'}}),createCharacter:(name,cls)=>send('auth',{token:'',name,cls}),changeMap:map=>serverOnly('map_change',{map}),move:(x,y)=>serverOnly('move',{x,y}),attack:uid=>serverOnly('attack',{uid}),equip:uid=>serverOnly('equip',{uid}),unequip:slot=>serverOnly('unequip',{slot}),useItem:uid=>serverOnly('use_item',{uid}),buy:(id,qty)=>serverOnly('buy',{id,qty}),sell:(uid,qty)=>serverOnly('sell',{uid,qty}),warehouse:(action,uid,qty)=>serverOnly('warehouse',{action,uid,qty}),quest:(action,key)=>serverOnly('quest',{action,key}),chat:text=>serverOnly('world_chat',{text:String(text||'').slice(0,80)})};
function boot(){connect();startAutoLoop();setInterval(()=>{if(S.connected)send('ping',{t:Date.now()});},15000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
