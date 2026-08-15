'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const MAX_MSG = 16 * 1024;
const TICK_MS = 1000;
const SAVE_FILE = process.env.SAVE_FILE || path.join(__dirname, 'data', 'characters.json');
const DATABASE_URL = process.env.DATABASE_URL || '';
const db = DATABASE_URL ? new Pool({ connectionString:DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized:false } : undefined }) : null;

const clients = new Map();
const characters = new Map();
const dirtyTokens = new Set();
const worlds = new Map();
const ALLOWED_CLASSES = new Set(['royal','knight','mage','elf']);
const MAPS = {
  town_silver_knight:{name:'銀騎士村',safe:true}, town_elf:{name:'妖精森林',safe:true}, town_talking:{name:'說話之島',safe:true}, town_gludio:{name:'燃柳村',safe:true}, town_gludin:{name:'古魯丁村莊',safe:true},
  training:{name:'新兵修練場',pool:['orc','goblin','orc_archer','gremlin']}, silver_knight:{name:'銀騎士地區',pool:['orc','goblin','orc_archer','zombie','wolf','skeleton']}, talking_island:{name:'說話之島周邊',pool:['orc','goblin','orc_archer','zombie','wolf','skeleton']}, talking_island_port:{name:'說話之島港口',pool:['fighter','wolf','stone_golem','spider','b_knight','elder','kurt']}, zone_01:{name:'妖精森林周邊',pool:['orc','orc_archer','fighter','zombie','wolf','orc_mage','stone_golem']}, elf_forest:{name:'妖魔森林',pool:['orc_archer','fighter','wolf','orc_mage','ghoul','sparto','lycan','gaster']}, gludio:{name:'古魯丁',pool:['orc','goblin','zombie','fighter','wolf','skeleton','ghoul','sparto']}, windwood:{name:'風木',pool:['orc_archer','fighter','wolf','orc_mage','stone_golem','lizardman','ant']}, desert:{name:'沙漠',pool:['evil_lizard','scorpion','ant','giant_ant','lizardman','stone_golem','sparto']}, kent:{name:'肯特',pool:['orc','goblin','orc_archer','fighter','wolf','stone_golem','spider','hobgoblin','bear']},
  zone_06:{name:'古魯丁地監1樓',pool:['orc','orc_archer','zombie','fighter','skeleton','skel_archer','ghoul','sparto']}, zone_07:{name:'古魯丁地監2樓',pool:['zombie','skeleton','skel_archer','skel_spear','spider','ghoul','sparto']}, zone_08:{name:'古魯丁地監3樓',pool:['zombie','skeleton','skel_archer','stone_golem','ghoul','sparto','ogre']}, zone_09:{name:'古魯丁地監4樓',pool:['zombie','skeleton','skel_archer','ghoul','sparto','ogre','cerberus']}, zone_10:{name:'古魯丁地監5樓',pool:['skeleton','skel_archer','skel_axe','skel_spear','ghoul','sparto','cerberus','dk']}, zone_11:{name:'古魯丁地監6樓',pool:['skel_archer','ghoul','sparto','elder','ogre','cerberus','necromancer','dk']}, zone_12:{name:'古魯丁地監7樓',pool:['skel_archer','ghoul','sparto','ogre','cerberus','dk']}, zone_13:{name:'說話之島地監1樓',pool:['orc','zombie','fighter','skeleton','skel_archer','stone_golem','ghoul']}, zone_14:{name:'說話之島地監2樓',pool:['zombie','skeleton','skel_archer','ghoul','sparto','black_knight','kurt']}, zone_15:{name:'眠龍洞穴1樓',pool:['orc','zombie','skeleton','ghoul','sparto','lizardman']}, zone_16:{name:'眠龍洞穴2樓',pool:['skeleton','skel_archer','ghoul','sparto','lizardman','ogre']}, zone_17:{name:'眠龍洞穴3樓',pool:['skeleton','sparto','ogre','cerberus','dark_elf']}, zone_22:{name:'沙漠地監1樓',pool:['ant','giant_ant','scorpion','lizardman','skeleton']}, zone_23:{name:'沙漠地監2樓',pool:['ant','giant_ant','scorpion','sparto','skeleton']}, zone_24:{name:'沙漠地監3樓',pool:['giant_ant','scorpion','sparto','cerberus']}, zone_25:{name:'沙漠地監4樓',pool:['giant_ant','sparto','cerberus','ogre']}, zone_32:{name:'螞蟻洞窟1樓',pool:['ant','giant_ant','scorpion']}, zone_33:{name:'螞蟻洞窟2樓',pool:['giant_ant','scorpion','ant_queen']}, dragon_valley:{name:'龍之谷',pool:['sparto','lycan','scorpion','harpy','dark_elf','ogre_warrior','arian','wyvern','blackelder']}, zone_26:{name:'龍之谷地監1樓',pool:['skeleton','skel_archer','sparto','ghoul','cerberus']}, zone_27:{name:'龍之谷地監2樓',pool:['skeleton','skel_archer','sparto','cerberus','ogre']}, zone_28:{name:'龍之谷地監3樓',pool:['skel_archer','sparto','cerberus','ogre','dark_elf']}, zone_29:{name:'龍之谷地監4樓',pool:['sparto','cerberus','ogre','dark_elf','wyvern']}, zone_30:{name:'龍之谷地監5樓',pool:['cerberus','ogre','dark_elf','wyvern','blackelder']}, zone_31:{name:'龍之谷地監6樓',pool:['ogre','dark_elf','wyvern','blackelder','dragon']}
};
const ALLOWED_MAPS = new Set(Object.keys(MAPS));
const MOB_STATS={orc:[5,35,5,3],goblin:[3,24,3,2],orc_archer:[6,32,6,3],gremlin:[4,28,4,2],zombie:[7,45,6,3],wolf:[5,30,5,3],skeleton:[8,48,7,4],fighter:[9,55,8,4],stone_golem:[12,95,11,6],spider:[8,50,7,4],ghoul:[12,80,10,5],sparto:[15,105,13,7],lycan:[17,120,14,8],gaster:[18,130,15,8],orc_mage:[14,88,12,6],hobgoblin:[13,90,11,6],bear:[16,125,14,8],lizardman:[18,130,15,8],ant:[10,60,9,5],giant_ant:[17,125,14,8],scorpion:[18,135,15,8],evil_lizard:[16,115,14,7],skel_archer:[14,85,12,6],skel_spear:[16,105,13,7],skel_axe:[17,115,14,7],ogre:[22,230,22,13],cerberus:[24,250,24,14],elder:[25,210,22,13],necromancer:[30,320,28,18],dk:[35,520,36,24],black_knight:[24,240,22,14],b_knight:[24,240,22,14],kurt:[30,420,31,20],dark_elf:[28,280,26,17],ogre_warrior:[30,360,29,18],arian:[32,390,31,20],wyvern:[34,430,34,22],blackelder:[38,560,40,26],dragon:[42,700,48,32],ant_queen:[30,450,32,21]};

function cleanText(v,max){return String(v==null?'':v).replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,max);}
function rint(lo,hi){return lo+Math.floor(Math.random()*(hi-lo+1));}
function send(ws,type,payload){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type,payload}));}
function error(ws,message){send(ws,'error',{message});}
function markDirty(token){if(token)dirtyTokens.add(token);}
function baseForClass(cls){return {royal:{hp:70,mp:20,atk:8,ac:2},knight:{hp:95,mp:8,atk:11,ac:4},mage:{hp:50,mp:55,atk:5,ac:0},elf:{hp:60,mp:30,atk:8,ac:2}}[cls]||{hp:70,mp:20,atk:8,ac:2};}
function newCharacter(name,cls){const b=baseForClass(cls);return{name,cls,lv:1,exp:0,gold:1000,hp:b.hp,maxHp:b.hp,mp:b.mp,maxMp:b.mp,atk:b.atk,ac:b.ac,map:cls==='elf'?'town_elf':(cls==='knight'?'town_silver_knight':'town_talking'),deaths:0,updatedAt:Date.now()};}
function normalizeChar(c){if(!c||!ALLOWED_CLASSES.has(c.cls))return null;if(!ALLOWED_MAPS.has(c.map))c.map=c.cls==='elf'?'town_elf':(c.cls==='knight'?'town_silver_knight':'town_talking');return c;}

async function initPersistence(){
  if(db){
    await db.query(`CREATE TABLE IF NOT EXISTS characters (token VARCHAR(96) PRIMARY KEY, name VARCHAR(24) NOT NULL, class VARCHAR(16) NOT NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    const result=await db.query('SELECT token,data FROM characters');
    for(const row of result.rows){const c=normalizeChar(row.data);if(c)characters.set(row.token,c);}
    console.log(`PostgreSQL persistence ready: ${characters.size} character(s) loaded`);
    return;
  }
  try{const raw=JSON.parse(fs.readFileSync(SAVE_FILE,'utf8'));for(const[token,value]of Object.entries(raw||{})){const c=normalizeChar(value);if(c)characters.set(token,c);}}catch(_){}
  console.warn('DATABASE_URL not set; using local JSON fallback (not permanent on Render).');
}
async function saveToken(token){
  const c=characters.get(token);if(!c)return;
  if(db){await db.query(`INSERT INTO characters(token,name,class,data,updated_at) VALUES($1,$2,$3,$4::jsonb,NOW()) ON CONFLICT(token) DO UPDATE SET name=EXCLUDED.name,class=EXCLUDED.class,data=EXCLUDED.data,updated_at=NOW()`,[token,c.name,c.cls,JSON.stringify(c)]);return;}
}
async function flushDirty(){
  if(!dirtyTokens.size)return;
  const tokens=Array.from(dirtyTokens);dirtyTokens.clear();
  if(db){for(const token of tokens){try{await saveToken(token);}catch(e){dirtyTokens.add(token);console.error('PostgreSQL save failed',e.message);}}return;}
  try{fs.mkdirSync(path.dirname(SAVE_FILE),{recursive:true});const tmp=SAVE_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(Object.fromEntries(characters.entries()),null,2));fs.renameSync(tmp,SAVE_FILE);}catch(e){console.error('JSON save failed',e);}
}
setInterval(()=>{flushDirty().catch(console.error);},3000).unref();

function expNeed(lv){return 100+Math.max(0,lv-1)*80;}
function checkLevel(c){while(c.lv<99&&c.exp>=expNeed(c.lv)){c.exp-=expNeed(c.lv);c.lv++;const b=baseForClass(c.cls);c.maxHp+=Math.max(4,Math.floor(b.hp/14));c.maxMp+=Math.max(1,Math.floor(b.mp/14));c.atk+=(c.lv%2===0?1:0);c.hp=c.maxHp;c.mp=c.maxMp;}}
function publicChar(c,id){return{id,name:c.name,cls:c.cls,lv:c.lv,hp:c.hp,maxHp:c.maxHp,mp:c.mp,maxMp:c.maxMp,gold:c.gold,exp:c.exp,expNeed:expNeed(c.lv),map:c.map};}
function clientChar(client){return client&&client.token?characters.get(client.token):null;}
function worldFor(mapId){if(!worlds.has(mapId))worlds.set(mapId,{map:mapId,mobs:[],seq:0});const w=worlds.get(mapId);ensureMobs(w);return w;}
function makeMob(mapId,world){const pool=(MAPS[mapId]&&MAPS[mapId].pool)||[];if(!pool.length)return null;const templateId=pool[rint(0,pool.length-1)],s=MOB_STATS[templateId]||[10,70,9,5];world.seq++;return{uid:'m'+world.seq+'-'+crypto.randomBytes(3).toString('hex'),templateId,lv:s[0],hp:s[1],maxHp:s[1],atk:s[2],def:s[3],dead:false,respawnAt:0};}
function ensureMobs(world){const map=MAPS[world.map];if(!map||map.safe){world.mobs.length=0;return;}for(let i=0;i<3;i++)if(!world.mobs[i])world.mobs[i]=makeMob(world.map,world);}
function publicWorld(world){return{map:world.map,name:(MAPS[world.map]||{}).name||world.map,mobs:world.mobs.filter(Boolean).map(m=>({uid:m.uid,templateId:m.templateId,lv:m.lv,hp:m.hp,maxHp:m.maxHp,dead:m.dead}))};}
function playersInMap(mapId){const out=[];for(const c of clients.values()){const ch=clientChar(c);if(ch&&ch.map===mapId)out.push(c);}return out;}
function sendSnapshot(client,event){const c=clientChar(client);if(!c)return;send(client.ws,'snapshot',{self:publicChar(c,client.id),world:publicWorld(worldFor(c.map)),event:event||null});}
function broadcastMap(mapId,event){for(const c of playersInMap(mapId))sendSnapshot(c,event);}
function presence(){const players=[];for(const c of clients.values()){const ch=clientChar(c);if(ch)players.push(publicChar(ch,c.id));}for(const c of clients.values())send(c.ws,'presence',{players});}

async function handleLogin(client,p){let token=cleanText(p.token,80),char=token&&characters.get(token);if(!char){const name=cleanText(p.name,12),cls=ALLOWED_CLASSES.has(p.cls)?p.cls:null;if(name.length<2||!cls)return error(client.ws,'首次連線需要 2～12 字角色名稱與四大職業。');token=crypto.randomBytes(24).toString('hex');char=newCharacter(name,cls);characters.set(token,char);markDirty(token);await flushDirty();}client.token=token;client.lastSeen=Date.now();send(client.ws,'auth_ok',{token,character:publicChar(char,client.id)});sendSnapshot(client,{type:'login'});presence();}
function handleMapChange(client,p){const c=clientChar(client);if(!c)return;const target=cleanText(p.map,40);if(!ALLOWED_MAPS.has(target))return error(client.ws,'1.49 世界不存在這張地圖。');const from=c.map;c.map=target;if(MAPS[target].safe){c.hp=c.maxHp;c.mp=c.maxMp;}c.updatedAt=Date.now();markDirty(client.token);sendSnapshot(client,{type:'map_change',from,to:target});broadcastMap(from,{type:'player_leave_map',id:client.id});broadcastMap(target,{type:'player_enter_map',id:client.id,name:c.name});presence();}
function handleAttack(client,p){const c=clientChar(client);if(!c||c.hp<=0)return;const map=MAPS[c.map];if(!map||map.safe)return;const world=worldFor(c.map),mob=world.mobs.find(m=>m&&!m.dead&&m.uid===p.uid);if(!mob)return error(client.ws,'目標已不存在。');if((client.nextAttackAt||0)>Date.now())return;client.nextAttackAt=Date.now()+Math.max(450,900-c.lv*4);const hitChance=Math.max(.45,Math.min(.95,.72+(c.lv-mob.lv)*.012));let dmg=0,hit=Math.random()<hitChance;if(hit){dmg=Math.max(1,rint(Math.max(1,c.atk-3),c.atk+5)-Math.floor(mob.def/3));mob.hp=Math.max(0,mob.hp-dmg);}const evt={type:'attack',attacker:client.id,target:mob.uid,hit,dmg};if(mob.hp<=0&&!mob.dead){mob.dead=true;mob.respawnAt=Date.now()+5000;const exp=Math.max(5,mob.lv*7),gold=rint(Math.max(1,mob.lv*2),Math.max(3,mob.lv*5));c.exp+=exp;c.gold+=gold;checkLevel(c);evt.kill=true;evt.exp=exp;evt.gold=gold;}c.updatedAt=Date.now();markDirty(client.token);broadcastMap(c.map,evt);}
function handleChat(client,p){const c=clientChar(client);if(!c)return;const now=Date.now();if(now-(client.chatAt||0)<500)return;client.chatAt=now;const text=cleanText(p.text,80);if(!text)return;for(const x of clients.values())send(x.ws,'world_chat',{id:client.id,name:c.name,text,at:now});}
function worldTick(){const now=Date.now();for(const[mapId,world]of worlds.entries()){ensureMobs(world);let changed=false;for(let i=0;i<world.mobs.length;i++){const m=world.mobs[i];if(m&&m.dead&&now>=m.respawnAt){world.mobs[i]=makeMob(mapId,world);changed=true;}}const pcs=playersInMap(mapId).filter(cl=>{const c=clientChar(cl);return c&&c.hp>0;}),alive=world.mobs.filter(m=>m&&!m.dead);if(pcs.length&&alive.length){for(const mob of alive){if(Math.random()>.58)continue;const victim=pcs[rint(0,pcs.length-1)],c=clientChar(victim),dmg=Math.max(1,rint(Math.max(1,mob.atk-4),mob.atk+3)-Math.floor(c.ac/2));c.hp=Math.max(0,c.hp-dmg);markDirty(victim.token);changed=true;if(c.hp===0){c.deaths=(c.deaths||0)+1;c.gold=Math.max(0,c.gold-Math.floor(c.gold*.03));markDirty(victim.token);setTimeout(()=>{const cc=clientChar(victim);if(!cc)return;cc.map=cc.cls==='elf'?'town_elf':(cc.cls==='knight'?'town_silver_knight':'town_talking');cc.hp=cc.maxHp;cc.mp=cc.maxMp;markDirty(victim.token);sendSnapshot(victim,{type:'revive'});presence();},3000);}}}if(changed)broadcastMap(mapId,{type:'tick'});}}
setInterval(worldTick,TICK_MS).unref();

const server=http.createServer((req,res)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Content-Type','application/json; charset=utf-8');if(req.url==='/health'){res.end(JSON.stringify({ok:true,online:clients.size,world:'1.49',authority:'server',persistence:db?'postgresql':'json-fallback',characters:characters.size,lastMap:'dragon_valley'}));return;}res.end(JSON.stringify({name:'MMO2 1.49 authoritative realtime server',online:clients.size,persistence:db?'postgresql':'json-fallback'}));});
const wss=new WebSocketServer({server,maxPayload:MAX_MSG});
wss.on('connection',ws=>{const id=crypto.randomUUID(),client={id,ws,token:null,lastSeen:Date.now(),chatAt:0,nextAttackAt:0};clients.set(id,client);send(ws,'welcome',{id,world:'1.49',authority:'server',lastMap:'dragon_valley'});ws.on('message',async raw=>{client.lastSeen=Date.now();let msg;try{msg=JSON.parse(raw.toString());}catch(_){return;}const p=(msg&&msg.payload)||{};try{if(msg.type==='auth')return await handleLogin(client,p);if(msg.type==='map_change')return handleMapChange(client,p);if(msg.type==='attack')return handleAttack(client,p);if(msg.type==='world_chat')return handleChat(client,p);if(msg.type==='ping')return send(ws,'pong',{t:Date.now()});}catch(e){console.error('message handler',e);error(ws,'伺服器資料處理失敗。');}});ws.on('close',()=>{const c=clientChar(client),map=c&&c.map;clients.delete(id);if(map)broadcastMap(map,{type:'player_disconnect',id});presence();});});
setInterval(()=>{const now=Date.now();for(const c of clients.values())if(now-c.lastSeen>60000)try{c.ws.terminate();}catch(_){}},15000).unref();

async function start(){try{await initPersistence();server.listen(PORT,HOST,()=>console.log(`MMO2 1.49 authoritative server on ${HOST}:${PORT} | persistence=${db?'postgresql':'json-fallback'}`));}catch(e){console.error('Server startup failed:',e);process.exit(1);}}
async function shutdown(){try{await flushDirty();if(db)await db.end();}finally{process.exit(0);}}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
start();
