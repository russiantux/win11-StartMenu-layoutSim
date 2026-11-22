/**
 * State management for the Start menu layout.
 * Handles loading/saving to localStorage (with graceful fallback).
 */

const STORAGE_KEY = "win11-startmenu-layout";

/** Default empty layout. */
function defaultLayout() {
  return { pinned: [] };
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
        return parsed;
      }
    }
  } catch {
    // localStorage unavailable or corrupted data — use defaults
  }
  return defaultLayout();
}

/** @type {{ pinned: import('./catalog.js').AppEntry[] }} */
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

/** Get the current layout (pinned array). */
export function getLayout() {
  return layout;
}

/** Replace the entire pinned array and persist. */
export function setPinned(pinned) {
  layout.pinned = pinned;
  saveLayout();
}

/** Add an app entry to the pinned list (unique by uid). */
export function addPinned(entry) {
  if (layout.pinned.some((p) => p.uid === entry.uid)) return false;
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
