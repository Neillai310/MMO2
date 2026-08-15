'use strict';

const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const MAX_MSG = 16 * 1024;
const clients = new Map();

const ALLOWED_CLASSES = new Set(['royal', 'knight', 'mage', 'elf']);
const ALLOWED_MAPS = new Set([
  'town_silver_knight','town_elf','town_talking','town_gludio','town_gludin',
  'training','silver_knight','talking_island','talking_island_port','zone_01','elf_forest',
  'gludio','windwood','desert','kent','dragon_valley',
  'zone_06','zone_07','zone_08','zone_09','zone_10','zone_11','zone_12','zone_13','zone_14',
  'zone_15','zone_16','zone_17','zone_22','zone_23','zone_24','zone_25','zone_26','zone_27','zone_28','zone_29','zone_30','zone_31','zone_32','zone_33'
]);

function cleanText(v, max) {
  return String(v == null ? '' : v).replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, max);
}
function num(v, min, max) {
  v = Number(v);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}
function sanitizeState(p) {
  p = p || {};
  const cls = ALLOWED_CLASSES.has(p.cls) ? p.cls : 'knight';
  const map = ALLOWED_MAPS.has(p.map) ? p.map : 'town_talking';
  return {
    name: cleanText(p.name || '未命名', 12),
    cls,
    lv: Math.floor(num(p.lv, 1, 99)),
    hp: Math.floor(num(p.hp, 0, 999999)),
    maxHp: Math.floor(num(p.maxHp, 0, 999999)),
    mp: Math.floor(num(p.mp, 0, 999999)),
    maxMp: Math.floor(num(p.maxMp, 0, 999999)),
    map,
    x: num(p.x, -100000, 100000),
    y: num(p.y, -100000, 100000),
    avatar: cleanText(p.avatar, 30),
    pledge: cleanText(p.pledge, 24)
  };
}
function send(ws, type, payload) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type, payload }));
}
function publicClient(c) {
  return Object.assign({ id: c.id }, c.state || { name:'連線中', cls:'knight', lv:1, map:'town_talking' });
}
function broadcast(type, payload, except) {
  for (const c of clients.values()) if (c.ws !== except) send(c.ws, type, payload);
}
function presence() {
  const players = Array.from(clients.values()).filter(c => c.state).map(publicClient);
  broadcast('presence', { players });
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.url === '/health') {
    res.end(JSON.stringify({ ok: true, online: clients.size, world: '1.49', lastMap: 'dragon_valley' }));
    return;
  }
  res.statusCode = 200;
  res.end(JSON.stringify({ name: 'MMO2 1.49 realtime server', online: clients.size }));
});

const wss = new WebSocketServer({ server, maxPayload: MAX_MSG });
wss.on('connection', (ws, req) => {
  const id = crypto.randomUUID();
  const client = { id, ws, state: null, lastSeen: Date.now(), chatAt: 0 };
  clients.set(id, client);
  send(ws, 'welcome', { id, world: '1.49', lastMap: 'dragon_valley' });

  ws.on('message', raw => {
    client.lastSeen = Date.now();
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch (_) { return; }
    const payload = msg && msg.payload || {};
    if (msg.type === 'hello' || msg.type === 'state') {
      client.state = sanitizeState(payload);
      broadcast(msg.type === 'hello' ? 'player_join' : 'player_state', publicClient(client), ws);
      if (msg.type === 'hello') presence();
      return;
    }
    if (msg.type === 'world_chat') {
      const now = Date.now();
      if (now - client.chatAt < 500) return;
      client.chatAt = now;
      const text = cleanText(payload.text, 80);
      if (!text) return;
      broadcast('world_chat', { id, name: client.state ? client.state.name : '玩家', text, at: now });
      return;
    }
    if (msg.type === 'ping') send(ws, 'pong', { t: Date.now() });
  });

  ws.on('close', () => {
    clients.delete(id);
    broadcast('player_leave', { id });
    presence();
  });
});

setInterval(() => {
  const now = Date.now();
  for (const c of clients.values()) {
    if (now - c.lastSeen > 60000) {
      try { c.ws.terminate(); } catch (_) {}
    }
  }
}, 15000).unref();

server.listen(PORT, HOST, () => {
  console.log(`MMO2 1.49 realtime server listening on ${HOST}:${PORT}`);
});
