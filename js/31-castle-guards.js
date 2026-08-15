// ============================================================
// MMO2 1.49 世界邊界 + 即時多人載入器
// 1.49 世界最後區域：龍之谷。威頓及其後全部移除。
// 原後期城堡護衛系統在 1.49 世界停用。
// ============================================================
(function classic149DragonValleyBoundary(){
  'use strict';
  const allowed = new Set([
    'town_silver_knight','town_elf','town_talking','town_gludio','town_gludin',
    'training','silver_knight','talking_island','talking_island_port','zone_01','elf_forest',
    'gludio','windwood','desert','kent','dragon_valley',
    'zone_06','zone_07','zone_08','zone_09','zone_10','zone_11','zone_12','zone_13','zone_14',
    'zone_15','zone_16','zone_17','zone_22','zone_23','zone_24','zone_25','zone_26','zone_27','zone_28','zone_29','zone_30','zone_31','zone_32','zone_33'
  ]);

  function prune(){
    try {
      if (typeof DB !== 'undefined' && DB.maps) {
        Object.keys(DB.maps).forEach(id => { if (!allowed.has(id)) delete DB.maps[id]; });
      }
      if (typeof MAP_CATEGORIES !== 'undefined') {
        Object.keys(MAP_CATEGORIES).forEach(group => {
          if (!Array.isArray(MAP_CATEGORIES[group])) return;
          MAP_CATEGORIES[group] = MAP_CATEGORIES[group].filter(e => e && allowed.has(e.v));
        });
      }
      // 所有地圖選單若仍殘留已刪區域，直接移除 DOM 選項。
      document.querySelectorAll('[data-map],option').forEach(el => {
        let id = el.dataset ? el.dataset.map : null;
        if (!id && el.tagName === 'OPTION') id = el.value;
        if (id && /^(town_|zone_|[a-z_]+)$/.test(id) && !allowed.has(id) && (typeof DB === 'undefined' || !DB.maps || !DB.maps[id])) {
          el.remove();
        }
      });
    } catch (e) { console.warn('[1.49] map boundary', e); }
  }

  function loadRealtime(){
    if (document.querySelector('script[data-mmo149-realtime]')) return;
    const s = document.createElement('script');
    s.src = 'js/33-realtime.js?v=classic149-realtime';
    s.async = false;
    s.dataset.mmo149Realtime = '1';
    document.head.appendChild(s);
  }

  prune();
  loadRealtime();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prune, {once:true});
  // 32-threat.js 在本檔後載入，故再做一次收斂，確保較寬的舊白名單無法把 UI 留回來。
  setTimeout(prune, 0);
  setTimeout(prune, 500);
})();
