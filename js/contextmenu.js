/**
 * Context menu — anchored to screen coordinates, keyboard-accessible.
 */

let openMenu = null;
let listeners = [];

function closeContextMenu() {
  if (openMenu) {
    openMenu.remove();
    listeners.forEach(({ target, type, handler, options }) =>
      target.removeEventListener(type, handler, options)
    );
    listeners = [];
    openMenu = null;
  }
}

/**
 * @param {number} x — screen X.
 * @param {number} y — screen Y.
 * @param {{ label: string, action: () => void }[]} items
 */
export function openContextMenu(x, y, items) {
  // Close any existing menu first.
  closeContextMenu();

  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.setAttribute("role", "menu");
  menu.style.position = "fixed";

  const buttons = items.map((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "context-menu-item";
    btn.setAttribute("role", "menuitem");
    btn.textContent = item.label;
    btn.addEventListener("click", () => {
      closeContextMenu();
      item.action();
    });
    menu.appendChild(btn);
    return btn;
  });

  document.body.appendChild(menu);

  // Position — keep within viewport, minimum 8 px from edges.
  const bx = menu.offsetWidth;
  const by = menu.offsetHeight;
  menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - bx - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - by - 8))}px`;

  // Save the element that was focused before opening the menu.
  const previousFocus = document.activeElement;

  // Focus first button.
  buttons[0]?.focus();

  let focusedIndex = 0;
  function updateFocused() {
    focusedIndex = buttons.indexOf(document.activeElement);
    if (focusedIndex === -1) focusedIndex = 0;
  }

  // Keyboard handling.
  const onKeydown = (e) => {
    updateFocused();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusedIndex = (focusedIndex + 1) % buttons.length;
      buttons[focusedIndex].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusedIndex = (focusedIndex - 1 + buttons.length) % buttons.length;
      buttons[focusedIndex].focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeContextMenu();
      previousFocus?.focus();
    } else if (e.key === "Tab") {
      e.preventDefault();
      closeContextMenu();
    }
  };

  // Close on outside interaction.
  const onDocMouseDown = (e) => {
    if (!menu.contains(e.target)) closeContextMenu();
  };
  const onScrollCapture = () => closeContextMenu();
  const onResize = () => closeContextMenu();
  const onBlur = () => closeContextMenu();

  menu.addEventListener("keydown", onKeydown);
  listeners.push({ target: menu, type: "keydown", handler: onKeydown });

  document.addEventListener("mousedown", onDocMouseDown, true);
  listeners.push({ target: document, type: "mousedown", handler: onDocMouseDown, options: true });

  window.addEventListener("scroll", onScrollCapture, { capture: true });
  listeners.push({ target: window, type: "scroll", handler: onScrollCapture, options: { capture: true } });

  window.addEventListener("resize", onResize);
  listeners.push({ target: window, type: "resize", handler: onResize });

  window.addEventListener("blur", onBlur);
  listeners.push({ target: window, type: "blur", handler: onBlur });

  openMenu = menu;
}

export { closeContextMenu };
