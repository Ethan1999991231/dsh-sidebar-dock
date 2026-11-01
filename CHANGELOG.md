# Changelog

All notable changes to this plugin. Versions follow the `package.json` `version` field.

## 1.3.0

- **New:** 触发范围 (reveal zone) setting — 窄 32px / 标准 64px / 宽 104px / 很大 160px,
  stored as `dsh-sidebar-dock/zone`. Lets each user tune how forgiving the auto-hide trigger is.
- Reveal band widened to 64px and the dwell shortened to 100ms (previously 26px / 180ms, and 10px / 150ms before that).

## 1.2.0

- **New:** 左栏宽度 (left column width) setting — 原始 (host width, default) / 适中 176px / 紧凑 112px.
  The left column is no longer force-narrowed; it keeps the Host width unless the user asks for a compact rail.
- **New:** auto-hide ("自动收纳") for the docked panel: collapsed to a 5px edge line, revealed on hover.
- Fixed: a collapsed panel measured 21px instead of 5px — `box-sizing: border-box` plus 20px padding
  made the used height the padding sum; the collapsed state now also zeroes padding.
- Fixed: the docked panel was see-through on wallpaper themes (`--dsw-specific-sidebar-fill` is
  translucent). It now paints `--dsw-alias-bg-base` + a `--dsw-alias-bg-layer-1` gradient with a
  backdrop blur.

## 1.1.1

- Fixed: the settings row rendered raw keys (`position.title`). The bundled dictionaries are nested
  while lookups were flat; lookups now walk dot paths and fall back `props.t` → locale namespace →
  bundled dictionary.
- The compact left rail went from 60px to 112px so two- and three-character labels stay readable.

## 1.1.0

- Reworked: dock the **workspace / session list only** (`sidebar.workspaces`) instead of the whole
  left column. The plugin rail, brand row and footer stay where they are.
- The list is rendered detached (`position: fixed`) on the chosen edge and the centre column reserves
  space with padding, so nothing is covered.

## 1.0.0

- Initial release: left / right / top / bottom docking of the left column, a Settings → General row,
  and `localStorage` persistence.

[1.3.0]: https://github.com/OWNER/dsh-sidebar-dock/releases
