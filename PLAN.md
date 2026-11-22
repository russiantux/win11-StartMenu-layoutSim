# Win11 Start Menu Layout Editor — Plan

A static web tool that simulates the Windows 11 Start menu. Users arrange pinned
apps, then export the layout for MDM (Intune, etc.).

## Constraints
- **No build step, no Node.** Plain HTML + CSS + JavaScript ES modules
  (`<script type="module">`). No npm packages, no CDN frameworks.
- Must run from GitHub Pages (static files, relative paths only).
- Local preview: `python3 -m http.server 8000` in the project root.
- No network calls at runtime except optional, user-triggered ones.
- Fonts: system stack `"Segoe UI Variable", "Segoe UI", system-ui, sans-serif`
  (Segoe can't be redistributed).

## Files
```
index.html
css/styles.css        Fluent-like look, light + dark (prefers-color-scheme)
js/main.js            boot, wire UI
js/state.js           layout model, undo-free simple store, save to localStorage
js/catalog.js         built-in list of common Windows apps (name, id type, id)
js/startmenu.js       render the simulated Start menu, drag-and-drop reorder
js/exporters.js       JSON (ConfigureStartPins) + XML exports
js/importers.js       import existing JSON / Get-StartApps output
```

## Data model
```js
// One pinned item
{ uid: "a1", name: "File Explorer",
  kind: "desktopAppLink" | "packagedAppId" | "desktopAppId",
  value: "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\File Explorer.lnk",
  icon: "folder" }          // icon = key into a small built-in SVG/emoji set
// Layout
{ pinned: [item, ...] }      // order = Start menu order, 18 per page (6 cols x 3 rows)
```

## Export formats (verified, see .team/research-formats.md)
- Start JSON: `pinnedList` (required) + optional `applyOnce` (boolean, only
  Win11 24H2 + KB5062660). Per pin exactly one of `packagedAppId`,
  `desktopAppId`, `desktopAppLink` (`secondaryTile` out of scope).
  Outputs: pretty JSON (GPO / LayoutModification.json) and minified one-line
  JSON (Intune OMA-URI, String). UI shows the OMA-URI and the version note.
- Taskbar XML: `LayoutModificationTemplate` with
  `CustomTaskbarLayoutCollection PinListPlacement="Replace"`, `taskbar:UWA
  AppUserModelID` / `taskbar:DesktopApp DesktopApplicationLinkPath`. Warn (not
  block) above 3 pins.
- Optional, user-triggered only: Microsoft Store lookup via the undocumented
  DisplayCatalog endpoint (CORS-open). Must fail gracefully.

### Original draft
- **Start pins JSON** (Win11 `ConfigureStartPins` policy,
  OMA-URI `./Vendor/MSFT/Policy/Config/Start/ConfigureStartPins`):
  `{"pinnedList":[{"packagedAppId":"Microsoft.WindowsStore_8wekyb3d8bbwe!App"},{"desktopAppLink":"%ALLUSERSPROFILE%\\Microsoft\\Windows\\Start Menu\\Programs\\..."}]}`
  Also offer the same JSON minified for pasting into an OMA-URI string.
- **XML**: Win11 uses `LayoutModification.xml` for **taskbar** pins
  (`CustomTaskbarLayoutCollection` / `taskbar:TaskbarPinList`). Optional
  taskbar pin list in the UI, exported as that XML.

## Getting the user's apps (no browser can read installed programs)
1. Built-in catalog of common inbox/popular apps with known IDs.
2. Import: user runs `Get-StartApps | ConvertTo-Json` in PowerShell and pastes
   or uploads the output (Name + AppID). AppIDs containing `!` are packaged
   (`packagedAppId`); others are desktop (`desktopAppId`).
3. Manual entry form (name, kind, value).
4. Import an existing exported layout JSON (`Export-StartLayout`) to edit it.

## Phases
1. Scaffold + model + render Start menu with catalog, add/remove pins.
2. Drag-and-drop reorder, pages, search box filtering the "All apps" picker.
3. Exporters + importers + copy/download buttons.
4. Polish: Fluent styling, dark mode, keyboard access, README, GitHub Pages.
