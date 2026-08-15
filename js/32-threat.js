// ============================================================
// js/32-threat.js — 🎯 仇恨制（即時累積制·取代靜態受擊權重）
// ============================================================
'use strict';

let THREAT_ENABLED = true;
const THREAT_K = 20;
const THREAT_HALFLIFE_TICKS = 100;
const THREAT_MIN = 0.5;

function threatClassMult(ent) {
    let c = ent && ent.cls;
    if (c === 'knight' || c === 'royal') return 2.0;
    if (c === 'elf') return 1.5;
    if (c === 'mage') return 1.0;
    return 1.0;
}
function weaponSourceMult(ent) {
    let wRef = (ent && ent.eq && ent.eq.wpn) ? ent.eq.wpn : null;
    if (!wRef) return 1.0;
    let w = DB.items[wRef.id];
    if (!w) return 1.0;
    if (w.isBow || w.ranged) return 0.5;
    if (w.isWand) return 1.0;
    let tags = (typeof getWeaponTags === 'function') ? getWeaponTags(wRef.id) : [];
    if (tags.indexOf('武士刀') !== -1) return 1.2;
    if (tags.indexOf('雙手劍') !== -1 || tags.indexOf('雙手鈍器') !== -1) return 1.2;
    if (tags.indexOf('矛') !== -1) return w.w2h ? 1.2 : 1.5;
    if (tags.indexOf('單手劍') !== -1 || tags.indexOf('單手鈍器') !== -1) return 1.5;
    if (tags.indexOf('匕首') !== -1) return 1.0;
    return 1.0;
}
function computeThreatMult(ent) {
    if (!ent) return 1.0;
    if (ent.eq) for (let k in ent.eq) { let e = ent.eq[k]; if (e) { let d = DB.items[e.id]; if (d && d.aggroMin) return 0; } }
    if (!ent.cls) return 1.0;
    return threatClassMult(ent) * weaponSourceMult(ent);
}
function threatKey(ent) {
    if (!ent) return 'P';
    if (typeof player !== 'undefined' && ent === player) return 'P';
    if (ent._slot != null && ent.cls) return 'A:' + ent._slot;
    if (ent.uid != null) return 'U:' + ent.uid;
    return 'P';
}
function _threatNow() { return (typeof state !== 'undefined' && state) ? (state.ticks || 0) : 0; }
function _threatDecayMob(m, now) {
    if (!m || !m._threat) return;
    if (now == null) now = _threatNow();
    let last = m._threatT != null ? m._threatT : now;
    let dt = now - last;
    if (dt <= 0) return;
    let f = Math.pow(0.5, dt / THREAT_HALFLIFE_TICKS);
    for (let k in m._threat) { let v = m._threat[k] * f; if (v < THREAT_MIN) delete m._threat[k]; else m._threat[k] = v; }
    m._threatT = now;
}
function _threatAdd(m, key, amt, now) {
    if (!m || !(amt > 0)) return;
    if (now == null) now = _threatNow();
    if (!m._threat) { m._threat = Object.create(null); m._threatT = now; }
    else _threatDecayMob(m, now);
    m._threat[key] = (m._threat[key] || 0) + amt;
}
function threatOf(m, key) {
    if (!THREAT_ENABLED || !m || !m._threat) return 0;
    _threatDecayMob(m);
    return m._threat[key] || 0;
}
const IRON_GUARD_TAUNT_TICKS = 30;
function _ironGuardTauntState(m) {
    let taunt = m && m._ironGuardTaunt;
    if (!taunt) return null;
    if ((taunt.until || 0) <= _threatNow()) { delete m._ironGuardTaunt; return null; }
    return taunt;
}
function ironGuardTaunt(m, ent) {
    if (!m || m._dead || (m.curHp || 0) <= 0 || !ent) return false;
    let now = _threatNow(), key = threatKey(ent), old = _ironGuardTauntState(m);
    let firstApply = !old || old.key !== key;
    m._ironGuardTaunt = { key:key, until:now + IRON_GUARD_TAUNT_TICKS };
    if (THREAT_ENABLED) {
        if (!m._threat) { m._threat = Object.create(null); m._threatT = now; }
        else _threatDecayMob(m, now);
        let highest = 0;
        for (let k in m._threat) highest = Math.max(highest, Number(m._threat[k]) || 0);
        m._threat[key] = Math.max(Number(m._threat[key]) || 0, highest + THREAT_K);
    }
    return firstApply;
}
function ironGuardTauntTarget(m) {
    let taunt = _ironGuardTauntState(m);
    if (!taunt || typeof player === 'undefined' || !player) return null;
    if (taunt.key === 'P') return !player.dead && (player.hp || 0) > 0 ? player : null;
    return (player.allies || []).find(a => a && !a._downed && (a.curHp || 0) > 0 && threatKey(a) === taunt.key) || null;
}
function ironGuardTauntWeakensAttack(m) { return !!_ironGuardTauntState(m); }
function threatCommitDiff(snap, ent) {
    if (!THREAT_ENABLED || !snap || !ent) return;
    if (typeof mapState === 'undefined' || !mapState || !mapState.mobs) return;
    let mult = computeThreatMult(ent);
    if (!(mult > 0)) return;
    let key = threatKey(ent), mobs = mapState.mobs, now = _threatNow();
    for (let i = 0; i < snap.length; i++) {
        if (snap[i] == null) continue;
        let m = mobs[i];
        if (!m || m._dead) continue;
        let lost = snap[i] - Math.max(0, m.curHp || 0);
        if (lost <= 0) continue;
        let amt = lost * mult;
        if (m.boss) amt *= 0.5;
        _threatAdd(m, key, amt, now);
    }
}
function threatWrap(ent, fn) {
    if (!THREAT_ENABLED || typeof _dpsSnap !== 'function') { fn(); return; }
    let snap = _dpsSnap();
    fn();
    threatCommitDiff(snap, ent);
}
function threatHeal(caster, actualAmt) {
    if (!THREAT_ENABLED || !(actualAmt > 0)) return;
    if (typeof mapState === 'undefined' || !mapState || !mapState.mobs) return;
    let alive = mapState.mobs.filter(m => m && !m._dead && (m.curHp || 0) > 0);
    if (!alive.length) return;
    let key = threatKey(caster), per = (actualAmt * 0.5) / alive.length, now = _threatNow();
    for (let m of alive) _threatAdd(m, key, per, now);
}
function victimThreatWeight(m, ent, baseWeight) {
    if (!THREAT_ENABLED || !(baseWeight > 0)) return baseWeight;
    let taunt = _ironGuardTauntState(m);
    if (taunt && taunt.key === threatKey(ent)) return 1000000000;
    return baseWeight * THREAT_K + threatOf(m, threatKey(ent));
}
function stripThreatForSave() {
    if (typeof mapState === 'undefined' || !mapState || !mapState.mobs) return;
    for (let m of mapState.mobs) { if (m) { if (m._threat) delete m._threat; if (m._threatT != null) delete m._threatT; if (m._ironGuardTaunt) delete m._ironGuardTaunt; } }
}

// ============================================================
// 1.49 懷舊世界硬收斂層
// - 四職業：王族 / 騎士 / 法師 / 妖精
// - 創角：取名 + 骰能力值，取消自由配點與經典模式
// - 地圖、怪物、BOSS：只保留早期核心世界；其餘從 DB runtime 真正 delete
// - 後期裝備、魔法、遺物、傲慢、裂痕、拉斯塔巴德等資料從 DB runtime delete
// - 製作 / 收藏 / 傭兵等後期 UI 與入口停用
// ============================================================
(function classic149Overhaul() {
    const CLASSIC149_CLASSES = ['royal', 'knight', 'mage', 'elf'];
    const CLASSIC149_MAP_GROUPS = {
        village: new Set(['town_silver_knight','town_elf','town_talking','town_gludio','town_gludin','town_giran']),
        wild: new Set(['silver_knight','talking_island','talking_island_port','zone_01','elf_forest','gludio','windwood','desert','kent','dragon_valley','fire_dragon','giran']),
        dungeon: new Set(['zone_06','zone_07','zone_08','zone_09','zone_10','zone_11','zone_12','zone_13','zone_14','zone_15','zone_16','zone_17','zone_22','zone_23','zone_24','zone_25','zone_26','zone_27','zone_28','zone_29','zone_30','zone_31','zone_32','zone_33']),
        special: new Set(['training'])
    };
    const CLASSIC149_ALLOWED_MAPS = new Set();
    Object.keys(CLASSIC149_MAP_GROUPS).forEach(k => CLASSIC149_MAP_GROUPS[k].forEach(v => CLASSIC149_ALLOWED_MAPS.add(v)));

    // 約 1.49 風格的骰點區間；不是照搬原作資料表，而是保留早期四職業的典型能力方向。
    const ROLL_PROFILE = {
        royal:  { str:[11,16], dex:[9,15],  con:[10,16], int:[8,13],  wis:[9,15],  cha:[12,18] },
        knight: { str:[14,18], dex:[10,16], con:[14,18], int:[7,11],  wis:[8,13],  cha:[8,12] },
        mage:   { str:[8,13],  dex:[8,14],  con:[8,14],  int:[14,18], wis:[14,18], cha:[8,14] },
        elf:    { str:[10,16], dex:[14,18], con:[10,16], int:[10,16], wis:[11,17], cha:[9,15] }
    };
    let classic149Roll = null;
    let classic149Name = '';

    function rint(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
    function rollStats(cls) {
        let p = ROLL_PROFILE[cls] || ROLL_PROFILE.royal;
        let out = {};
        ['str','dex','con','int','wis','cha'].forEach(s => out[s] = rint(p[s][0], p[s][1]));
        return out;
    }
    function validName(v) {
        v = String(v || '').trim();
        return v.length >= 2 && v.length <= 12 && !/[<>\\/]/.test(v);
    }

    // ----- 原作者「非官方轉載版本」橫幅：停止再掛並移除現存 -----
    function killTransferBanner() {
        try {
            let bar = document.getElementById('_orig_pbar');
            if (bar) bar.remove();
            document.querySelectorAll('body *').forEach(function(el) {
                let txt = (el.textContent || '').trim();
                if (txt.indexOf('非官方轉載版本') !== -1 && txt.indexOf('內容可能不是最新') !== -1) el.remove();
            });
        } catch (_) {}
    }
    try { _origAuthorizedHost = function(){ return true; }; } catch (_) {}
    try { _origEnforce = function(){ killTransferBanner(); }; } catch (_) {}

    // ----- 世界資料硬刪除 -----
    function pruneWorldData() {
        try {
            if (typeof MAP_CATEGORIES !== 'undefined') {
                Object.keys(CLASSIC149_MAP_GROUPS).forEach(function(group) {
                    if (Array.isArray(MAP_CATEGORIES[group])) {
                        MAP_CATEGORIES[group] = MAP_CATEGORIES[group].filter(e => e && CLASSIC149_MAP_GROUPS[group].has(e.v));
                    }
                });
                ['tower','rift','pirate_island'].forEach(group => { if (Array.isArray(MAP_CATEGORIES[group])) MAP_CATEGORIES[group].length = 0; });
            }
            if (typeof DB !== 'undefined' && DB.maps) {
                Object.keys(DB.maps).forEach(id => { if (!CLASSIC149_ALLOWED_MAPS.has(id)) delete DB.maps[id]; });
                let keepMobs = new Set();
                Object.keys(DB.maps).forEach(id => (DB.maps[id] || []).forEach(mid => keepMobs.add(mid)));
                if (DB.mobs) Object.keys(DB.mobs).forEach(id => { if (!keepMobs.has(id)) delete DB.mobs[id]; });
            }
        } catch (e) { console.warn('[classic149] pruneWorldData', e); }
    }

    const LATE_WORDS = [
        '拉斯塔巴德','底比斯','提卡爾','日出之國','時空裂痕','傲慢之塔','支配符','傳送符(',
        '希培利亞','貝希摩斯','魔族神殿','暗影神殿','席琳神殿','遺物','軍王','冥皇','真·','真‧',
        '龍騎士','幻術士','戰士專用','黑暗妖精專用','奇古獸','鎖鏈劍','鋼爪','雙刀'
    ];
    function looksLate(obj, id) {
        if (!obj) return false;
        let text = [id, obj.n, obj.d, obj.desc, obj.cat, obj.req, obj.label].filter(Boolean).join(' ');
        if (obj.relic || obj.prideKind || obj.qigu || obj.chainsword) return true;
        if (typeof obj.req === 'string' && /(^|,)(dark|dragon|illusion|warrior)(,|$)/.test(obj.req)) return true;
        if (['dark','dragon','illusion','warrior'].indexOf(obj.cat) !== -1) return true;
        return LATE_WORDS.some(w => text.indexOf(w) !== -1);
    }
    function pruneLateDatabase() {
        try {
            if (typeof DB === 'undefined') return;
            if (DB.items) Object.keys(DB.items).forEach(id => { if (looksLate(DB.items[id], id)) delete DB.items[id]; });
            if (DB.skills) Object.keys(DB.skills).forEach(id => { if (looksLate(DB.skills[id], id)) delete DB.skills[id]; });
            if (DB.sets) Object.keys(DB.sets).forEach(id => {
                let set = DB.sets[id];
                if (!set) return;
                if (looksLate(set, id) || (set.items || []).some(iid => !DB.items[iid])) delete DB.sets[id];
            });
        } catch (e) { console.warn('[classic149] pruneLateDatabase', e); }
    }

    // ----- 後期系統 UI 移除 -----
    function removeLateUi() {
        ['classic-mode-control','btn-collection','collection-panel','equip-book','misc-book','relic-book'].forEach(id => {
            let el = document.getElementById(id); if (el) el.remove();
        });
        ['dark','illusionist','Dknight','warrior'].forEach(cls => {
            let el = document.getElementById('btn-class-base-' + cls); if (el) el.remove();
        });
        document.querySelectorAll('[id*="merc"],[class*="merc"]').forEach(el => {
            if ((el.id || '').indexOf('commercial') === -1) el.remove();
        });
        document.querySelectorAll('button').forEach(btn => {
            let t = (btn.textContent || '').trim();
            if (/收藏|遺物|製作|潘朵拉|傭兵/.test(t)) btn.remove();
        });
    }

    // ----- 創角骰子 UI -----
    function ensureDiceUi() {
        let panel = document.getElementById('creation-panel');
        let stat = document.getElementById('stat-allocation');
        if (!panel || !stat) return;
        stat.querySelectorAll('button').forEach(b => b.remove());
        let pts = document.getElementById('creation-pts');
        if (pts) pts.textContent = '骰點';
        if (document.getElementById('classic149-create-box')) return;

        let box = document.createElement('div');
        box.id = 'classic149-create-box';
        box.style.cssText = 'position:absolute;left:50%;bottom:42px;transform:translateX(-50%);z-index:8;width:330px;padding:12px 14px;border:1px solid #8b6f38;background:rgba(9,12,16,.90);box-shadow:0 4px 20px rgba(0,0,0,.55);color:#e8dfc7;font-family:"Microsoft JhengHei",sans-serif;';
        box.innerHTML = '<div style="font-weight:700;color:#e7c66a;margin-bottom:8px;text-align:center">1.49 懷舊創角</div>' +
            '<div style="display:flex;gap:8px;margin-bottom:8px"><input id="classic149-name" maxlength="12" placeholder="輸入角色名稱" style="flex:1;min-width:0;background:#111827;border:1px solid #6b7280;color:#fff;padding:7px 9px"><button id="classic149-roll" type="button" style="padding:7px 12px;background:#5b4521;border:1px solid #c09a4a;color:#ffe6a0;font-weight:700">🎲 骰能力</button></div>' +
            '<div id="classic149-roll-note" style="font-size:12px;color:#aeb7c5;text-align:center">選擇職業後骰出六項能力，取名後即可開始。</div>';
        panel.appendChild(box);
        let input = document.getElementById('classic149-name');
        let rollBtn = document.getElementById('classic149-roll');
        input.addEventListener('input', function(){ classic149Name = input.value.trim(); renderDiceStats(); });
        rollBtn.addEventListener('click', function(){
            if (!curCreate || !CLASSIC149_CLASSES.includes(curCreate.cls)) return;
            classic149Roll = rollStats(curCreate.cls);
            renderDiceStats();
        });
    }

    function renderDiceStats() {
        if (!classic149Roll && typeof curCreate !== 'undefined' && curCreate && CLASSIC149_CLASSES.includes(curCreate.cls)) classic149Roll = rollStats(curCreate.cls);
        ['str','dex','con','int','wis','cha'].forEach(function(s) {
            let el = document.getElementById('c-' + s);
            if (el) el.innerText = classic149Roll ? classic149Roll[s] : '';
        });
        let btn = document.getElementById('btn-start');
        if (btn) btn.disabled = !(classic149Roll && validName(classic149Name));
        let note = document.getElementById('classic149-roll-note');
        if (note) note.textContent = validName(classic149Name) ? '角色名稱可用；不滿意能力值可繼續擲骰。' : '角色名稱需 2～12 個字元。';
    }

    function sanitizePlayer149() {
        try {
            if (typeof player === 'undefined' || !player) return;
            player.classicMode = false;
            if (Array.isArray(player.allies)) player.allies.length = 0;
            ['mercenaries','mercRoster','mercLedger','relics','relicBook','collection','collections','craft','crafting','mastery'].forEach(k => { if (k in player) delete player[k]; });
            if (player.cls && !CLASSIC149_CLASSES.includes(player.cls)) player.cls = 'knight';
            if (player.inv && typeof DB !== 'undefined' && DB.items) player.inv = player.inv.filter(x => x && DB.items[x.id]);
            if (player.eq && typeof DB !== 'undefined' && DB.items) Object.keys(player.eq).forEach(k => { let x = player.eq[k]; if (x && !DB.items[x.id]) player.eq[k] = null; });
            if (player.skills && typeof DB !== 'undefined' && DB.skills) player.skills = player.skills.filter(id => DB.skills[id]);
        } catch (e) { console.warn('[classic149] sanitizePlayer149', e); }
    }

    function installCreationOverrides() {
        if (typeof window.selectClassBase === 'function' && !window.__classic149SelectWrapped) {
            let original = window.selectClassBase;
            window.selectClassBase = function(base) {
                if (!CLASSIC149_CLASSES.includes(base)) return;
                let r = original.apply(this, arguments);
                classic149Roll = rollStats(base);
                setTimeout(renderDiceStats, 0);
                return r;
            };
            window.__classic149SelectWrapped = true;
        }
        if (typeof window.selectClass === 'function' && !window.__classic149ClassWrapped) {
            let original = window.selectClass;
            window.selectClass = function(raw) {
                let base = String(raw || '').replace(/^m_|^f_/, '');
                if (!CLASSIC149_CLASSES.includes(base)) return;
                let r = original.apply(this, arguments);
                classic149Roll = rollStats(base);
                setTimeout(renderDiceStats, 0);
                return r;
            };
            window.__classic149ClassWrapped = true;
        }
        try { window.adjStat = function(){ return false; }; } catch (_) {}
        try { window.onToggleClassic = function(){ return false; }; } catch (_) {}
        if (typeof window.updateCreateUI === 'function') {
            window.updateCreateUI = function(){ ensureDiceUi(); renderDiceStats(); };
        }
        if (typeof window.startGame === 'function' && !window.__classic149StartWrapped) {
            let originalStart = window.startGame;
            window.startGame = function() {
                if (!classic149Roll) { alert('請先擲骰決定角色能力值。'); return; }
                let input = document.getElementById('classic149-name');
                classic149Name = (input ? input.value : classic149Name || '').trim();
                if (!validName(classic149Name)) { alert('請輸入 2～12 個字元的角色名稱。'); return; }
                if (!curCreate || !CLASSIC149_CLASSES.includes(curCreate.cls) || !createBase[curCreate.cls]) return;
                let b = createBase[curCreate.cls];
                ['str','dex','con','int','wis','cha'].forEach(s => { curCreate[s] = classic149Roll[s] - Number(b[s] || 0); });
                let result = originalStart.apply(this, arguments);
                try {
                    if (typeof player !== 'undefined' && player) {
                        player.name = classic149Name;
                        player.classicMode = false;
                        sanitizePlayer149();
                        if (typeof saveGame === 'function') saveGame();
                        if (typeof renderAll === 'function') renderAll();
                    }
                } catch (e) { console.warn('[classic149] post-create save', e); }
                return result;
            };
            window.__classic149StartWrapped = true;
        }
    }

    function brand149() {
        document.title = '放置天堂 - 1.49 懷舊世界';
        let h = document.querySelector('#login-title-layer h1'); if (h) h.textContent = '放置天堂 - 1.49 懷舊世界';
        let p = document.querySelector('#login-title-layer p'); if (p) p.textContent = '四職業・骰點創角・早期世界';
        let disclaimer = document.getElementById('login-disclaimer'); if (disclaimer) disclaimer.remove();
    }

    function boot149() {
        pruneWorldData();
        pruneLateDatabase();
        brand149();
        removeLateUi();
        ensureDiceUi();
        installCreationOverrides();
        killTransferBanner();
        sanitizePlayer149();
        if (typeof curCreate !== 'undefined' && curCreate && CLASSIC149_CLASSES.includes(curCreate.cls)) {
            classic149Roll = rollStats(curCreate.cls);
            renderDiceStats();
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot149, { once:true });
    else boot149();

    // 原程式 gameLoop 會嘗試重掛來源橫幅；低頻守門同時防舊存檔把已刪後期狀態帶回。
    setInterval(function(){ killTransferBanner(); removeLateUi(); sanitizePlayer149(); }, 2000);
})();
