// ============================================================
// MMO2 1.49 Realtime Client
// 真正的 WebSocket 多人連線層：在線玩家、地圖分房、狀態同步、世界聊天。
// GitHub Pages 只負責前端；正式版需部署 /server 的 Node.js WebSocket 服務。
// ============================================================
(function () {
  'use strict';

  const CFG_KEY = 'mmo149_ws_url';
  const DEFAULT_LOCAL = 'ws://localhost:8080';
  const state = {
    socket: null,
    connected: false,
    reconnectTimer: null,
    heartbeatTimer: null,
    syncTimer: null,
    clientId: null,
    online: new Map(),
    lastSnapshot: ''
  };

  function configuredUrl() {
    try {
      const qs = new URLSearchParams(location.search);
      const fromQuery = qs.get('ws');
      if (fromQuery) {
        localStorage.setItem(CFG_KEY, fromQuery);
        return fromQuery;
      }
      const saved = localStorage.getItem(CFG_KEY);
      if (saved) return saved;
    } catch (_) {}
    return DEFAULT_LOCAL;
  }

  function publicPlayerSnapshot() {
    const p = (typeof player !== 'undefined' && player) ? player : null;
    const ms = (typeof mapState !== 'undefined' && mapState) ? mapState : null;
    if (!p || !p.cls) return null;
    return {
      name: String(p.name || '未命名').slice(0, 12),
      cls: p.cls,
      lv: Number(p.lv || 1),
      hp: Number(p.hp || p.curHp || 0),
      maxHp: Number(p.maxHp || p.mhp || 0),
      mp: Number(p.mp || p.curMp || 0),
      maxMp: Number(p.maxMp || p.mmp || 0),
      map: String((ms && (ms.map || ms.id || ms.mapId)) || p.map || 'town_talking'),
      x: Number((p.x != null ? p.x : (ms && ms.x)) || 0),
      y: Number((p.y != null ? p.y : (ms && ms.y)) || 0),
      avatar: String(p.avatar || ''),
      pledge: String(p.bloodPledge || '')
    };
  }

  function send(type, payload) {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN) return false;
    state.socket.send(JSON.stringify({ type, payload: payload || {} }));
    return true;
  }

  function sys(text) {
    try {
      if (typeof addSysLog === 'function') { addSysLog('[連線] ' + text); return; }
      const el = document.getElementById('sys-log') || document.getElementById('world-log');
      if (el) {
        const div = document.createElement('div');
        div.textContent = '[連線] ' + text;
        el.appendChild(div);
      }
    } catch (_) {}
  }

  function worldMessage(msg) {
    try {
      const el = document.getElementById('world-log');
      if (!el) return;
      const row = document.createElement('div');
      row.className = 'world-line realtime-line';
      row.textContent = '[' + (msg.name || '玩家') + '] ' + (msg.text || '');
      el.appendChild(row);
      el.scrollTop = el.scrollHeight;
    } catch (_) {}
  }

  function updateOnlineUi() {
    let badge = document.getElementById('mmo149-online-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'mmo149-online-badge';
      badge.style.cssText = 'position:fixed;right:12px;top:12px;z-index:9999;background:rgba(5,15,25,.88);border:1px solid #44657a;color:#d9edf7;padding:6px 10px;border-radius:5px;font:12px/1.3 Microsoft JhengHei,sans-serif;pointer-events:none';
      document.body.appendChild(badge);
    }
    badge.textContent = state.connected ? ('● 即時連線｜在線 ' + state.online.size) : '○ 離線模式';
  }

  function onPacket(packet) {
    if (!packet || typeof packet !== 'object') return;
    const p = packet.payload || {};
    switch (packet.type) {
      case 'welcome':
        state.clientId = p.id || null;
        break;
      case 'presence':
        state.online.clear();
        (p.players || []).forEach(x => { if (x && x.id) state.online.set(x.id, x); });
        updateOnlineUi();
        window.dispatchEvent(new CustomEvent('mmo149:presence', { detail: Array.from(state.online.values()) }));
        break;
      case 'player_join':
      case 'player_state':
        if (p && p.id) state.online.set(p.id, p);
        updateOnlineUi();
        window.dispatchEvent(new CustomEvent('mmo149:player', { detail: p }));
        break;
      case 'player_leave':
        if (p && p.id) state.online.delete(p.id);
        updateOnlineUi();
        break;
      case 'world_chat':
        worldMessage(p);
        break;
      case 'error':
        sys(p.message || '伺服器錯誤');
        break;
    }
  }

  function connect() {
    clearTimeout(state.reconnectTimer);
    let url = configuredUrl();
    try {
      state.socket = new WebSocket(url);
    } catch (e) {
      scheduleReconnect();
      return;
    }
    state.socket.addEventListener('open', function () {
      state.connected = true;
      updateOnlineUi();
      sys('已連上多人伺服器');
      const snap = publicPlayerSnapshot();
      if (snap) send('hello', snap);
      clearInterval(state.heartbeatTimer);
      state.heartbeatTimer = setInterval(() => send('ping', { t: Date.now() }), 15000);
    });
    state.socket.addEventListener('message', function (ev) {
      try { onPacket(JSON.parse(ev.data)); } catch (_) {}
    });
    state.socket.addEventListener('close', function () {
      state.connected = false;
      state.online.clear();
      updateOnlineUi();
      scheduleReconnect();
    });
    state.socket.addEventListener('error', function () {
      try { state.socket.close(); } catch (_) {}
    });
  }

  function scheduleReconnect() {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = setTimeout(connect, 3000);
  }

  function syncSelf() {
    const snap = publicPlayerSnapshot();
    if (!snap || !state.connected) return;
    const json = JSON.stringify(snap);
    if (json === state.lastSnapshot) return;
    state.lastSnapshot = json;
    send('state', snap);
  }

  // 將原本本機世界頻道輸入升級成真正多人世界聊天；保留原函式做離線 fallback。
  function hookWorldChat() {
    if (typeof window.worldChannelAsk !== 'function' || window.__mmo149WorldHook) return;
    const old = window.worldChannelAsk;
    window.worldChannelAsk = function () {
      const input = document.getElementById('world-input');
      const text = input ? input.value.trim() : '';
      const snap = publicPlayerSnapshot();
      if (state.connected && text) {
        send('world_chat', { text: text.slice(0, 80), name: snap ? snap.name : '玩家' });
        if (input) input.value = '';
        return;
      }
      return old.apply(this, arguments);
    };
    window.__mmo149WorldHook = true;
  }

  window.MMO149Realtime = {
    connect,
    send,
    onlinePlayers: () => Array.from(state.online.values()),
    isConnected: () => state.connected,
    setServerUrl: function (url) {
      localStorage.setItem(CFG_KEY, String(url || ''));
      try { if (state.socket) state.socket.close(); } catch (_) {}
      connect();
    },
    getServerUrl: configuredUrl
  };

  function boot() {
    updateOnlineUi();
    hookWorldChat();
    connect();
    clearInterval(state.syncTimer);
    state.syncTimer = setInterval(function () { hookWorldChat(); syncSelf(); }, 500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
