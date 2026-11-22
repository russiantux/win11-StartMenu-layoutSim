/**
 * Import utilities for the Start Menu Layout Editor.
 * Pure functions — no DOM, no module imports.
 * Every function returns { pins: [...], errors: [string, ...] }.
 */

/** Known pin kinds. */
const KNOWN_KINDS = ["packagedAppId", "desktopAppLink", "desktopAppId"];

/** Generate a random uid fragment. */
function randomUid() {
  return Math.random().toString(36).slice(2, 8);
}

/** Create a pin object from name, kind, and value. */
function makePin(name, kind, value) {
  return {
    uid: "imp_" + Date.now() + "_" + randomUid(),
    name: String(name).trim(),
    kind: /** @type {"packagedAppId" | "desktopAppLink" | "desktopAppId"} */ (kind),
    value: String(value).trim(),
    icon: "app",
  };
}

/**
 * Classify an AppID string from Get-StartApps into a pin kind.
 * Case-insensitive .lnk check.
 * @param {string} appId
 * @returns {"packagedAppId" | "desktopAppLink" | "desktopAppId"}
 */
export function classifyAppId(appId) {
  if (appId.includes("!")) return "packagedAppId";
  if (/\.lnk$/i.test(appId)) return "desktopAppLink";
  return "desktopAppId";
}

/**
 * Parse the output of Get-StartApps | ConvertTo-Json.
 * Accepts a JSON array or single object; strips BOM.
 * @param {string} text
 * @returns {{ pins: import("./state.js").LayoutPin[], errors: string[] }}
 */
export function fromGetStartApps(text) {
  /** @type {import("./state.js").LayoutPin[]} */
  const pins = [];
  /** @type string[] */
  const errors = [];

  if (!text || !text.trim()) {
    return { pins: [], errors: ["No input provided."] };
  }

  // Strip UTF-8 BOM
  const cleaned = text.replace(/^﻿/, "");

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    return { pins: [], errors: ["Not valid JSON: " + e.message] };
  }

  // Accept single object (wrapped) or array
  if (!Array.isArray(parsed)) {
    parsed = [parsed];
  }

  for (let i = 0; i < parsed.length; i++) {
    const entry = parsed[i];
    if (!entry || typeof entry !== "object") continue;

    const appId = entry.AppID || entry.appid || entry.AppId || "";
    if (!appId) {
      errors.push("Skipped entry " + (i + 1) + ": missing AppID");
      continue;
    }

    const name = entry.Name || entry.name || entry.NAME || appId;
    const kind = classifyAppId(appId);

    pins.push(makePin(name, kind, appId));
  }

  return { pins, errors };
}

/**
 * Extract a display name from an AppID value.
 * @param {string} value - The pin value string.
 * @param {"packagedAppId" | "desktopAppLink" | "desktopAppId"} kind
 * @returns {string}
 */
function guessNameFromValue(value, kind) {
  switch (kind) {
    case "packagedAppId": {
      // e.g. Microsoft.WindowsCalculator_8wekyb3d8bbwe!App → WindowsCalculator
      // Or Microsoft.OutlookForWindows_8wekyb3d8bbwe!Microsoft.OutlookforWindows
      // Algorithm: take the part BEFORE the first underscore, then drop
      // the publisher prefix (everything up to and including the first dot).
      const parts = value.split("!");
      const pkgId = parts[0] || value; // before ! (or full string)
      const underscoreIdx = pkgId.indexOf("_");
      if (underscoreIdx > 0) {
        const beforeUnderscore = pkgId.slice(0, underscoreIdx);
        // Drop publisher prefix: everything up to and including the first dot
        const dotIdx = beforeUnderscore.indexOf(".");
        if (dotIdx >= 0) {
          return beforeUnderscore.slice(dotIdx + 1);
        }
        // No dot found — just take the whole beforeUnderscore
        return beforeUnderscore;
      }
      // Fallback: strip publisher and trailing segments
      const segments = pkgId.split(".");
      return segments[segments.length - 1] || value;
    }
    case "desktopAppLink": {
      // e.g. %ALLUSERSPROFILE%\Microsoft\Windows\Start Menu\Programs\Word.lnk
      const lastSegment = value.split(/[\\/]/).pop();
      return lastSegment.replace(/\.lnk$/i, "").trim();
    }
    case "desktopAppId": {
      // e.g. Microsoft.Windows.Explorer → Explorer (last dot segment)
      const segments = value.split(".");
      return segments[segments.length - 1] || value;
    }
  }
  return value;
}

/**
 * Parse a ConfigureStartPins / Export-StartLayout JSON string.
 * @param {string} text
 * @returns {{ pins: import("./state.js").LayoutPin[], errors: string[], applyOnce?: boolean }}
 */
export function fromStartJson(text) {
  /** @type {import("./state.js").LayoutPin[]} */
  const pins = [];
  /** @type string[] */
  const errors = [];

  if (!text || !text.trim()) {
    return { pins: [], errors: ["No input provided."] };
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { pins: [], errors: ["Not valid JSON: " + e.message] };
  }

  if (!parsed || typeof parsed !== "object") {
    return { pins: [], errors: ["Expected a JSON object."] };
  }

  if (!("pinnedList" in parsed) || !Array.isArray(parsed.pinnedList)) {
    return { pins: [], errors: ["No pinnedList array found."] };
  }

  const pinnedList = parsed.pinnedList;

  for (let i = 0; i < pinnedList.length; i++) {
    const entry = pinnedList[i];
    if (!entry || typeof entry !== "object") continue;

    // Check for secondaryTile (Edge site pins) — skip with error
    if (entry.secondaryTile || entry.SecondaryTile) {
      errors.push("Skipped entry " + (i + 1) + ": secondaryTile (Edge site pins) isn't supported");
      continue;
    }

    // Support capitalized KEY: packagedAppID as alias for packagedAppId
    /** @type {string | undefined} */
    let kind;
    /** @type {string | undefined} */
    let value;

    if ("packagedAppId" in entry) {
      kind = "packagedAppId";
      value = /** @type {string} */ (entry.packagedAppId);
    } else if ("packagedAppID" in entry) {
      kind = "packagedAppId";
      value = /** @type {string} */ (entry.packagedAppID);
    } else if ("desktopAppLink" in entry) {
      kind = "desktopAppLink";
      value = /** @type {string} */ (entry.desktopAppLink);
    } else if ("desktopAppId" in entry) {
      kind = "desktopAppId";
      value = /** @type {string} */ (entry.desktopAppId);
    } else if ("DesktopAppLink" in entry) {
      kind = "desktopAppLink";
      value = /** @type {string} */ (entry.DesktopAppLink);
    } else if ("DesktopAppId" in entry) {
      kind = "desktopAppId";
      value = /** @type {string} */ (entry.DesktopAppId);
    } else {
      // Unknown key — skip
      continue;
    }

    if (!value) continue;

    const name = entry.Name || entry.name || guessNameFromValue(value, kind);
    const pin = makePin(name, kind, value);
    pins.push(pin);
  }

  const result = { pins, errors };
  // Include applyOnce if present
  if ("applyOnce" in parsed) {
    result.applyOnce = parsed.applyOnce === true;
  }
  return result;
}

/**
 * Validate and create a single manual pin entry.
 * @param {string} name
 * @param {string} kind
 * @param {string} value
 * @returns {{ pins: import("./state.js").LayoutPin[], errors: string[] }}
 */
export function manualPin(name, kind, value) {
  /** @type string[] */
  const errors = [];

  // Trim inputs
  const trimmedName = String(name).trim();
  const trimmedKind = String(kind).trim();
  const trimmedValue = String(value).trim();

  // Validate name
  if (!trimmedName) {
    errors.push("Name is required.");
  }

  // Validate kind
  if (!KNOWN_KINDS.includes(trimmedKind)) {
    errors.push("Invalid kind: '" + trimmedKind + "'. Must be packagedAppId, desktopAppLink, or desktopAppId.");
  }

  // Validate value
  if (!trimmedValue) {
    errors.push("Value is required.");
  }

  // Cross-validate kind with value format
  if (trimmedKind === "packagedAppId" && !trimmedValue.includes("!")) {
    errors.push("A packagedAppId must contain '!' (e.g. Microsoft.WindowsStore_8wekyb3d8bbwe!App).");
  }

  if (trimmedKind === "desktopAppLink" && !/\.lnk$/i.test(trimmedValue)) {
    errors.push("A desktopAppLink must end with .lnk (e.g. %ALLUSERSPROFILE%\\...\\Microsoft Edge.lnk).");
  }

  if (trimmedKind === "desktopAppId" && trimmedValue.includes("!")) {
    errors.push("A desktopAppId should not contain '!' — use packagedAppId for that format.");
  }

  if (errors.length > 0) {
    return { pins: [], errors };
  }

  const pin = makePin(trimmedName, /** @type {typeof KNOWN_KINDS[number]} */ (trimmedKind), trimmedValue);
  return { pins: [pin], errors: [] };
}
