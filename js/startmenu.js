/**
 * Renders the Windows 11 style Start menu.
 * - Search box at top (filters All apps sidebar, pinned grid stays visible)
 * - Pinned grid: 6 cols x 3 rows, icon + label tiles
 * - Page dots if > 18 pins; drag-dropping on a dot moves tile there
 * - Side panel "All apps" with Add button per app, search-filtered
 * - Full HTML5 drag-and-drop reorder + keyboard navigation (Alt+Arrows, Delete)
 */

import { getLayout, addPinned, removePinned, reorderPinned, getCustomApps, isPinned as stateIsPinned } from "./state.js";
import { sortedCatalog } from "./catalog.js";
import { ICONS, TILE_COLORS, FALLBACK_ICON } from "./icons.js";
import { attachAppMenu } from "./appmenu.js";

const PINS_PER_PAGE = 18; // 6 columns x 3 rows
const COLS = 6;

/** Current page index across re-renders. */
let currentPage = 0;
/** uid of the currently dragged tile (or null). */
let dragUid = null;
/** text content of the search input across re-renders. */
let currentSearch = "";
/** The container the menu was last rendered into. */
let rootContainer = null;

/** Re-render the whole menu after any state change. */
function rerender() {
  if (rootContainer) renderStartMenu(rootContainer);
}

/**
 * Create an icon <svg> element for a given key.
 * Falls back to FALLBACK_ICON when the key isn't found.
 * @param {string} key - The icon key (e.g., "folder", "settings").
 * @param {number} size - Desired pixel size.
 * @returns {SVGSVGElement|null}
 */
function createIcon(key, size) {
  const icon = ICONS[key] || ICONS[FALLBACK_ICON];
  if (!icon) return null;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", icon.viewBox || "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.classList.add("icon-svg");
  svg.innerHTML = icon.body;
  return svg;
}

/**
 * Create a coloured app badge containing an <svg> icon.
 * Pinned tiles: size = 40, inner icon ≈ 25 (rounded).
 * All apps rows: size = 28, inner icon ≈ 17.
 * @param {string} key - The app's icon key (catalog.js `icon` field).
 * @param {number} size - Badge width/height in px.
 * @returns {HTMLElement} `<span class="app-badge">` or null
 */
export function createAppBadge(key, size) {
  const iconKey = key || FALLBACK_ICON;
  const badge = document.createElement("span");
  badge.className = "app-badge";
  const tileColor = TILE_COLORS[iconKey] || TILE_COLORS[FALLBACK_ICON];
  badge.style.background = tileColor;
  badge.style.width = size + "px";
  badge.style.height = size + "px";

  const innerIcon = createIcon(key, Math.round(size * 0.62));
  if (innerIcon) {
    // White glyph for coloured badges: override color to white
    innerIcon.style.color = "#fff";
    badge.appendChild(innerIcon);
  }

  return badge;
}

/**
 * Render the Start menu into a container element.
 * @param {HTMLElement} container - The #startmenu-container element.
 */
export function renderStartMenu(container) {
  rootContainer = container;
  const hadSearchFocus = document.activeElement?.classList.contains("search-input");
  const currentLayout = getLayout();
  const pinned = currentLayout.pinned;
  const catalog = sortedCatalog();
  const customApps = getCustomApps();

  container.innerHTML = "";
  container.className = "start-menu";

  const panel = document.createElement("div");
  panel.className = "start-panel";

  // --- Search box (plain icon, no badge) ---
  const searchWrap = document.createElement("div");
  searchWrap.className = "search-bar";

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Type here to search";
  searchInput.className = "search-input";
  searchInput.value = currentSearch;

  const searchIcon = createIcon("search", 16);
  searchWrap.appendChild(searchIcon);
  searchWrap.appendChild(searchInput);
  panel.appendChild(searchWrap);

  // --- Body: pinned grid + All apps sidebar ---
  const body = document.createElement("div");
  body.className = "start-body";

  // --- Pinned area ---
  const pinnedArea = document.createElement("div");
  pinnedArea.className = "pinned-area";

  const pinnedLabel = document.createElement("h2");
  pinnedLabel.className = "section-label";
  const totalCount = pinned.length;
  pinnedLabel.textContent = totalCount > 0 ? `Pinned (${totalCount})` : "Pinned";
  pinnedArea.appendChild(pinnedLabel);

  const totalPages = Math.max(1, Math.ceil(pinned.length / PINS_PER_PAGE));
  // Clamp currentPage so we never go past the last page
  currentPage = Math.min(currentPage, totalPages - 1);

  function renderPage(pageIndex) {
    currentPage = pageIndex;
    const start = pageIndex * PINS_PER_PAGE;
    const end = Math.min(start + PINS_PER_PAGE, pinned.length);
    const pageItems = pinned.slice(start, end);

    // Remove old grid and pagination
    const oldGrid = pinnedArea.querySelector(".pinned-grid");
    const oldPag = pinnedArea.querySelector(".pagination");
    if (oldGrid) oldGrid.remove();
    if (oldPag) oldPag.remove();

    // Grid
    const grid = document.createElement("div");
    grid.className = "pinned-grid";

    pageItems.forEach((item) => {
      const tile = createPinTile(item);
      grid.appendChild(tile);
    });

    // Fill remaining cells with placeholders so the grid always has 18 rows
    const filled = pageItems.length;
    for (let i = 0; i < PINS_PER_PAGE - filled; i++) {
      const empty = document.createElement("div");
      empty.className = "pin-tile pin-tile--empty";
      grid.appendChild(empty);
    }

    pinnedArea.appendChild(grid);

    // Page dots (only if more than 1 page)
    if (totalPages > 1) {
      const pag = document.createElement("div");
      pag.className = "pagination";

      for (let i = 0; i < totalPages; i++) {
        const dot = document.createElement("button");
        dot.className = "page-dot" + (i === currentPage ? " page-dot--active" : "");
        dot.setAttribute("data-page", String(i));
        dot.setAttribute("aria-label", `Page ${i + 1}`);

        // Drag-over on page dot: drop tile at end of that page (or end of list)
        dot.addEventListener("dragover", (e) => {
          e.preventDefault();
          dot.classList.add("page-dot--dragover");
        });
        dot.addEventListener("dragleave", () => {
          dot.classList.remove("page-dot--dragover");
        });
        dot.addEventListener("drop", (e) => {
          e.preventDefault();
          dot.classList.remove("page-dot--dragover");
          handlePageDotDrop(i);
        });

        dot.addEventListener("click", () => renderPage(i));
        pag.appendChild(dot);
      }

      pinnedArea.appendChild(pag);
    }

    // Remove old hint
    const oldHint = pinnedArea.querySelector(".start-hint");
    if (oldHint) oldHint.remove();

    // Taskbar hint
    const hint = document.createElement("p");
    hint.className = "start-hint";
    hint.textContent = "Drag to reorder · Right-click for options · Alt+←/→ to move · Delete to unpin";
    pinnedArea.appendChild(hint);
  }

  renderPage(currentPage);

  // Search input handler: filter All apps only, pinned grid stays intact
  searchInput.addEventListener("input", () => {
    currentSearch = searchInput.value;
    applySearchFilter(searchInput.value);
  });

  body.appendChild(pinnedArea);

  // --- All apps sidebar (catalog + custom apps) ---
  const sidebar = createAllAppsSidebar(catalog, pinned, customApps);
  body.appendChild(sidebar);

  panel.appendChild(body);
  container.appendChild(panel);

  // Re-apply search filter after sidebar is built
  applySearchFilter(currentSearch);
  if (hadSearchFocus) {
    searchInput.focus();
    searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
  }
}

// --- Drag-and-drop for pinned tiles ---

/** Create a draggable pin tile. */
function createPinTile(item) {
  const tile = document.createElement("div");
  tile.className = "pin-tile";
  tile.dataset.uid = item.uid;
  tile.dataset.name = item.name;
  tile.draggable = true;
  tile.tabIndex = 0; // keyboard focusable

  const badge = createAppBadge(item.icon, 40);
  if (badge) tile.appendChild(badge);

  const label = document.createElement("span");
  label.className = "pin-label";
  label.textContent = item.name;
  tile.appendChild(label);

  // Remove button (x) on hover — dispatches event handled by main.js
  const removeBtn = document.createElement("button");
  removeBtn.className = "remove-btn";
  removeBtn.setAttribute("aria-label", `Remove ${item.name}`);
  removeBtn.textContent = "×";
  removeBtn.addEventListener("click", () => {
    tile.dispatchEvent(new CustomEvent("pin-removed", {
      bubbles: true,
      detail: item.uid,
    }));
  });
  tile.appendChild(removeBtn);

  // HTML5 drag start
  tile.addEventListener("dragstart", (e) => {
    dragUid = item.uid;
    tile.classList.add("pin-tile--dragging");
    e.dataTransfer.effectAllowed = "move";
    // Needed for Firefox
    e.dataTransfer.setData("text/plain", item.uid);
  });

  tile.addEventListener("dragend", () => {
    tile.classList.remove("pin-tile--dragging");
    // Clear all drop targets
    document.querySelectorAll(".pin-tile--drop-target").forEach((t) => {
      t.classList.remove("pin-tile--drop-target");
    });
    document.querySelectorAll(".page-dot--dragover").forEach((d) => {
      d.classList.remove("page-dot--dragover");
    });
    dragUid = null;
  });

  // Drop target: when another tile is dropped on this tile
  tile.addEventListener("dragover", (e) => {
    e.preventDefault(); // necessary to allow drop
    if (dragUid && dragUid !== item.uid) {
      tile.classList.add("pin-tile--drop-target");
    } else {
      tile.classList.remove("pin-tile--drop-target");
    }
  });

  tile.addEventListener("dragleave", () => {
    tile.classList.remove("pin-tile--drop-target");
  });

  tile.addEventListener("drop", (e) => {
    e.preventDefault();
    tile.classList.remove("pin-tile--drop-target");
    if (!dragUid || dragUid === item.uid) return;
    handleTileDrop(dragUid, item.uid, getLayout().pinned);
  });

  // Keyboard: Alt+ArrowLeft/Right moves the tile one step (across pages), Delete removes
  tile.addEventListener("keydown", (e) => {
    if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      moveByKeyboard(item.uid, e.key === "ArrowLeft" ? -1 : 1);
      return;
    }

    // Delete: remove pinned item (dispatch event)
    if (e.key === "Delete") {
      e.preventDefault();
      tile.dispatchEvent(new CustomEvent("pin-removed", {
        bubbles: true,
        detail: item.uid,
      }));
    }
  });

  attachAppMenu(tile, item, "start");

  return tile;
}

// --- Drop handlers ---

/** Move a tile one step left/right in the full list, following it across pages. */
function moveByKeyboard(uid, delta) {
  const newPinned = [...getLayout().pinned];
  const idx = newPinned.findIndex((p) => p.uid === uid);
  const target = idx + delta;
  if (idx < 0 || target < 0 || target >= newPinned.length) return;

  [newPinned[idx], newPinned[target]] = [newPinned[target], newPinned[idx]];
  reorderPinned(newPinned);
  currentPage = Math.floor(target / PINS_PER_PAGE);
  rerender();
  rootContainer.querySelector(`.pin-tile[data-uid="${CSS.escape(uid)}"]`)?.focus();
}

/** Handle dropping a tile on another tile — move it to the target's position. */
function handleTileDrop(draggedUid, targetUid, pinned) {
  const newPinned = [...pinned];
  const dragIdx = newPinned.findIndex((p) => p.uid === draggedUid);
  const targetIdx = newPinned.findIndex((p) => p.uid === targetUid);
  if (dragIdx < 0 || targetIdx < 0) return;

  // Move dragged item to target position
  const [draggedItem] = newPinned.splice(dragIdx, 1);
  newPinned.splice(targetIdx, 0, draggedItem);

  reorderPinned(newPinned);
  rerender();
}

/** Handle dropping on a page dot: move dragged tile to the end of that page. */
function handlePageDotDrop(pageIndex) {
  const newPinned = [...getLayout().pinned];
  const dragIdx = newPinned.findIndex((p) => p.uid === dragUid);
  if (dragIdx < 0) return;

  const [draggedItem] = newPinned.splice(dragIdx, 1);
  // Last slot of that page, or the end of the list if the page isn't full
  const insertIdx = Math.min((pageIndex + 1) * PINS_PER_PAGE - 1, newPinned.length);
  newPinned.splice(insertIdx, 0, draggedItem);

  reorderPinned(newPinned);
  currentPage = pageIndex;
  rerender();
}

/** Apply search filter to All apps sidebar only. */
function applySearchFilter(query) {
  const q = (query || "").trim().toLowerCase();

  // Filter All apps sidebar
  const sidebarItems = rootContainer.querySelectorAll(".all-app-item");
  let visibleCount = 0;

  sidebarItems.forEach((item) => {
    const name = item.dataset.name.toLowerCase();
    const show = !q || name.includes(q);
    item.style.display = show ? "" : "none";
    if (show) visibleCount++;
  });

  // Show "No apps found" when filtering and nothing matches
  const noResult = rootContainer.querySelector(".no-results-msg");
  if (noResult) noResult.remove();

  if (q && visibleCount === 0) {
    const msg = document.createElement("div");
    msg.className = "no-results-msg";
    msg.textContent = "No apps found";
    const list = rootContainer.querySelector(".all-app-list");
    if (list) {
      list.appendChild(msg);
    }
  }
}

// --- All apps sidebar ---

/**
 * Create the All apps sidebar with Add buttons.
 * Merges catalog and custom apps, sorted by name.
 * @param {import('./catalog.js').AppEntry[]} catalog - Catalog entries.
 * @param {object[]} pinned - Currently pinned items (used for isPinned check).
 * @param {import('./state.js').CustomPin[]} customApps - User-added apps.
 * @returns {HTMLElement}
 */
function createAllAppsSidebar(catalog, pinned, customApps) {
  const sidebar = document.createElement("div");
  sidebar.className = "all-apps-panel";

  const label = document.createElement("h2");
  label.className = "section-label section-label--side";
  label.textContent = `All apps`;
  sidebar.appendChild(label);

  const list = document.createElement("div");
  list.className = "all-app-list";

  // Build combined list: catalog + custom apps, sorted by name.
  // Custom apps that match a catalog entry (same kind + value) are skipped entirely.
  // Only non-matching custom apps get pushed with _isCustom=true.
  /** @type {Array<{kind: string, value: string, uid?: string, icon: string, _isCustom?: boolean}>} */
  const allApps = [...catalog];

  for (const ca of (customApps || [])) {
    // Skip if it matches any catalog entry (same kind + value, case-insensitive)
    const hasMatch = allApps.find((c) => {
      return c.kind === ca.kind && String(c.value).toLowerCase() === String(ca.value).toLowerCase();
    });
    if (hasMatch) continue; // already in catalog — just skip

    /** @type {object} */
    const entry = {
      kind: ca.kind,
      value: ca.value,
      uid: ca.uid || ("imp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8)),
      name: ca.name,
      icon: "app",
      _isCustom: true,
    };

    allApps.push(entry);
  }

  allApps.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of allApps) {
    // Use imported isPinned to check (same kind, same value case-insensitive)
    const alreadyPinned = stateIsPinned(entry);

    const item = document.createElement("div");
    item.className = "all-app-item";
    item.dataset.uid = entry.uid;
    item.dataset.name = entry.name;

    const badge = createAppBadge(entry.icon, 28);
    if (badge) {
      // All-apps badges use smaller radius
      badge.style.borderRadius = "6px";
      item.appendChild(badge);
    }

    const nameSpan = document.createElement("span");
    nameSpan.className = "all-app-name";
    nameSpan.textContent = entry.name;
    item.appendChild(nameSpan);

    // Custom apps get a small "Imported" tag (only non-matching custom apps)
    if (entry._isCustom) {
      const tag = document.createElement("span");
      tag.className = "app-tag";
      tag.textContent = "Imported";
      item.appendChild(tag);
    }

    if (!alreadyPinned) {
      // Create a pinned entry from this item for dispatch
      const eventDetail = {
        uid: entry.uid,
        name: entry.name,
        kind: entry.kind,
        value: entry.value,
        icon: entry.icon,
      };

      const addBtn = document.createElement("button");
      addBtn.className = "add-btn";
      addBtn.textContent = "+ Add";
      addBtn.setAttribute("aria-label", `Add ${entry.name}`);

      addBtn.addEventListener("click", () => {
        // Dispatch event handled by main.js to add the pin
        item.dispatchEvent(new CustomEvent("app-added", {
          bubbles: true,
          detail: eventDetail,
        }));
      });

      item.appendChild(addBtn);
    } else {
      const pinBadge = document.createElement("span");
      pinBadge.className = "pin-badge";
      pinBadge.textContent = "✓";
      item.appendChild(pinBadge);
    }

    attachAppMenu(item, entry, "all");
    item.tabIndex = 0;
    list.appendChild(item);
  }

  sidebar.appendChild(list);
  return sidebar;
}
