/**
 * Import panel UI component.
 * Renders "Add apps" with 3 blocks: import installed, load layout, manual add.
 */

import { fromGetStartApps, fromStartJson, manualPin } from "./importers.js";
import { addCustomApps, isPinned, getLayout, addPinned, setPinned } from "./state.js";

/**
 * Render the import panel into a container element.
 * @param {HTMLElement} container - The #import-container element.
 */
export function renderImportPanel(container) {
  container.innerHTML = "";

  // --- Heading ---
  const heading = document.createElement("h2");
  heading.className = "panel-heading";
  heading.textContent = "Add apps";
  container.appendChild(heading);

  // --- Block A: Import installed apps ---
  const detailsA = createBlock("Import your installed apps", true);

  const installNote = document.createElement("p");
  installNote.className = "import-note";
  installNote.textContent =
    "Browsers can't see what's installed on your PC. Run this in PowerShell on a Windows machine, then paste the result below:";
  detailsA.appendChild(installNote);

  // Code + Copy button
  const codeRow = createCodeRow(
    "Get-StartApps | ConvertTo-Json | Set-Clipboard"
  );
  detailsA.appendChild(codeRow);

  const installText = document.createElement("textarea");
  installText.className = "import-textarea";
  installText.placeholder = "Paste the JSON here";

  detailsA.appendChild(installText);

  const installFileInput = document.createElement("input");
  installFileInput.type = "file";
  installFileInput.accept = ".json,.txt";
  installFileInput.className = "import-file-input";
  installFileInput.addEventListener("change", () => {
    const file = installFileInput.files && installFileInput.files[0];
    if (!file) return;
    file.text().then((text) => {
      installText.value = text;
    }).catch(() => {});
  });
  detailsA.appendChild(installFileInput);

  const installBtn = document.createElement("button");
  installBtn.className = "import-btn";
  installBtn.textContent = "Import to All apps";

  const installStatusDiv = document.createElement("div");
  installStatusDiv.className = "import-status";

  installBtn.addEventListener("click", () => {
    const text = installText.value.trim();
    if (!text) {
      showImportStatus(installStatusDiv, ["No data to import."], 0);
      return;
    }

    const result = fromGetStartApps(text);
    const customAdded = addCustomApps(result.pins);
    showImportStatus(installStatusDiv, result.errors.map((e) => "  " + e), 0, customAdded);
    if (result.pins.length > 0) {
      installText.value = "";
      installFileInput.value = "";
    }
  });

  detailsA.appendChild(installBtn);
  detailsA.appendChild(installStatusDiv);

  // --- Block B: Load an existing layout ---
  const detailsB = createBlock("Load an existing layout", false);

  const loadNote = document.createElement("p");
  loadNote.className = "import-note";
  loadNote.textContent = "Paste a ConfigureStartPins / Export-StartLayout JSON to edit it.";
  detailsB.appendChild(loadNote);

  const loadText = document.createElement("textarea");
  loadText.className = "import-textarea";
  loadText.placeholder = "Paste the JSON here";

  detailsB.appendChild(loadText);

  const loadFileInput = document.createElement("input");
  loadFileInput.type = "file";
  loadFileInput.accept = ".json,.txt";
  loadFileInput.className = "import-file-input";
  loadFileInput.addEventListener("change", () => {
    const file = loadFileInput.files && loadFileInput.files[0];
    if (!file) return;
    file.text().then((text) => {
      loadText.value = text;
    }).catch(() => {});
  });
  detailsB.appendChild(loadFileInput);

  const loadBtn = document.createElement("button");
  loadBtn.className = "import-btn";
  loadBtn.textContent = "Load layout";

  const loadStatusDiv = document.createElement("div");
  loadStatusDiv.className = "import-status";

  loadBtn.addEventListener("click", () => {
    const text = loadText.value.trim();
    if (!text) {
      showImportStatus(loadStatusDiv, ["No data to load."], 0);
      return;
    }

    const result = fromStartJson(text);
    if (result.pins.length > 0) {
      const currentPinned = getLayout().pinned;
      if (currentPinned.length > 0) {
        const confirmed = confirm("Replace the current " + currentPinned.length + " pinned apps?");
        if (!confirmed) return;
      }

      setPinned(result.pins);
      const customAdded = addCustomApps(result.pins);
      showImportStatus(loadStatusDiv, result.errors.map((e) => "  " + e), result.pins.length, customAdded);
      loadText.value = "";
      loadFileInput.value = "";
    } else {
      showImportStatus(loadStatusDiv, result.errors.map((e) => "  " + e), 0);
    }
  });

  detailsB.appendChild(loadBtn);
  detailsB.appendChild(loadStatusDiv);

  // --- Block C: Add an app manually ---
  const detailsC = createBlock("Add an app manually", false);

  const manualNameInput = document.createElement("input");
  manualNameInput.type = "text";
  manualNameInput.placeholder = "App name";
  manualNameInput.className = "import-input";

  detailsC.appendChild(manualNameInput);

  const manualTypeSelect = document.createElement("select");
  manualTypeSelect.className = "import-input";

  const optPackaged = document.createElement("option");
  optPackaged.value = "packagedAppId";
  optPackaged.textContent = "Packaged app (AUMID)";
  manualTypeSelect.appendChild(optPackaged);

  const optDesktopId = document.createElement("option");
  optDesktopId.value = "desktopAppId";
  optDesktopId.textContent = "Desktop app ID";
  manualTypeSelect.appendChild(optDesktopId);

  const optDesktopLink = document.createElement("option");
  optDesktopLink.value = "desktopAppLink";
  optDesktopLink.textContent = "Shortcut path (.lnk)";
  manualTypeSelect.appendChild(optDesktopLink);

  detailsC.appendChild(manualTypeSelect);

  const manualValueInput = document.createElement("input");
  manualValueInput.type = "text";
  manualValueInput.placeholder = "Contoso.App_8wekyb3d8bbwe!App";
  manualValueInput.className = "import-input import-value-input";

  detailsC.appendChild(manualValueInput);

  // Update placeholder when type changes
  manualTypeSelect.addEventListener("change", () => {
    switch (manualTypeSelect.value) {
      case "packagedAppId":
        manualValueInput.placeholder = "Contoso.App_8wekyb3d8bbwe!App";
        break;
      case "desktopAppId":
        manualValueInput.placeholder = "Contoso.Tool";
        break;
      case "desktopAppLink":
        manualValueInput.placeholder = "%ALLUSERSPROFILE%\\Microsoft\\Windows\\Start Menu\\Programs\\Contoso.lnk";
        break;
    }
  });

  const manualBtn = document.createElement("button");
  manualBtn.className = "import-btn";
  manualBtn.textContent = "Add and pin";

  const manualStatusDiv = document.createElement("div");
  manualStatusDiv.className = "import-status";

  manualBtn.addEventListener("click", () => {
    const name = manualNameInput.value.trim();
    const kind = manualTypeSelect.value;
    const value = manualValueInput.value.trim();

    const result = manualPin(name || "Unnamed", kind, value);
    if (result.pins.length > 0) {
      const customAdded = addCustomApps(result.pins);
      // Also pin it (if already in catalog or customApps, addPinned skips)
      const pinnedOk = addPinned(result.pins[0]);
      showImportStatus(manualStatusDiv, result.errors.map((e) => "  " + e), pinnedOk ? 1 : 0, customAdded);
    } else {
      showImportStatus(manualStatusDiv, result.errors.map((e) => "  " + e), 0);
    }
  });

  detailsC.appendChild(manualBtn);
  detailsC.appendChild(manualStatusDiv);

  container.appendChild(detailsA);
  container.appendChild(detailsB);
  container.appendChild(detailsC);

  // Re-open details blocks (state lost by innerHTML)
  reopenDetails(container);
}

/** Re-open all <details> elements after a re-render. */
function reopenDetails(container) {
  container.querySelectorAll("details").forEach((d) => {
    if (d.getAttribute("data-open")) d.open = true;
  });
}

/** Create a collapsible details block with a summary. */
function createBlock(title, isOpen) {
  const details = document.createElement("details");
  if (isOpen) {
    details.open = true;
    details.setAttribute("data-open", "true");
  }

  const summary = document.createElement("summary");
  summary.textContent = title;
  summary.style.fontWeight = "bold";
  summary.style.cursor = "pointer";

  details.appendChild(summary);
  details.style.marginTop = "12px";

  return details;
}

/** Create a code row with a Copy button (click copies the script text). */
function createCodeRow(scriptText) {
  const row = document.createElement("div");
  row.className = "import-code-row";

  const codeEl = document.createElement("code");
  codeEl.textContent = scriptText;
  row.appendChild(codeEl);

  const btn = document.createElement("button");
  btn.className = "import-btn import-btn--small";
  btn.textContent = "Copy";

  const originalText = "Copy";
  btn.addEventListener("click", () => {
    copyLabel(btn, originalText, scriptText);
  });
  row.appendChild(btn);

  return row;
}

/** Briefly change button text to "Copied", then restore. */
function copyLabel(btn, originalText, text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {}).catch(() => {});
  }
  const prev = btn.textContent;
  btn.textContent = "Copied";
  setTimeout(() => { btn.textContent = prev; }, 1500);
}

/** Show import status: summary line + optional error lines. */
function showImportStatus(container, errors, pinnedCount, customCount) {
  container.innerHTML = "";

  const summaryLine = document.createElement("p");
  summaryLine.className = "import-status";

  if (customCount > 0 && pinnedCount === 0) {
    summaryLine.textContent = "Added " + customCount + " apps to All apps.";
  } else if (customCount > 0 && pinnedCount > 0) {
    summaryLine.textContent = "Added " + customCount + " apps to All apps (" + pinnedCount + " already there).";
  } else {
    summaryLine.textContent = "No new apps to add.";
  }

  container.appendChild(summaryLine);

  if (errors && errors.length > 0) {
    for (const err of errors) {
      const errLine = document.createElement("p");
      errLine.className = "import-error";
      errLine.textContent = err;
      container.appendChild(errLine);
    }
  }
}
