/**
 * Main entry point — boots the application and wires up the UI.
 */

import { renderStartMenu } from "./startmenu.js";
import { renderExportPanel } from "./exportpanel.js";
import { renderImportPanel } from "./importpanel.js";
import { addPinned, removePinned, onChange, getLayout } from "./state.js";

let startEl = null;
let exportEl = null;
let importEl = null;

function renderStart() {
  if (!startEl) return;
  renderStartMenu(startEl);
}

function renderExport() {
  if (!exportEl) return;
  renderExportPanel(exportEl, getLayout().pinned);
}

function renderImport() {
  if (!importEl) return;
  renderImportPanel(importEl);
}

/** Re-render all panels (full app state). */
/** Re-render the panels that reflect state (the import panel keeps its own inputs and status). */
function renderAll() {
  renderStart();
  renderExport();
}

function boot() {
  startEl = document.getElementById("startmenu-container");
  exportEl = document.getElementById("export-container");
  importEl = document.getElementById("import-container");

  if (!startEl) return;

  renderAll();
  renderImport(); // once: it keeps its own inputs and status lines

  // Subscribe onChange so any state mutation re-renders all panels.
  // Drag-and-drop, sidebar add/remove call saveLayout → onChange → renderAll.
  onChange(renderAll);

  // "app-added" — user added a pin from All apps sidebar.
  // addPinned + renderStart are handled by onChange; direct call for immediate feedback.
  startEl.addEventListener("app-added", (e) => {
    const entry = e.detail;
    addPinned(entry);
  });

  // "pin-removed" — user removed a pinned item via (x) button.
  startEl.addEventListener("pin-removed", (e) => {
    removePinned(e.detail);
  });
}

document.addEventListener("DOMContentLoaded", boot);
