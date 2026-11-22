/**
 * Export utilities for the Start Menu Layout Editor.
 * Pure functions — no DOM, no module imports.
 */

/** XML-special character escaping helper. */
export function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Known pin kinds we recognise. */
const KNOWN_KINDS = new Set(["packagedAppId", "desktopAppLink", "desktopAppId"]);

/**
 * Export pins as a ConfigureStartPins policy JSON string.
 * @param {import("./state.js").LayoutPin[]} pins - Layout's pinned array.
 * @param {{ applyOnce?: boolean | null, minify?: boolean }} [opts]
 * @returns {string}
 */
export function toStartJson(pins, opts = {}) {
  const { applyOnce = null, minify = false } = opts;

  // Build pinnedList, skipping pins with empty value or unknown kind
  const pinnedList = [];
  for (const pin of pins) {
    if (!pin.value || !KNOWN_KINDS.has(pin.kind)) continue;
    const obj = {};
    obj[pin.kind] = pin.value;
    pinnedList.push(obj);
  }

  /** @type {Record<string, unknown>} */
  const obj = { pinnedList };

  // Include applyOnce only when explicitly true or false (not null)
  if (applyOnce !== null) {
    // Insert as the first key — rebuild with ordering
    const ordered = { applyOnce };
    ordered.pinnedList = pinnedList;
    // Replace the body object
    Object.keys(obj).forEach((k) => delete obj[k]);
    Object.assign(obj, ordered);
  }

  return minify ? JSON.stringify(obj) : JSON.stringify(obj, null, 2);
}

/**
 * Export pins as a LayoutModification XML string (taskbar pin list).
 * @param {import("./state.js").LayoutPin[]} pins - Layout's pinned array.
 * @returns {string} CRLF-delimited XML, 2-space indented.
 */
export function toTaskbarXml(pins) {
  const lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<LayoutModificationTemplate',
    '    xmlns="http://schemas.microsoft.com/Start/2014/LayoutModification"',
    '    xmlns:defaultlayout="http://schemas.microsoft.com/Start/2014/FullDefaultLayout"',
    '    xmlns:start="http://schemas.microsoft.com/Start/2014/StartLayout"',
    '    xmlns:taskbar="http://schemas.microsoft.com/Start/2014/TaskbarLayout"',
    '    Version="1">',
    '  <CustomTaskbarLayoutCollection PinListPlacement="Replace">',
    '    <defaultlayout:TaskbarLayout>',
    '      <taskbar:TaskbarPinList>',
  ];

  for (const pin of pins) {
    if (!pin.value || !KNOWN_KINDS.has(pin.kind)) continue;

    const escapedValue = escapeXml(pin.value);

    switch (pin.kind) {
      case "packagedAppId":
        lines.push(
          '        <taskbar:UWA AppUserModelID="' + escapedValue + '" />'
        );
        break;
      case "desktopAppLink":
        lines.push(
          '        <taskbar:DesktopApp DesktopApplicationLinkPath="' + escapedValue + '" />'
        );
        break;
      case "desktopAppId":
        lines.push(
          '        <taskbar:DesktopApp DesktopApplicationID="' + escapedValue + '" />'
        );
        break;
    }
  }

  const footer = [
    '      </taskbar:TaskbarPinList>',
    '    </defaultlayout:TaskbarLayout>',
    '  </CustomTaskbarLayoutCollection>',
    '</LayoutModificationTemplate>',
  ];

  // CRLF line endings as Windows tools expect
  return (lines.concat(footer).join("\r\n")) + "\r\n";
}

/** OMA-URI paths for ConfigureStartPins policy configuration. */
export const OMA_URI = {
  device: "./Device/Vendor/MSFT/Policy/Config/Start/ConfigureStartPins",
  user: "./User/Vendor/MSFT/Policy/Config/Start/ConfigureStartPins",
};
