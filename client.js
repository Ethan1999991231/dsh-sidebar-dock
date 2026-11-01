/**
 * dsh-sidebar-dock · Client half
 *
 * Detaches the session / workspace tree (`sidebar.workspaces`, the block that
 * lists "E:\… / 内存优化器 / 默认工作区" and every session under them) from the
 * left lane and re-anchors it to the left, right, top or bottom edge. The plugin
 * rail, the brand row and the settings button stay where the Host put them, and
 * the left lane collapses to a narrow rail so the empty gutter is not wasted.
 *
 * Why a stylesheet: the Host AppFrame owns the three-column grid and exposes no
 * service for moving a lane or a block inside it, so the dock is expressed as a
 * package-owned <style> keyed on one attribute of `document.documentElement`.
 * The `left` dock contains no rules at all, so the plugin is inert until the
 * user picks another edge, and teardown removes the attribute, the stylesheet,
 * the data-* markers and the measured custom properties.
 *
 * Geometry: the tree is taken out of flow (`position: fixed`) and the centre
 * lane reserves the freed strip with padding, so the conversation is never
 * covered. `--dssb-pull` (left lane width minus rail) and `--dssb-right-rail`
 * are measured from the Host's own grid tracks on every resize, because those
 * widths are user-draggable and must never be hard-coded.
 */

window.__ModuleLoader__.load({
  id: '@local/dsh-sidebar-dock',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'dsh-sidebar-dock';
    const STORAGE_KEY = 'dsh-sidebar-dock/position';
    const PEEK_KEY = 'dsh-sidebar-dock/peek';
    const RAIL_KEY = 'dsh-sidebar-dock/rail';
    const ZONE_KEY = 'dsh-sidebar-dock/zone';
    const STYLE_ID = 'dsh-sidebar-dock-style';
    const POSITIONS = ['left', 'right', 'top', 'bottom'];
    // 'full' keeps the Host's own sidebar width (null = no max-width at all).
    const RAIL_MODES = { full: null, mid: 176, tight: 112 };
    const RAILS = ['full', 'mid', 'tight'];
    const DEFAULT_RAIL = 'full';
    // How far from the docked edge the pointer starts revealing the panel.
    const ZONE_MODES = { narrow: 32, normal: 64, wide: 104, huge: 160 };
    const ZONES = ['narrow', 'normal', 'wide', 'huge'];
    const DEFAULT_ZONE = 'normal';
    const PEEK_OPEN_DELAY = 100;
    const PEEK_CLOSE_DELAY = 420;
    const DEFAULT_POSITION = 'left';
    const RAIL_WIDTH = 112;
    const BRAND = '[dsh-sidebar-dock]';

    const ZH = {
      position: {
        title: '工作区列表停靠位置',
        desc: '把「工作区 / 会话记录」这一块挪到别的边，插件图标条仍留在左侧。',
        hint: '非左侧停靠时左侧收成窄图标栏，分栏拖拽手柄暂时隐藏；改回「左侧」即恢复原样。',
        locked: '侧边栏当前是收起的，先把它展开，再切回你要的那一侧。',
        peek: '自动收纳',
        peekOn: '鼠标贴到那条边自动展开，移开自动收起，平时只留一条细线。',
        peekOff: '一直显示，会一直占着那块空间。',
        zone: '触发范围',
        zoneNarrow: '窄',
        zoneNormal: '标准',
        zoneWide: '宽',
        zoneHuge: '很大',
        rail: '左栏宽度',
        railFull: '原始',
        railMid: '适中',
        railTight: '紧凑',
        left: '左侧',
        right: '右侧',
        top: '上侧',
        bottom: '下侧',
      },
    };

    const EN = {
      position: {
        title: 'Workspace list dock',
        desc: 'Move the workspace / session list to another edge; the plugin rail stays on the left.',
        hint: 'Away from the left the rail narrows and the host resize handle is hidden; pick "Left" to restore.',
        locked: 'The sidebar is collapsed right now — expand it, then pick the edge again.',
        peek: 'Auto-hide',
        peekOn: 'Collapsed to a thin line; hover near that edge to reveal it.',
        peekOff: 'Always visible — it keeps occupying that edge.',
        zone: 'Reveal zone',
        zoneNarrow: 'Narrow',
        zoneNormal: 'Normal',
        zoneWide: 'Wide',
        zoneHuge: 'Huge',
        rail: 'Rail width',
        railFull: 'Original',
        railMid: 'Medium',
        railTight: 'Compact',
        left: 'Left',
        right: 'Right',
        top: 'Top',
        bottom: 'Bottom',
      },
    };

    // The dictionaries above mirror locale/*.json, so a key is a dotted path
    // ("position.title") rather than a flat literal — resolve it by walking.
    const readPath = (dict, key) => {
      let node = dict;
      for (const part of String(key).split('.')) {
        if (!node || typeof node !== 'object') return undefined;
        node = node[part];
      }
      return typeof node === 'string' ? node : undefined;
    };
    const localText = (key) => readPath(ZH, key) || readPath(EN, key);

    /* dssb:css-start */
    const CSS = `
/* ---------- shared: docked away from the left edge ---------- */
/* The rail keeps the Host's own width unless a narrower mode is picked, so the
   plugin list stays usable after the tree moves away. */
html[data-dssb-pos="right"] [data-dssb-frame] > [data-dssb-sidebar],
html[data-dssb-pos="top"] [data-dssb-frame] > [data-dssb-sidebar],
html[data-dssb-pos="bottom"] [data-dssb-frame] > [data-dssb-sidebar] {
  max-width: var(--dssb-rail-width, none) !important;
  overflow: hidden !important;
}

/* The centre lane slides over the track the rail no longer fills, so no empty
   gutter is left between the rail and the conversation. */
html[data-dssb-pos="right"] [data-dssb-frame] > [data-dssb-center],
html[data-dssb-pos="top"] [data-dssb-frame] > [data-dssb-center],
html[data-dssb-pos="bottom"] [data-dssb-frame] > [data-dssb-center] {
  margin-left: calc(-1 * var(--dssb-pull, 0px)) !important;
}

/* The host drag handle carries a pixel 'left' computed for the full lane, so it
   would float over the conversation once the lane narrows. */
html[data-dssb-pos="right"] [data-dssb-frame] > [data-side="sidebar"],
html[data-dssb-pos="top"] [data-dssb-frame] > [data-side="sidebar"],
html[data-dssb-pos="bottom"] [data-dssb-frame] > [data-side="sidebar"] {
  display: none !important;
}

/* The host hides the region container with display:none whenever the sidebar
   is collapsed, which would take the detached tree down with it — and a hidden
   ancestor wins over anything set on the tree itself. */
html[data-dssb-pos="right"] *:has(> [data-dssb-tree]),
html[data-dssb-pos="top"] *:has(> [data-dssb-tree]),
html[data-dssb-pos="bottom"] *:has(> [data-dssb-tree]) {
  display: block !important;
  flex: 0 0 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  overflow: visible !important;
}

/* ---------- the detached tree ---------- */
html[data-dssb-pos="right"] [data-dssb-tree],
html[data-dssb-pos="top"] [data-dssb-tree],
html[data-dssb-pos="bottom"] [data-dssb-tree] {
  position: fixed !important;
  z-index: 30;
  display: flex !important;
  flex-direction: column;
  flex: none !important;
  box-sizing: border-box;
  margin: 0 !important;
  padding: 8px 12px 12px;
  overflow: hidden auto;
  background-color: var(--dsw-alias-bg-base, #1b1b1f);
  background-image: linear-gradient(
    var(--dsw-alias-bg-layer-1, #242429),
    var(--dsw-alias-bg-layer-1, #242429)
  );
  backdrop-filter: blur(18px) saturate(1.15);
  -webkit-backdrop-filter: blur(18px) saturate(1.15);
  box-shadow: 0 0 0 0.5px var(--dsw-alias-border-l2), 0 10px 30px rgba(0, 0, 0, .26);
}
html[data-dssb-pos="right"] [data-dssb-tree],
html[data-dssb-pos="top"] [data-dssb-tree],
html[data-dssb-pos="bottom"] [data-dssb-tree] {
  min-width: 0;
  min-height: 0;
}

/* ---------- collapse to a thin edge line, reveal while the pointer is there ----------
   --dssb-panel-live is the only thickness the layout reads, so closing the panel
   gives the space back to the conversation instead of leaving an empty band. */
html[data-dssb-pos="right"],
html[data-dssb-pos="top"],
html[data-dssb-pos="bottom"] {
  --dssb-panel-live: var(--dssb-panel-size, 300px);
}
html[data-dssb-peek="closed"][data-dssb-pos="right"],
html[data-dssb-peek="closed"][data-dssb-pos="top"],
html[data-dssb-peek="closed"][data-dssb-pos="bottom"] {
  --dssb-panel-live: var(--dssb-edge, 5px);
}
html[data-dssb-pos="right"] [data-dssb-tree],
html[data-dssb-pos="top"] [data-dssb-tree],
html[data-dssb-pos="bottom"] [data-dssb-tree] {
  transition: width .18s ease, height .18s ease;
}
html[data-dssb-pos="right"] [data-dssb-frame] > [data-dssb-center],
html[data-dssb-pos="top"] [data-dssb-frame] > [data-dssb-center],
html[data-dssb-pos="bottom"] [data-dssb-frame] > [data-dssb-center] {
  transition: padding .18s ease;
}
html[data-dssb-peek="closed"] [data-dssb-tree] {
  pointer-events: none;
  cursor: default;
  /* box-sizing is border-box, so padding alone would keep the collapsed box at
     20px tall and the height would silently become the padding — drop both. */
  padding: 0 !important;
}
html[data-dssb-peek="closed"] [data-dssb-tree] > * {
  visibility: hidden;
}

/* ---------- right: a full-height strip on the right edge ---------- */
html[data-dssb-pos="right"] [data-dssb-tree] {
  top: var(--dsh-windows-titlebar-height, 0px);
  bottom: 0;
  right: var(--dssb-right-rail, 0px);
  left: auto;
  width: var(--dssb-panel-live);
  border-left: 0.5px solid var(--dsw-alias-border-l2);
}
html[data-dssb-pos="right"] [data-dssb-frame] > [data-dssb-center] {
  padding-right: calc(var(--dssb-panel-live) + var(--dssb-right-rail, 0px)) !important;
}

/* ---------- top: a band above the conversation, rail keeps its full height ---------- */
html[data-dssb-pos="top"] [data-dssb-tree] {
  top: var(--dsh-windows-titlebar-height, 0px);
  bottom: auto;
  right: var(--dssb-right-rail, 0px);
  left: var(--dssb-rail, 112px);
  width: auto;
  height: var(--dssb-panel-live);
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
}
html[data-dssb-pos="top"] [data-dssb-frame] > [data-dssb-center] {
  padding-top: var(--dssb-panel-live) !important;
}

/* ---------- bottom: a band below the conversation, rail keeps its full height ---------- */
html[data-dssb-pos="bottom"] [data-dssb-tree] {
  top: auto;
  bottom: 0;
  right: var(--dssb-right-rail, 0px);
  left: var(--dssb-rail, 112px);
  width: auto;
  height: var(--dssb-panel-live);
  border-top: 0.5px solid var(--dsw-alias-border-l2);
}
html[data-dssb-pos="bottom"] [data-dssb-frame] > [data-dssb-center] {
  padding-bottom: var(--dssb-panel-live) !important;
}

/* ---------- one row in Settings → General ---------- */
.dssb-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
}
.dssb-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dssb-controls {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
.dssb-grp { display: inline-flex; align-items: center; gap: 8px; }
.dssb-grpLabel { font-size: 11px; line-height: 15px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }
.dssb-toggle {
  appearance: none;
  margin: 0;
  border: 0.5px solid var(--dsw-alias-border-l1);
  padding: 5px 10px;
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color .12s ease, color .12s ease;
}
.dssb-toggle:hover { color: var(--dsw-alias-label-primary); }
.dssb-toggle.is-on {
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);
  color: var(--dsw-alias-label-primary);
}
.dssb-toggle:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dssb-title { font-size: 13px; line-height: 18px; color: var(--dsw-alias-label-primary); }
.dssb-desc { font-size: 12px; line-height: 16px; color: var(--dsw-alias-label-secondary); }
.dssb-hint { font-size: 11px; line-height: 15px; color: var(--dsw-alias-label-secondary); opacity: .85; }
.dssb-seg {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 2px;
  padding: 2px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2);
}
.dssb-btn {
  appearance: none;
  margin: 0;
  border: 0;
  padding: 5px 10px;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  line-height: 16px;
  cursor: pointer;
  transition: background-color .12s ease, color .12s ease;
}
.dssb-btn:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-1); }
.dssb-btn.is-active {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, transparent);
  color: var(--dsw-alias-label-primary);
  box-shadow: inset 0 0 0 0.5px color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, transparent);
}
.dssb-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
`;
    /* dssb:css-end */

    // ------------------------------------------------------------------ state
    const listeners = new Set();
    let position = DEFAULT_POSITION;
    let idle = false;
    let syncing = false;
    let lastExpandAt = 0;
    let peek = true;
    let rail = DEFAULT_RAIL;
    let zone = DEFAULT_ZONE;
    let peekOpen = true;
    let peekTimer = 0;
    let peekOpenTimer = 0;
    let peekQueued = false;
    let pointer = null;
    let layoutService = null;
    let translate = (key) => localText(key) || key;
    let subscribeLocale = null;

    function readStored() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw && POSITIONS.indexOf(raw) !== -1) return raw;
      } catch (err) {
        /* storage may be unavailable; the default dock still applies */
      }
      return DEFAULT_POSITION;
    }

    function readPeek() {
      try {
        if (window.localStorage.getItem(PEEK_KEY) === '0') return false;
      } catch (err) {
        /* fall through to the default */
      }
      return true;
    }

    function readRail() {
      try {
        const raw = window.localStorage.getItem(RAIL_KEY);
        if (raw && RAILS.indexOf(raw) !== -1) return raw;
      } catch (err) {
        /* fall through to the default */
      }
      return DEFAULT_RAIL;
    }

    function readZone() {
      try {
        const raw = window.localStorage.getItem(ZONE_KEY);
        if (raw && ZONES.indexOf(raw) !== -1) return raw;
      } catch (err) {
        /* fall through to the default */
      }
      return DEFAULT_ZONE;
    }

    function zonePx() {
      return ZONE_MODES[zone] || ZONE_MODES[DEFAULT_ZONE];
    }

    // ------------------------------------------------------- pointer reveal
    // The docked panel is collapsed to a thin line. Only a band along the docked
    // edge starts the reveal (width is a setting, plus a short dwell so a
    // fly-through does not trigger it); once open, the panel's own rectangle
    // keeps it open.

    function activeDock() {
      return position !== 'left' && !idle;
    }

    function cssPx(name, fallback) {
      const raw = parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue(name));
      return Number.isFinite(raw) ? raw : fallback;
    }

    function railPx() {
      const fixed = RAIL_MODES[rail];
      return typeof fixed === 'number' ? fixed : cssPx('--dssb-rail', RAIL_WIDTH);
    }

    /** The band along the docked edge that reveals the panel. */
    function inStrip(x, y) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const topInset = cssPx('--dsh-windows-titlebar-height', 0);
      const rightRail = cssPx('--dssb-right-rail', 0);
      const from = railPx();
      const reach = zonePx();
      if (position === 'right') {
        return x >= width - reach && y >= topInset;
      }
      if (position === 'top') {
        return y >= topInset && y <= topInset + reach && x >= from && x <= width - rightRail;
      }
      if (position === 'bottom') {
        return y <= height && y >= height - reach && x >= from && x <= width - rightRail;
      }
      return false;
    }

    /** Whether the pointer is over the open panel itself. */
    function inPanel(x, y) {
      const tree = tagged && tagged.tree;
      if (!tree) return false;
      const box = tree.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) return false;
      return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
    }

    function setPeekOpen(next) {
      if (peekOpen === next) return;
      peekOpen = next;
      if (activeDock()) {
        document.documentElement.setAttribute('data-dssb-peek', next ? 'open' : 'closed');
      }
    }

    function clearTimers() {
      if (peekTimer) {
        window.clearTimeout(peekTimer);
        peekTimer = 0;
      }
      if (peekOpenTimer) {
        window.clearTimeout(peekOpenTimer);
        peekOpenTimer = 0;
      }
    }

    function handlePointer(x, y) {
      if (!activeDock() || !peek) return;
      const wants = inStrip(x, y) || (peekOpen && inPanel(x, y));
      if (wants) {
        if (peekTimer) {
          window.clearTimeout(peekTimer);
          peekTimer = 0;
        }
        if (peekOpen || peekOpenTimer) return;
        peekOpenTimer = window.setTimeout(() => {
          peekOpenTimer = 0;
          setPeekOpen(true);
        }, PEEK_OPEN_DELAY);
        return;
      }
      if (peekOpenTimer) {
        window.clearTimeout(peekOpenTimer);
        peekOpenTimer = 0;
      }
      if (!peekOpen || peekTimer) return;
      peekTimer = window.setTimeout(() => {
        peekTimer = 0;
        setPeekOpen(false);
      }, PEEK_CLOSE_DELAY);
    }

    function onPointerMove(event) {
      pointer = { x: event.clientX, y: event.clientY };
      if (peekQueued) return;
      peekQueued = true;
      window.requestAnimationFrame(() => {
        peekQueued = false;
        if (pointer) handlePointer(pointer.x, pointer.y);
      });
    }

    function onPointerLeave() {
      clearTimers();
      if (peek) setPeekOpen(false);
    }

    function setPeek(next) {
      if (peek === next) return;
      peek = next;
      try {
        window.localStorage.setItem(PEEK_KEY, next ? '1' : '0');
      } catch (err) {
        console.error(BRAND, 'could not persist the auto-hide flag', err);
      }
      if (!next) setPeekOpen(true);
      writeAttribute();
      emit();
    }

    function setRail(next) {
      const value = RAILS.indexOf(next) === -1 ? DEFAULT_RAIL : next;
      if (value === rail) return;
      rail = value;
      try {
        window.localStorage.setItem(RAIL_KEY, value);
      } catch (err) {
        console.error(BRAND, 'could not persist the rail width', err);
      }
      writeAttribute();
      emit();
    }

    function setZone(next) {
      const value = ZONES.indexOf(next) === -1 ? DEFAULT_ZONE : next;
      if (value === zone) return;
      zone = value;
      try {
        window.localStorage.setItem(ZONE_KEY, value);
      } catch (err) {
        console.error(BRAND, 'could not persist the reveal zone', err);
      }
      writeAttribute();
      emit();
    }

    function emit() {
      for (const fn of Array.from(listeners)) {
        try {
          fn();
        } catch (err) {
          console.error(BRAND, 'listener failed', err);
        }
      }
    }

    function subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }

    // ------------------------------------------------------------ frame marks
    let tagged = null;

    function locate() {
      const bottom = document.querySelector('[data-shell-bottom]');
      const frame = bottom ? bottom.parentElement : null;
      if (!frame) return null;
      const kids = Array.prototype.slice.call(frame.children);
      const index = kids.indexOf(bottom);
      // The frame renders sidebar, center, rightbar and then the bottom row, so
      // the three element siblings before the bottom row are the three lanes.
      if (index < 3) return null;
      return {
        frame,
        sidebar: kids[index - 3],
        center: kids[index - 2],
        rightbar: kids[index - 1],
        bottom,
      };
    }

    /** The `sidebar.workspaces` occupant is wrapped by the renderer in a
     *  `[data-slot="<name>"]` element; older builds may carry the name with a
     *  suffix, so the tag is also matched by substring. As a last resort the
     *  region container is found by its CSS-module suffix (`*_regionArea`), which
     *  survives the per-build hash because only the prefix is hashed. */
    function findTree() {
      const exact = document.querySelector('[data-slot="sidebar.workspaces"]');
      if (exact) return exact;
      const all = document.querySelectorAll('[data-slot]');
      for (const el of all) {
        const name = el.getAttribute('data-slot') || '';
        if (name.indexOf('sidebar.workspaces') !== -1) return el;
      }
      return document.querySelector('[class*="regionArea"]');
    }

    function tagFrame(force) {
      if (!force && tagged && tagged.bottom.isConnected && tagged.bottom.parentElement === tagged.frame) {
        measure(tagged);
        syncIdle();
        return true;
      }
      const parts = locate();
      if (!parts) {
        tagged = null;
        return false;
      }
      parts.frame.setAttribute('data-dssb-frame', '');
      parts.sidebar.setAttribute('data-dssb-sidebar', '');
      parts.center.setAttribute('data-dssb-center', '');
      parts.rightbar.setAttribute('data-dssb-rightbar', '');
      parts.tree = findTree();
      if (parts.tree) parts.tree.setAttribute('data-dssb-tree', '');
      tagged = parts;
      measure(parts);
      syncIdle();
      return true;
    }

    /** The host only renders the workspace rows while the sidebar is `wide`, and
     *  a collapsed lane renders the compact rail variant instead — an empty shell
     *  once the tree is docked elsewhere. The public layout service is asked to
     *  expand it; while the lane still reports collapsed the dock stays off
     *  (`data-dssb-pos="left"`, i.e. the shipped layout) instead of showing an
     *  empty strip. */
    function syncIdle() {
      if (syncing || !tagged) return;
      const collapsed = tagged.frame.hasAttribute('data-sidebar-collapsed');
      const next = position !== 'left' && collapsed;
      if (next) ensureExpanded();
      if (next === idle) return;
      idle = next;
      syncing = true;
      try {
        writeAttribute();
        emit();
      } finally {
        syncing = false;
      }
    }

    function ensureExpanded() {
      if (!layoutService || typeof layoutService.toggleSidebar !== 'function') return;
      if (lastExpandAt !== 0 && Date.now() - lastExpandAt < 1200) return;
      lastExpandAt = Date.now();
      try {
        layoutService.toggleSidebar();
      } catch (err) {
        console.error(BRAND, 'could not expand the sidebar', err);
      }
    }

    function untagFrame() {
      if (!tagged) return;
      const parts = tagged;
      tagged = null;
      parts.frame.removeAttribute('data-dssb-frame');
      parts.sidebar.removeAttribute('data-dssb-sidebar');
      parts.center.removeAttribute('data-dssb-center');
      parts.rightbar.removeAttribute('data-dssb-rightbar');
      if (parts.tree) parts.tree.removeAttribute('data-dssb-tree');
    }

    /** Lane widths are user-draggable, so they are read back from the Host's
     *  own computed tracks instead of being guessed. */
    function measure(parts) {
      if (!parts || position === 'left') return;
      let tracks = [];
      try {
        tracks = String(window.getComputedStyle(parts.frame).gridTemplateColumns || '')
          .split(' ')
          .filter(Boolean);
      } catch (err) {
        return;
      }
      if (tracks.length < 3) return;
      const first = parseFloat(tracks[0]);
      const last = parseFloat(tracks[tracks.length - 1]);
      if (!Number.isFinite(first)) return;
      // 'full' keeps the Host width (no max-width); the compact modes clamp it.
      const fixed = RAIL_MODES[rail];
      const visual = typeof fixed === 'number' ? Math.min(fixed, first) : first;
      const root = document.documentElement;
      root.style.setProperty('--dssb-rail', Math.round(visual) + 'px');
      root.style.setProperty('--dssb-rail-width', typeof fixed === 'number' ? Math.round(visual) + 'px' : 'none');
      root.style.setProperty('--dssb-pull', Math.max(0, Math.round(first - visual)) + 'px');
      root.style.setProperty('--dssb-right-rail', (Number.isFinite(last) ? Math.max(0, Math.round(last)) : 0) + 'px');
    }

    function clearVars() {
      const root = document.documentElement;
      root.style.removeProperty('--dssb-pull');
      root.style.removeProperty('--dssb-rail');
      root.style.removeProperty('--dssb-rail-width');
      root.style.removeProperty('--dssb-right-rail');
    }

    function writeAttribute() {
      const active = activeDock();
      document.documentElement.setAttribute('data-dssb-pos', active ? position : 'left');
      document.documentElement.setAttribute(
        'data-dssb-peek',
        active && peek && !peekOpen ? 'closed' : 'open',
      );
      if (!active) clearVars();
      tagFrame(true);
    }

    function setPosition(next) {
      const value = POSITIONS.indexOf(next) === -1 ? DEFAULT_POSITION : next;
      if (value === position) return;
      position = value;
      idle = false;
      lastExpandAt = 0;
      peekOpen = value === 'left' || !peek;
      try {
        window.localStorage.setItem(STORAGE_KEY, value);
      } catch (err) {
        console.error(BRAND, 'could not persist the dock position', err);
      }
      writeAttribute();
      emit();
    }

    // ------------------------------------------------------------- settings row
    // Copy can arrive from three places: the slot-injected `t`, our own locale
    // namespace, or the dictionary shipped in this file. A namespace the host did
    // not bind returns the key unchanged, so first-one-that-resolves wins and a
    // raw key such as "position.title" can never reach the UI.
    function resolveText(props) {
      const sources = [
        typeof props.t === 'function' ? props.t : null,
        typeof translate === 'function' ? translate : null,
      ];
      return (key) => {
        for (const source of sources) {
          if (!source) continue;
          let value;
          try {
            value = source(key);
          } catch (err) {
            continue;
          }
          if (typeof value === 'string' && value.length > 0 && value !== key) return value;
        }
        return localText(key) || key;
      };
    }

    function DockRow(props) {
      const t = resolveText(props);
      const [, bump] = React.useState(0);
      React.useEffect(() => {
        const offDock = subscribe(() => bump((n) => n + 1));
        const offLocale = typeof subscribeLocale === 'function' ? subscribeLocale(() => bump((n) => n + 1)) : undefined;
        return () => {
          offDock();
          if (typeof offLocale === 'function') offLocale();
        };
      }, []);

      const current = position;
      return h(
        'div',
        { className: 'dssb-row' },
        h(
          'div',
          { className: 'dssb-copy' },
          h('div', { className: 'dssb-title' }, t('position.title')),
          h('div', { className: 'dssb-desc' }, t('position.desc')),
          current === 'left'
            ? null
            : h(
                'div',
                { className: 'dssb-hint' },
                t(idle ? 'position.locked' : peek ? 'position.peekOn' : 'position.peekOff'),
              ),
        ),
        h(
          'div',
          { className: 'dssb-controls' },
          h(
            'div',
            { className: 'dssb-seg', role: 'radiogroup', 'aria-label': t('position.title') },
            POSITIONS.map((value) =>
              h(
                'button',
                {
                  key: value,
                  type: 'button',
                  role: 'radio',
                  'aria-checked': current === value,
                  className: current === value ? 'dssb-btn is-active' : 'dssb-btn',
                  onClick: () => setPosition(value),
                },
                t('position.' + value),
              ),
            ),
          ),
          current === 'left'
            ? null
            : h(
                'div',
                { className: 'dssb-grp' },
                h('span', { className: 'dssb-grpLabel' }, t('position.rail')),
                h(
                  'div',
                  { className: 'dssb-seg', role: 'radiogroup', 'aria-label': t('position.rail') },
                  RAILS.map((value) =>
                    h(
                      'button',
                      {
                        key: value,
                        type: 'button',
                        role: 'radio',
                        'aria-checked': rail === value,
                        className: rail === value ? 'dssb-btn is-active' : 'dssb-btn',
                        onClick: () => setRail(value),
                      },
                      t('position.rail' + value.charAt(0).toUpperCase() + value.slice(1)),
                    ),
                  ),
                ),
              ),
          current === 'left' || !peek
            ? null
            : h(
                'div',
                { className: 'dssb-grp' },
                h('span', { className: 'dssb-grpLabel' }, t('position.zone')),
                h(
                  'div',
                  { className: 'dssb-seg', role: 'radiogroup', 'aria-label': t('position.zone') },
                  ZONES.map((value) =>
                    h(
                      'button',
                      {
                        key: value,
                        type: 'button',
                        role: 'radio',
                        'aria-checked': zone === value,
                        title: (ZONE_MODES[value] || 0) + 'px',
                        className: zone === value ? 'dssb-btn is-active' : 'dssb-btn',
                        onClick: () => setZone(value),
                      },
                      t('position.zone' + value.charAt(0).toUpperCase() + value.slice(1)),
                    ),
                  ),
                ),
              ),
          current === 'left'
            ? null
            : h(
                'button',
                {
                  type: 'button',
                  className: peek ? 'dssb-toggle is-on' : 'dssb-toggle',
                  'aria-pressed': peek,
                  title: t(peek ? 'position.peekOff' : 'position.peekOn'),
                  onClick: () => setPeek(!peek),
                },
                t('position.peek'),
              ),
        ),
      );
    }

    function insertFallbackStyle() {
      const existing = document.getElementById(STYLE_ID);
      if (existing) return () => existing.remove();
      const el = document.createElement('style');
      el.id = STYLE_ID;
      el.textContent = CSS;
      (document.head || document.documentElement).appendChild(el);
      return () => {
        el.remove();
      };
    }

    // ---------------------------------------------------------------- lifecycle
    return {
      inject: ['slots', 'locale', 'layout'],
      apply(ctx) {
        position = readStored();
        peek = readPeek();
        rail = readRail();
        zone = readZone();
        peekOpen = position === 'left' || !peek;
        layoutService = ctx.layout || null;

        // The stylesheet is owned by this plugin and removed again on teardown, so a plain
        // <style> element keyed by STYLE_ID is enough — no `styles` service round-trip.
        ctx.effect(() => insertFallbackStyle(), 'dsh-sidebar-dock: stylesheet');

        if (ctx.locale && typeof ctx.locale.register === 'function') {
          ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'dsh-sidebar-dock: dictionaries');
          if (typeof ctx.locale.bind === 'function') {
            const bound = ctx.locale.bind(NS);
            // A missing dictionary entry comes back as the key itself; fall back to our own
            // copy so the row never renders raw keys.
            translate = (key) => {
              let value;
              try {
                value = bound(key);
              } catch (err) {
                value = undefined;
              }
              if (typeof value === 'string' && value.length > 0 && value !== key) return value;
              return localText(key) || key;
            };
          }
          if (typeof ctx.locale.subscribe === 'function') {
            subscribeLocale = (fn) => ctx.locale.subscribe(fn);
          }
        }

        ctx.effect(() => {
          writeAttribute();

          let queued = false;
          const schedule = () => {
            if (queued) return;
            queued = true;
            const run = () => {
              queued = false;
              tagFrame(false);
            };
            if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
            else setTimeout(run, 16);
          };

          const observer = new MutationObserver(schedule);
          observer.observe(document.body, { childList: true, subtree: true });

          // Lane widths change with the window and with the right panel, and both
          // must be re-measured or the detached strip drifts.
          let ro = null;
          if (typeof ResizeObserver === 'function') {
            ro = new ResizeObserver(schedule);
            ro.observe(document.documentElement);
            const parts = locate();
            if (parts) {
              ro.observe(parts.frame);
              ro.observe(parts.rightbar);
            }
          }
          window.addEventListener('resize', schedule);

          document.addEventListener('pointermove', onPointerMove, { passive: true });
          document.addEventListener('pointerleave', onPointerLeave);
          window.addEventListener('blur', onPointerLeave);

          return () => {
            observer.disconnect();
            if (ro) ro.disconnect();
            window.removeEventListener('resize', schedule);
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerleave', onPointerLeave);
            window.removeEventListener('blur', onPointerLeave);
            if (peekTimer) {
              window.clearTimeout(peekTimer);
              peekTimer = 0;
            }
            document.documentElement.removeAttribute('data-dssb-pos');
            document.documentElement.removeAttribute('data-dssb-peek');
            clearVars();
            untagFrame();
          };
        }, 'dsh-sidebar-dock: frame tagging');

        ctx.slots.inject('settings.general.item', () =>
          ctx.slots.register(
            {
              name: 'settings.general.item',
              id: 'sidebar-dock',
              order: 13,
            },
            DockRow,
          ),
        );
      },
    };
  },
});
