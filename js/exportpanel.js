/**
 * Export panel UI component.
 * Renders a configuration export panel (JSON / XML) for MDM distribution.
 */

import { toStartJson, OMA_URI, toTaskbarXml } from "./exporters.js";

/** Persisted UI selections across re-renders. */
let currentFormat = "gpo"; // "gpo" | "intune" | "taskbar"
let currentApplyOnce = null; // null | true | false

/**
 * Render the export panel into a container element.
 * @param {HTMLElement} container - The #export-container element.
 * @param {object[]} pins - Pinned Start menu apps.
 * @param {object[]} taskbar - Taskbar pinned apps (default []).
 */
export function renderExportPanel(container, pins, taskbar = []) {
  container.innerHTML = "";

  // --- Heading ---
  const heading = document.createElement("h2");
  heading.className = "panel-heading";
  heading.textContent = "Export";
  container.appendChild(heading);

  // --- Controls row (always rendered, even when empty) ---
  const controls = document.createElement("div");
  controls.className = "export-controls";

  // Format select
  const fmtLabel = document.createElement("label");
  fmtLabel.className = "control-label";
  fmtLabel.textContent = "Format:";

  const fmtSelect = document.createElement("select");
  fmtSelect.value = currentFormat;

  const optGpo = document.createElement("option");
  optGpo.value = "gpo";
  optGpo.textContent = "GPO / LayoutModification.json (pretty)";
  fmtSelect.appendChild(optGpo);

  const optIntune = document.createElement("option");
  optIntune.value = "intune";
  optIntune.textContent = "Intune OMA-URI (single line)";
  fmtSelect.appendChild(optIntune);

  const optTaskbar = document.createElement("option");
  optTaskbar.value = "taskbar";
  optTaskbar.textContent = "Taskbar XML (LayoutModification.xml)";
  fmtSelect.appendChild(optTaskbar);

  controls.appendChild(fmtLabel);
  controls.appendChild(fmtSelect);

  const formatIsEmpty = currentFormat === "taskbar";

  // Early returns for empty state (keep Format select visible).
  if (!formatIsEmpty && (!pins || pins.length === 0)) {
    const note = document.createElement("p");
    note.className = "empty-note";
    note.textContent = "Pin some apps first.";
    container.appendChild(note);
    container.appendChild(controls);
    return;
  }
  if (formatIsEmpty && taskbar.length === 0) {
    const note = document.createElement("p");
    note.className = "empty-note";
    note.textContent = "Pin some apps to the taskbar first.";
    container.appendChild(note);
    container.appendChild(controls);
    return;
  }

  // applyOnce select (hidden when taskbar format).
  const aoLabel = document.createElement("label");
  aoLabel.className = "control-label";
  aoLabel.textContent = "applyOnce:";

  const aoSelect = document.createElement("select");
  if (currentApplyOnce === true) aoSelect.value = "true";
  else if (currentApplyOnce === false) aoSelect.value = "false";
  else aoSelect.value = "";

  const optNone = document.createElement("option");
  optNone.value = "";
  optNone.textContent = "Not set";
  aoSelect.appendChild(optNone);

  const optTrue = document.createElement("option");
  optTrue.value = "true";
  optTrue.textContent = "true: apply once, users can change";
  aoSelect.appendChild(optTrue);

  const optFalse = document.createElement("option");
  optFalse.value = "false";
  optFalse.textContent = "false: reapply at every sign-in";
  aoSelect.appendChild(optFalse);

  controls.appendChild(aoLabel);
  controls.appendChild(aoSelect);

  container.appendChild(controls);

  // --- Output textarea ---
  const output = document.createElement("textarea");
  output.className = "export-output";
  output.rows = 12;
  output.readOnly = true;
  output.spellcheck = false;
  container.appendChild(output);

  // --- Buttons row ---
  const btnRow = document.createElement("div");
  btnRow.className = "export-buttons";

  const copyBtn = document.createElement("button");
  copyBtn.className = "export-btn";
  copyBtn.textContent = "Copy";

  const downloadBtn = document.createElement("button");
  downloadBtn.className = "export-btn";
  downloadBtn.textContent = "Download";

  btnRow.appendChild(copyBtn);
  btnRow.appendChild(downloadBtn);

  container.appendChild(btnRow);

  // --- OMA-URI details (Intune only) ---
  const omaDetails = document.createElement("div");
  omaDetails.className = "export-oma-details";

  const omaLabel = document.createElement("p");
  omaLabel.className = "export-note";
  omaLabel.textContent = "OMA-URI: " + OMA_URI.device;
  omaDetails.appendChild(omaLabel);

  const codeRow = document.createElement("div");
  codeRow.className = "oma-code-row";

  const codeEl = document.createElement("code");
  codeEl.textContent = OMA_URI.device;
  codeRow.appendChild(codeEl);

  const omaCopyBtn = document.createElement("button");
  omaCopyBtn.className = "export-btn export-btn--small";
  omaCopyBtn.textContent = "Copy";
  codeRow.appendChild(omaCopyBtn);

  omaDetails.appendChild(codeRow);

  const dataType = document.createElement("p");
  dataType.className = "export-note";
  dataType.textContent = "Data type: String";
  omaDetails.appendChild(dataType);

  const noteText = document.createElement("p");
  noteText.className = "export-note";
  noteText.textContent = "Note: Use " + OMA_URI.user + " instead for per-user assignment.";
  omaDetails.appendChild(noteText);

  container.appendChild(omaDetails);

  // --- Taskbar-specific info box (taskbar only) ---
  const taskbarOma = document.createElement("div");
  taskbarOma.className = "export-oma-details";
  taskbarOma.style.display = "none";

  const infoLines = [
    `Intune OMA-URI: ./Device/Vendor/MSFT/Policy/Config/Start/StartLayout`,
    `Per-user: ${OMA_URI.user}`,
    "Data type: String (paste the whole XML).",
    "Or GPO: Start Menu and Taskbar › Start Layout (path to this file).",
  ];

  // First line: OMA-URI with Copy button.
  const firstRow = document.createElement("div");
  firstRow.className = "oma-code-row";

  const firstLine = document.createElement("span");
  firstLine.className = "export-note";
  firstLine.textContent = infoLines[0];
  firstRow.appendChild(firstLine);

  const taskbarCopyBtn = document.createElement("button");
  taskbarCopyBtn.className = "export-btn export-btn--small";
  taskbarCopyBtn.textContent = "Copy";
  taskbarCopyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(infoLines[0]).catch(() => {});
  });
  firstRow.appendChild(taskbarCopyBtn);

  taskbarOma.appendChild(firstRow);

  // Remaining lines (no copy buttons).
  for (let i = 1; i < infoLines.length; i++) {
    const p = document.createElement("p");
    p.className = "export-note";
    p.textContent = infoLines[i];
    taskbarOma.appendChild(p);
  }

  container.appendChild(taskbarOma);

  // --- Always-visible note ---
  const globalNote = document.createElement("p");
  globalNote.className = "export-note";
  globalNote.textContent =
    "ConfigureStartPins applies to Windows 11 Pro, Enterprise and Education. applyOnce requires Windows 11 24H2 with KB5062660 or later; older builds ignore it.";
  container.appendChild(globalNote);

  // --- Update output text helper (shared across handlers) ---
  function updateOutput() {
    const aoVal = currentApplyOnce; // null | true | false

    if (currentFormat === "taskbar") {
      output.value = toTaskbarXml(taskbar);
      omaDetails.style.display = "none";
      taskbarOma.style.display = "";
      aoLabel.style.display = "none";
      aoSelect.style.display = "none";
    } else {
      const formatted = toStartJson(pins, { applyOnce: aoVal });

      if (currentFormat === "intune") {
        // Single-line for OMA-URI pasting (minify handled by our JSON)
        output.value = formatted.replace(/[\s\r\n]/g, " ").replace(/\s+/g, " ");
        omaDetails.style.display = "";
      } else {
        output.value = formatted;
        omaDetails.style.display = "none";
      }

      taskbarOma.style.display = "none";
      aoLabel.style.display = "";
      aoSelect.style.display = "";
    }
  }

  // Format change handler
  fmtSelect.addEventListener("change", () => {
    currentFormat = fmtSelect.value;
    updateOutput();
  });

  // applyOnce change handler — re-render just the panel (controls + output + buttons)
  aoSelect.addEventListener("change", () => {
    const val = aoSelect.value;
    currentApplyOnce = val === "" ? null : val === "true";
    // Full re-render of panel (controls include new applyOnce value)
    renderExportPanel(container, pins, taskbar);
  });

  // Wire copy button: gets text from textarea and copies it
  copyBtn.addEventListener("click", () => {
    handleExportCopy(output.value, copyBtn);
  });

  // Wire download button
  downloadBtn.addEventListener("click", () => {
    handleExportDownload(output.value, currentFormat, taskbar);
  });

  // Initial output
  updateOutput();
}

/**
 * Copy text to clipboard. Falls back to textarea select + execCommand.
 * @param {string} text
 * @param {HTMLButtonElement} btn
 */
function handleExportCopy(text, btn) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showCopied(btn);
    }).catch(() => {
      fallbackCopy(text, btn);
    });
  } else {
    fallbackCopy(text, btn);
  }
}

/** Fallback: select the textarea and use execCommand("copy"). */
function fallbackCopy(text, btn) {
  const output = document.querySelector(".export-output");
  if (output) {
    output.select();
    try {
      document.execCommand("copy");
      showCopied(btn);
    } catch {
      // execCommand not available in older browsers — silently fail
    }
  }
}

/** Briefly change button text to "Copied" then restore original. */
function showCopied(btn) {
  const original = btn.textContent;
  btn.textContent = "Copied";
  setTimeout(() => {
    btn.textContent = original;
  }, 1500);
}

/** Download export as a file via Blob + temporary anchor. */
function handleExportDownload(text, format) {
  const isTaskbar = format === "taskbar";
  const blob = new Blob([text], { type: isTaskbar ? "application/xml" : "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = isTaskbar ? "LayoutModification.xml" : "LayoutModification.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
