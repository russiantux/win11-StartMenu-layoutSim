import { getTaskbar, reorderTaskbar } from "./state.js";
import { createAppBadge } from "./startmenu.js";

let dragIndex = -1;

export function renderTaskbar(container) {
  container.textContent = "";
  const tb = document.createElement("div");
  tb.className = "taskbar";

  // Start button icon
  const start = document.createElement("span");
  start.className = "taskbar-start";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");
  for (const x of [0, 10.5]) {
    for (const y of [0, 10.5]) {
      const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      r.setAttribute("x", String(x));
      r.setAttribute("y", String(y));
      r.setAttribute("width", "9.5");
      r.setAttribute("height", "9.5");
      r.setAttribute("rx", "1.5");
      r.setAttribute("fill", "#0078D4");
      svg.appendChild(r);
    }
  }
  start.appendChild(svg);
  tb.appendChild(start);

  // App buttons
  const apps = getTaskbar();
  apps.forEach((app, i) => {
    const btn = document.createElement("span");
    btn.className = "taskbar-app";
    btn.title = app.name;
    btn.tabIndex = 0;
    btn.draggable = true;
    btn.dataset.uid = app.uid;
    btn.appendChild(createAppBadge(app.icon, 32));

    btn.addEventListener("dragstart", () => {
      dragIndex = i;
    });
    btn.addEventListener("dragover", (e) => {
      e.preventDefault();
    });
    btn.addEventListener("drop", (e) => {
      e.preventDefault();
      if (dragIndex < 0 || dragIndex === i) return;
      const copy = [...getTaskbar()];
      const [m] = copy.splice(dragIndex, 1);
      copy.splice(i, 0, m);
      reorderTaskbar(copy);
      dragIndex = -1;
    });

    tb.appendChild(btn);
  });

  // Empty state
  if (apps.length === 0) {
    const empty = document.createElement("span");
    empty.className = "taskbar-empty";
    empty.textContent = "Right-click an app → Pin to taskbar";
    tb.appendChild(empty);
  }

  container.appendChild(tb);
}
