/**
 * Main entry point — boots the application and wires up the UI.
 */

import { renderStartMenu } from "./startmenu.js";
import { renderExportPanel } from "./exportpanel.js";
import { addPinned, removePinned, onChange, getLayout } from "./state.js";

let startEl = null;
let exportEl = null;

function renderStart() {
  if (!startEl) return;
  renderStartMenu(startEl);
}

function renderExport() {
  if (!exportEl) return;
  renderExportPanel(exportEl, getLayout().pinned);
}

/** Re-render both panels (full app state). */
function renderAll() {
  renderStart();
  renderExport();
}

function boot() {
  startEl = document.getElementById("startmenu-container");
  exportEl = document.getElementById("export-container");

  if (!startEl) return;

  renderAll();

  // Subscribe onChange so state mutations trigger a re-render of the export panel only.
  // Drag-and-drop and sidebar add/remove call saveLayout → onChange → renderExport automatically.
  onChange(renderExport);

  // "app-added" — user added a pin from All apps sidebar.
  // Direct renderStart for immediate visual feedback; onChange handles export panel.
  startEl.addEventListener("app-added", (e) => {
    const entry = e.detail;
    addPinned(entry);
    renderStart();
  });

  // "pin-removed" — user removed a pinned item via (x) button.
  startEl.addEventListener("pin-removed", (e) => {
    removePinned(e.detail);
    renderStart();
  });
}

document.addEventListener("DOMContentLoaded", boot);
