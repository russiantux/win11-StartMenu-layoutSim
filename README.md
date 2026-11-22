# Start Menu Layout Editor

A static web tool that simulates the Windows 11 Start menu so you can arrange pinned apps and export the layout for MDM or Group Policy.

## Features

- Simulated Start menu with a 6 × 3 pin grid (18 pins per page) and page dots.
- Drag-and-drop reorder, plus keyboard reorder (Alt+Arrows) and Delete.
- Right-click menus (or Shift+F10) on tiles, All apps rows and taskbar icons: pin/unpin Start, pin/unpin taskbar, move to front.
- Simulated taskbar with its own pin list and drag reorder.
- "All apps" side panel with search and an Add button per app.
- Built-in catalog of common Windows apps.
- Import from `Get-StartApps` JSON, or from an existing ConfigureStartPins JSON.
- Manual entry for packaged apps, desktop apps (AppID), and `.lnk` paths.
- Export as ConfigureStartPins JSON (pretty or single-line), with an optional `applyOnce` flag.
- Export the taskbar pins as `LayoutModification.xml` (`PinListPlacement="Replace"`).
- Copy and Download buttons. Layout is saved in the browser's localStorage.
- Light and dark themes follow `prefers-color-scheme`.

## Quick start

- Hosted: open <PAGES_URL>.
- Local: from the project root, run

  ```sh
  python3 -m http.server 8000
  ```

  then open http://localhost:8000.

No build step and no npm packages. The app is plain HTML, CSS and ES modules.

## Getting your apps

Browsers cannot list the apps installed on a Windows PC, so the app cannot discover them itself. Run this in PowerShell on the target machine:

```powershell
Get-StartApps | ConvertTo-Json | Set-Clipboard
```

Paste the clipboard into **Add apps › Import your installed apps**. The apps appear in All apps, tagged *Imported*, ready to pin. AppIDs containing `!` are treated as packaged apps (`packagedAppId`), `.lnk` paths as desktop links (`desktopAppLink`), and other IDs as desktop AppIDs (`desktopAppId`).


## Deploying the layout

Use the Export panel to produce each file, then deploy with one of the methods below.

| Output | Deploy with | Setting | Notes |
|---|---|---|---|
| Start pins JSON | Intune custom OMA-URI | `./Device/Vendor/MSFT/Policy/Config/Start/ConfigureStartPins`, data type **String**, value = JSON (single line) | Windows 11 Pro, Enterprise, Education. [Policy CSP](https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-start) |
| Start pins JSON | Group Policy | Computer or User Configuration > Administrative Templates > Start Menu and Taskbar > **Configure Start Pins** = path to the JSON file | [Customize the Start layout](https://learn.microsoft.com/en-us/windows/configuration/start/layout) |
| `applyOnce` in the JSON | Either of the above | `"applyOnce": true` or `false` | Needs **Windows 11 24H2 with KB5062660** or later. Older builds ignore it. |
| Taskbar XML (`LayoutModificationTemplate` with `CustomTaskbarLayoutCollection`) | Intune Settings catalog **Start > Start Layout** (or **Start Layout (User)**), or Intune OMA-URI | Settings catalog: `Start Layout` = content of the XML file. OMA-URI: `./Device/Vendor/MSFT/Policy/Config/Start/StartLayout` (or `./User/...`), data type **String**, value = XML content | Taskbar pins are configured in the same Start Layout policy. [Configure taskbar pinned apps](https://learn.microsoft.com/en-us/windows/configuration/taskbar/pinned-apps) |
| Taskbar XML (same file) | GPO | Computer or User Configuration > Administrative Templates > Start Menu and Taskbar > **Start Layout** = path to the XML file | If the GPO's configuration contains only a taskbar layout, users cannot change the default Start tile layout. [Configure taskbar pinned apps](https://learn.microsoft.com/en-us/windows/configuration/taskbar/pinned-apps) |
| Taskbar XML (image-level alternative) | `LayoutXMLPath` registry value on the image, then generalize and recapture | See [Customize the Windows 11 taskbar](https://learn.microsoft.com/en-us/windows-hardware/customize/desktop/customize-the-windows-11-taskbar) | Not an MDM or GPO setting. Pins are set on the image. |
| Start layout XML (`Export-StartLayout`) | Same Start Layout policy as above | Same as the taskbar XML row | This editor does not produce the Start-only `Export-StartLayout` XML. [Customize the Start layout](https://learn.microsoft.com/en-us/windows/configuration/start/layout) |

Deploying a full Start layout by policy stops users from pinning or unpinning apps. Use `applyOnce` if users should keep changes.

## Limitations

- No Edge site pins (`secondaryTile`). The importer skips them with a warning.
- No folders. Windows 11 users can group pins into folders on the device, but the documented ConfigureStartPins JSON and taskbar XML have no folder construct, so a layout can't ship folders. (The `start:Folder` element belongs to the Windows 10 Start layout XML.)
- App IDs must exist on the target device. A pin for a missing app is blank or absent.
- Some classic apps have different IDs than their names suggest (for example Notepad and File Explorer). Check the AppID on the target device. See [Find the Application User Model ID of an installed app](https://learn.microsoft.com/en-us/windows/configuration/taskbar/pinned-apps).
- Taskbar pins for apps that aren't provisioned for the user don't appear.
- Taskbar pins set by policy are restored at the next policy refresh, even if the user unpins them. Users can unpin them only on Windows 11 24H2 with KB5060829 (or 23H2 with KB5060826) and with `PinGeneration` set; this editor does not write `PinGeneration`.
- The Start-only `Export-StartLayout` XML format is not produced by this tool.
- Test on a VM before rolling out. Check the layout on a clean sign-in.

## Running tests

- `tests/run-all.sh` syntax-checks every module and runs the unit tests (`tests/test-*.mjs`) with macOS JavaScriptCore (`jsc`). It needs macOS.
- `tests/e2e.html` runs browser end-to-end checks. Serve the repo root (`python3 -m http.server 8000`), open http://localhost:8000/tests/e2e.html, and read the PASS/FAIL lines in `#results`.

## Credits

- Glyph icons from [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons), MIT License, Copyright (c) 2020 Microsoft Corporation.

## Trademarks

Windows, Microsoft, Microsoft Store, Edge, Office, Teams and other product names are trademarks of Microsoft Corporation. This project is not affiliated with, endorsed by, or sponsored by Microsoft.
