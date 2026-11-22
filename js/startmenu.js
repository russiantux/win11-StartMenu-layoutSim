/**
 * Renders the Windows 11 style Start menu.
 * - Search box at top (filters All apps sidebar, pinned grid stays visible)
 * - Pinned grid: 6 cols x 3 rows, icon + label tiles
 * - Page dots if > 18 pins; drag-dropping on a dot moves tile there
 * - Side panel "All apps" with Add button per app, search-filtered
 * - Full HTML5 drag-and-drop reorder + keyboard navigation (Alt+Arrows, Delete)
 */

import { getLayout, addPinned, removePinned, reorderPinned } from "./state.js";
import { sortedCatalog } from "./catalog.js";

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
 * Render the Start menu into a container element.
 * @param {HTMLElement} container - The #startmenu-container element.
 */
export function renderStartMenu(container) {
  rootContainer = container;
  const hadSearchFocus = document.activeElement?.classList.contains("search-input");
  const layout = getLayout();
  const pinned = layout.pinned;
  const catalog = sortedCatalog();

  container.innerHTML = "";
  container.className = "start-menu";

  const panel = document.createElement("div");
  panel.className = "start-panel";

  // --- Search box ---
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
  }

  renderPage(currentPage);

  // Search input handler: filter All apps only, pinned grid stays intact
  searchInput.addEventListener("input", () => {
    currentSearch = searchInput.value;
    applySearchFilter(searchInput.value);
  });

  body.appendChild(pinnedArea);

  // --- All apps sidebar ---
  const sidebar = createAllAppsSidebar(catalog, pinned);
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

  const iconWrap = document.createElement("div");
  iconWrap.className = "pin-icon";
  const iconEl = createIcon(item.icon, 32);
  if (iconEl) iconWrap.appendChild(iconEl);

  const label = document.createElement("span");
  label.className = "pin-label";
  label.textContent = item.name;

  tile.appendChild(iconWrap);
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
 * @param {import('./catalog.js').AppEntry[]} catalog - Sorted catalog entries.
 * @param {object[]} pinned - Currently pinned items.
 * @returns {HTMLElement}
 */
function createAllAppsSidebar(catalog, pinned) {
  const sidebar = document.createElement("div");
  sidebar.className = "all-apps-panel";

  const label = document.createElement("h2");
  label.className = "section-label section-label--side";
  label.textContent = `All apps`;
  sidebar.appendChild(label);

  const list = document.createElement("div");
  list.className = "all-app-list";

  catalog.forEach((entry) => {
    const isPinned = pinned.some((p) => p.uid === entry.uid);

    const item = document.createElement("div");
    item.className = "all-app-item";
    item.dataset.uid = entry.uid;
    item.dataset.name = entry.name;

    const iconEl = createIcon(entry.icon, 24);
    if (iconEl) {
      iconEl.classList.add("all-app-icon");
      item.appendChild(iconEl);
    }

    const nameSpan = document.createElement("span");
    nameSpan.className = "all-app-name";
    nameSpan.textContent = entry.name;
    item.appendChild(nameSpan);

    if (!isPinned) {
      const addBtn = document.createElement("button");
      addBtn.className = "add-btn";
      addBtn.textContent = "+ Add";
      addBtn.setAttribute("aria-label", `Add ${entry.name}`);

      // Create a pinned entry from the catalog item
      const pinnedEntry = {
        uid: entry.uid,
        name: entry.name,
        kind: entry.kind,
        value: entry.value,
        icon: entry.icon,
      };

      addBtn.addEventListener("click", () => {
        // Dispatch event handled by main.js to add the pin
        item.dispatchEvent(new CustomEvent("app-added", {
          bubbles: true,
          detail: pinnedEntry,
        }));
      });

      item.appendChild(addBtn);
    } else {
      const pinBadge = document.createElement("span");
      pinBadge.className = "pin-badge";
      pinBadge.textContent = "✓";
      item.appendChild(pinBadge);
    }

    list.appendChild(item);
  });

  sidebar.appendChild(list);
  return sidebar;
}

// --- Icon system: inline SVGs for ~20 Windows 11 apps ---

/**
 * Create an icon element for a given icon key.
 * @param {string} key - The icon key (e.g., "folder", "settings").
 * @param {number} size - Desired pixel size.
 * @returns {SVGSVGElement|null}
 */
function createIcon(key, size) {
  const icons = {
    edge: `<path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 2c1.93 0 3.7.68 5.05 1.82L14.15 9H9V6.65A5.974 5.974 0 0 1 12 4c3.314 0 6 2.686 6 6s-2.686 6-6 6a6 6 0 0 1-5.914-5H7.1a6.988 6.988 0 0 0 6.9 6c3.314 0 6-2.686 6-6s-2.686-6-6-6z" fill="currentColor"/>`,
    folder: `<path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-6l-2-2z" fill="currentColor"/>`,
    settings: `<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.21.08-.47-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" fill="currentColor"/>`,
    store: `<path d="M10 2h4v5h-4V2zM7 5H4V2h3v3zm6 0V2h3v3h-3zM4 8v11h16V8H4zm1.5 2h3v2h-3v-2zm0 4h3v2h-3v-2zm5-4h3v2h-3v-2zm0 4h3v2h-3v-2zm5-4h2.5v2H10.5v-2zm0 4H13v2h-2.5v-2z" fill="currentColor"/>`,
    notepad: `<path d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V8L14 2H6zm0 18V4h6.5l3.5 3.5V16h2V8h-3v-4H10v2H8V4H6zm2-8h8v2H8v-2zm0 4h8v2H8v-2z" fill="currentColor"/>`,
    calculator: `<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm0-4H7v-2h5v2zm3 0h-3v-2h3v2zm0-4h-3V7h3v4z" fill="currentColor"/>`,
    paint: `<path d="M18.5 2.5c-.78-.78-2.05-.78-2.83 0L6.17 12l-4.17 1 1-4.17L12 3.83l6.5 6.5 2-2c.78-.78.78-2.05 0-2.83L18.5 2.5zM14.17 9.67L4 16.33V20h3.67l5.83-7.5-1.33-1.33-.13.5zM2 20l4-1" fill="none" stroke="currentColor" stroke-width="2"/>
             <circle cx="15.5" cy="6.5" r="1.5" fill="currentColor"/>
             <circle cx="12.5" cy="9.5" r="1.5" fill="currentColor"/>`,
    photos: `<path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6.5 11l2.5-3L9 11H6l0-1c0-.55.45-1 1-1h6c.55 0 1 .45 1 1v3H8l-1.5-2z" fill="currentColor"/>`,
    terminal: `<path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM7.5 15l4.5-6.5L7.5 5v3h6l-3.5 4L13.5 15v-3H7.5z" fill="currentColor"/>`,
    outlook: `<path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/>`,
    word: `<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4 12h-2V8H8.5v7H6.5V8H5v7H4V7h2l1.5 2L10 7h2v8zm3.5-4c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0 2.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" fill="currentColor"/>`,
    excel: `<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4 12H8V7h7v8zm2.5-4c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0 2.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" fill="currentColor"/>`,
    powerpoint: `<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4 12h-5V7h5v8zm-3.5-4l-2 3H7.5l2-3h-2V8h5v3z" fill="currentColor"/>`,
    teams: `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.62 1.34-2.02 2.55-3.8 3.14.19-.36.44-.82.57-1.07.15-.29.3-.63.41-.93.06-.14.1-.28.14-.41l.09-.27c.61.15 1.08.34 1.24.73.14.34.09.76-.05 1.12l-.01.03c.44-.48.75-1.05.87-1.66.08-.42.03-.83-.12-1.15l-.05-.09c-.62.77-1.48 1.33-2.45 1.6l-.07.02c-.29-.44-.56-.87-.81-1.24l-.06-.09c.73-.29 1.35-.74 1.8-1.3.08-.1.15-.2.21-.3C14.97 7.68 16.05 8.53 16.64 9.8zm-9.28-.03c.57-1.26 1.5-2.28 2.64-2.93.07-.04.14-.08.21-.11l.06-.03c.25.39.53.83.79 1.2l.06.09c-.64.28-1.17.68-1.55 1.16l-.04.05c-.14-.34-.28-.67-.41-.99l-.03-.07c-.55.23-1.02.56-1.39.97l-.03.04c-.58.66-.87 1.48-.83 2.35l.01.14c.12.96.57 1.83 1.25 2.48l.03.03c-.6-.5-1.03-1.16-1.22-1.91l-.01-.04c-.15-.67-.08-1.37.22-1.99l.04-.08c.24-.52.6-1 .84-1.08l.01 0z" fill="currentColor"/>`,
    snipping: `<path d="M6 2h12c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2h-3l-3 3-3-3H6c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm0 2v8h3l3 3 3-3h3V4H6zm1 2h8v2H7V6z" fill="currentColor"/>`,
    clock: `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.32 0-6 2.68-6 6s2.68 6 6 6 6-2.68 6-6-2.68-6-6-6zm1 13h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/>`,
    calendar: `<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z" fill="currentColor"/>`,
    camera: `<path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zm0-5.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zM9 2L7.17 4H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-2.17L15 2H9zm12 16H5V8h2.05l1.5-1.5L9.5 8H15v10z" fill="currentColor"/>`,
    copilot: `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.6 14.9c-.9.6-2 .95-3.2 1h-.04c-3.3-.1-5.96-2.76-6.06-6.06v-.04c0-1.2.35-2.32.95-3.2l.04-.06C5.78 7.1 4.93 9.22 5 11.46c.06 3.18 2.56 5.74 5.74 5.94h.04c2.14-.06 4.07-1 5.32-2.49l-.04.05c-.56.78-1.3 1.42-2.16 1.94z" fill="currentColor"/>
             <circle cx="12" cy="12" r="3" fill="currentColor"/>`,
    controlpanel: `<path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 2.76c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5S9.5 10.64 9.5 9.26s1.12-2.5 2.5-2.5zM4 18v-1.46c0-2.15 1.67-3.93 3.78-4.07C8.62 12.82 9.75 13 11 13h2c1.25 0 2.38-.18 3.22-.53C18.33 12.61 20 14.39 20 16.54V18H4z" fill="currentColor"/>`,
    search: `<path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>`,
  };

  if (!icons[key]) return null;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.classList.add("icon-svg");
  svg.innerHTML = icons[key];
  return svg;
}
