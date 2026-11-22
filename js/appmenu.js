import { openContextMenu } from "./contextmenu.js";
import {
  isPinned,
  addPinned,
  removePinnedApp,
  getLayout,
  reorderPinned,
  isOnTaskbar,
  addToTaskbar,
  removeFromTaskbar,
  samePin,
} from "./state.js";

/** @typedef {{ label: string, action: () => void }} MenuItem */
/** @typedef {"start" | "all" | "taskbar"} WhereType */

/**
 * Build context-menu items for a given app and its context.
 * @param {object} app
 * @param {WhereType} where
 * @returns {MenuItem[]}
 */
export function appMenuItems(app, where) {
  const items = [];

  if (where === "start") {
    // Unpin from Start.
    items.push({
      label: "Unpin from Start",
      action: () => { removePinnedApp(app); },
    });
    // Move to front.
    items.push({
      label: "Move to front",
      action: () => {
        const newPinned = [...getLayout().pinned];
        const pinned = getLayout().pinned;
        const idx = pinned.findIndex((p) => samePin(p, app));
        if (idx < 0) return;
        const [moved] = newPinned.splice(idx, 1);
        newPinned.unshift(moved);
        reorderPinned(newPinned);
      },
    });
  }

  if (where === "all") {
    if (isPinned(app)) {
      items.push({ label: "Unpin from Start", action: () => { removePinnedApp(app); } });
    } else {
      items.push({ label: "Pin to Start", action: () => { addPinned(app); } });
    }
  }

  // Taskbar pinning is always available (and also on "all").
  if (isOnTaskbar(app)) {
    items.push({ label: "Unpin from taskbar", action: () => { removeFromTaskbar(app); } });
  } else {
    items.push({ label: "Pin to taskbar", action: () => { addToTaskbar(app); } });
  }

  if (where === "taskbar") {
    // Also show Start pinning option.
    if (isPinned(app)) {
      items.push({ label: "Unpin from Start", action: () => { removePinnedApp(app); } });
    } else {
      items.push({ label: "Pin to Start", action: () => { addPinned(app); } });
    }
  }

  return items;
}

/**
 * Attach context-menu listeners to an element representing an app.
 * @param {HTMLElement} el
 * @param {object} app
 * @param {WhereType} where
 */
export function attachAppMenu(el, app, where) {
  el.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, appMenuItems(app, where));
  });

  el.addEventListener("keydown", (e) => {
    if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      openContextMenu(r.left + 8, r.bottom - 8, appMenuItems(app, where));
    }
  });
}
