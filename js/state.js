/**
 * State management for the Start menu layout.
 * Handles loading/saving to localStorage (with graceful fallback).
 */

const STORAGE_KEY = "win11-startmenu-layout";

/** Default empty layout. */
function defaultLayout() {
  return { pinned: [], customApps: [] };
}

/**
 * Load layout from localStorage.
 * Returns the parsed layout or a fresh empty one.
 */
function loadLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.pinned)) {
        return { pinned: parsed.pinned, customApps: Array.isArray(parsed.customApps) ? parsed.customApps : [] };
      }
    }
  } catch {
    // localStorage unavailable or corrupted data — use defaults
  }
  return defaultLayout();
}

/** @type {{ pinned: import('./catalog.js').AppEntry[], customApps: import('./state.js').CustomPin[] }} */
let layout = loadLayout();

/** Subscribers notified after every save. */
const _listeners = [];

/**
 * Subscribe a function to be called whenever saveLayout() completes.
 * @param {() => void} fn - Callback with no arguments.
 */
export function onChange(fn) {
  _listeners.push(fn);
}

/**
 * Save the current layout to localStorage.
 * Calls all onChange listeners afterwards.
 * Silently fails if storage is full or unavailable.
 */
export function saveLayout() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Storage full or private browsing — silently ignore
  }
  for (const fn of _listeners) {
    try { fn(); } catch { /* ignore individual listener errors */ }
  }
}

/** Get the current layout (pinned + customApps arrays). */
export function getLayout() {
  return layout;
}

/** Get the custom apps array. */
export function getCustomApps() {
  return layout.customApps;
}

/** Replace the entire pinned array and persist. */
export function setPinned(pinned) {
  layout.pinned = pinned;
  saveLayout();
}

/**
 * Check whether two pins are equivalent (same kind, value equal ignoring case).
 * @param {{kind?: string, value?: string}} a
 * @param {{kind?: string, value?: string}} b
 * @returns {boolean}
 */
export function samePin(a, b) {
  return a.kind === b.kind && String(a.value).toLowerCase() === String(b.value).toLowerCase();
}

/**
 * Check whether an app entry is already pinned (in either pinned or customApps).
 * @param {{kind: string, value: string}} app
 * @returns {boolean}
 */
export function isPinned(app) {
  if (layout.pinned.some((p) => samePin(p, app))) return true;
  return false;
}

/** Add a batch of custom apps, deduplicating by samePin. Returns count added. */
export function addCustomApps(apps) {
  if (!Array.isArray(apps)) return 0;
  let added = 0;
  for (const app of apps) {
    if (!app || !app.kind || !app.value) continue;
    // Skip if already in customApps
    if (layout.customApps && layout.customApps.some((c) => samePin(c, app))) continue;
    layout.customApps.push(app);
    added++;
  }
  saveLayout();
  return added;
}

/** Add an app entry to the pinned list (unique by samePin comparison). */
export function addPinned(entry) {
  // Skip if already pinned (samePin comparison, not uid)
  if (isPinned(entry)) return false;
  layout.pinned.push(entry);
  saveLayout();
  return true;
}

/** Remove a pinned item by uid and persist. */
export function removePinned(uid) {
  layout.pinned = layout.pinned.filter((p) => p.uid !== uid);
  saveLayout();
}

/** Reorder the pinned list and persist. */
export function reorderPinned(newOrder) {
  layout.pinned = newOrder;
  saveLayout();
}
