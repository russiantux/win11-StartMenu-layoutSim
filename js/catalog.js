/**
 * Built-in catalog of common Windows 11 applications.
 * Exports an array sorted by display name.
 */

/** @type {import('./state.js').AppEntry[]} */
export const catalog = [
  { uid: "cat_edge",          name: "Microsoft Edge",           kind: "desktopAppLink",  value: "%ALLUSERSPROFILE%\\Microsoft\\Windows\\Start Menu\\Programs\\Microsoft Edge.lnk",   icon: "edge" },
  { uid: "cat_fileexplorer",  name: "File Explorer",            kind: "desktopAppId",    value: "Microsoft.Windows.Explorer",                                                 icon: "folder" },
  { uid: "cat_settings",      name: "Settings",                 kind: "packagedAppId", value: "windows.immersivecontrolpanel_cw5n1h2txyewy!microsoft.windows.immersivecontrolpanel",                    icon: "settings" },
  { uid: "cat_store",         name: "Microsoft Store",          kind: "packagedAppId", value: "Microsoft.WindowsStore_8wekyb3d8bbwe!App",                                         icon: "store" },
  { uid: "cat_notepad",       name: "Notepad",                  kind: "packagedAppId", value: "Microsoft.WindowsNotepad_8wekyb3d8bbwe!App",                                       icon: "notepad" },
  { uid: "cat_calculator",    name: "Calculator",               kind: "packagedAppId", value: "Microsoft.WindowsCalculator_8wekyb3d8bbwe!App",                                    icon: "calculator" },
  { uid: "cat_paint",         name: "Paint",                    kind: "packagedAppId", value: "Microsoft.Paint_8wekyb3d8bbwe!App",                                                icon: "paint" },
  { uid: "cat_photos",        name: "Photos",                   kind: "packagedAppId", value: "Microsoft.Windows.Photos_8wekyb3d8bbwe!App",                                     icon: "photos" },
  { uid: "cat_terminal",      name: "Windows Terminal",         kind: "packagedAppId", value: "Microsoft.WindowsTerminal_8wekyb3d8bbwe!App",                                    icon: "terminal" },
  { uid: "cat_outlook",       name: "Outlook (new)",            kind: "packagedAppId", value: "Microsoft.OutlookForWindows_8wekyb3d8bbwe!Microsoft.OutlookforWindows",      icon: "outlook" },
  { uid: "cat_word",          name: "Word",                     kind: "desktopAppLink",  value: "%ALLUSERSPROFILE%\\Microsoft\\Windows\\Start Menu\\Programs\\Word.lnk",            icon: "word" },
  { uid: "cat_excel",         name: "Excel",                    kind: "desktopAppLink",  value: "%ALLUSERSPROFILE%\\Microsoft\\Windows\\Start Menu\\Programs\\Excel.lnk",           icon: "excel" },
  { uid: "cat_powerpoint",    name: "PowerPoint",               kind: "desktopAppLink",  value: "%ALLUSERSPROFILE%\\Microsoft\\Windows\\Start Menu\\Programs\\PowerPoint.lnk",      icon: "powerpoint" },
  { uid: "cat_teams",         name: "Teams",                    kind: "packagedAppId", value: "MSTeams_8wekyb3d8bbwe!MSTeams",                                                icon: "teams" },
  { uid: "cat_snippingtool",  name: "Snipping Tool",            kind: "packagedAppId", value: "Microsoft.ScreenSketch_8wekyb3d8bbwe!App",                                       icon: "snipping" },
  { uid: "cat_clock",         name: "Clock",                    kind: "packagedAppId", value: "Microsoft.WindowsAlarms_8wekyb3d8bbwe!App",                                      icon: "clock" },
  { uid: "cat_calendar",      name: "Calendar",                 kind: "packagedAppId", value: "microsoft.windowscommunicationsapps_8wekyb3d8bbwe!microsoft.windowslive.calendar", icon: "calendar" },
  { uid: "cat_camera",        name: "Camera",                   kind: "packagedAppId", value: "Microsoft.WindowsCamera_8wekyb3d8bbwe!App",                                      icon: "camera" },
  { uid: "cat_copilot",       name: "Copilot",                  kind: "packagedAppId", value: "Microsoft.Copilot_8wekyb3d8bbwe!App",                                            icon: "copilot" },
  { uid: "cat_controlpanel",  name: "Control Panel",            kind: "desktopAppId",    value: "Microsoft.Windows.ControlPanel",                                               icon: "controlpanel" },
];

/** Sort catalog by name for the side panel. */
export function sortedCatalog() {
  return [...catalog].sort((a, b) => a.name.localeCompare(b.name));
}

/** Look up one catalog entry by its catalog uid. */
export function findCatalogEntry(uid) {
  return catalog.find((c) => c.uid === uid);
}

/** Approximate Windows 11 default Start pins (varies by edition and region). */
export const DEFAULT_PIN_UIDS = [
  "cat_edge", "cat_word", "cat_excel", "cat_powerpoint", "cat_outlook",
  "cat_copilot", "cat_store", "cat_photos", "cat_settings", "cat_calculator",
  "cat_clock", "cat_notepad", "cat_paint", "cat_fileexplorer", "cat_snippingtool",
  "cat_teams",
];
/** Approximate Windows 11 default taskbar pins. */
export const DEFAULT_TASKBAR_UIDS = ["cat_fileexplorer", "cat_edge", "cat_store"];

/** Catalog entries for a list of uids (copies, in the given order). */
export function entriesFor(uids) {
  return uids.map((u) => catalog.find((c) => c.uid === u)).filter(Boolean).map((c) => ({ ...c }));
}
