/* Usage (copy this line into any project): */
/* <script type="module" src="js/creator-banner.js"></script> */
/* <creator-banner name="Viktor L" handle="russiantux" avatar="https://github.com/russiantux.png?size=64" */
/*                 href="https://github.com/russiantux" repo=""></creator-banner> */

class CreatorBanner extends HTMLElement {
  static get observedAttributes() {
    return ["name", "handle", "href", "repo", "avatar"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
:host { display: block; position: sticky; top: 0; z-index: 900; }
.bar { font-size: 12px; line-height: 1.4; padding: 4px 16px; background: #f0f0f0; color: #1b1b1b; border-bottom: 1px solid rgba(0,0,0,0.08); }
@media (prefers-color-scheme: dark) { .bar { background: #1b1b1b; color: #e6e6e6; border-bottom-color: rgba(255,255,255,0.08); } }
.inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.badge { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 3px; background: #0078D4; color: #fff; font-weight: 700; font-size: 9px; flex-shrink: 0; }
.badge.has-avatar { background: transparent; border-radius: 50%; overflow: hidden; width: 18px; height: 18px; }
.avatar { width: 18px; height: 18px; border-radius: 50%; display: block; object-fit: cover; }
.label { display: inline; white-space: nowrap; }
.toggle { all: unset; cursor: pointer; color: #005ea2; text-decoration: underline; font-family: inherit; font-size: inherit; display: inline-flex; align-items: center; gap: 4px; }
@media (prefers-color-scheme: dark) { .toggle { color: #73b3e7; } }
.chevron { display: inline-block; transition: transform 0.15s; }
.panel { padding: 12px 16px 16px; background: #f0f0f0; border-bottom: 1px solid rgba(0,0,0,0.08); }
@media (prefers-color-scheme: dark) { .panel { background: #1b1b1b; border-bottom-color: rgba(255,255,255,0.08); } }
.panel-inner { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 600px) { .panel-inner { grid-template-columns: 1fr; } }
.col b { display: block; margin-bottom: 4px; }
.source-link { color: #005ea2; text-decoration: underline; }
@media (prefers-color-scheme: dark) { .source-link { color: #73b3e7; } }
`;

    const slot = document.createElement("slot");
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(slot);
  }

  connectedCallback() {
    this._render();
  }

  attributeChangedCallback() {
    this._render();
  }

  _getAttr(name) {
    return (this.getAttribute(name) || "").trim();
  }

  _getInitials(name) {
    const words = name.trim().split(/\s+/);
    return (words[0]?.[0] || "") + (words.length > 1 ? (words[1][0] || "") : "");
  }

  _render() {
    // Remove any previously rendered bar/panel (keep style + slot).
    this.shadowRoot.querySelectorAll(".bar, .panel").forEach((n) => n.remove());

    const name = this._getAttr("name");
    const handle = this._getAttr("handle");
    const href = this._getAttr("href");
    const repo = this._getAttr("repo");

    // === Collapsed bar ===
    const bar = document.createElement("div");
    bar.className = "bar";

    // Monogram badge: first letter of each word, uppercase.
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.setAttribute("aria-hidden", "true");
    const avatar = this._getAttr("avatar");
    if (avatar.startsWith("https://")) {
      const img = document.createElement("img");
      img.className = "avatar";
      img.setAttribute("src", avatar);
      img.setAttribute("alt", "");
      img.setAttribute("width", "18");
      img.setAttribute("height", "18");
      img.setAttribute("decoding", "async");
      img.setAttribute("referrerpolicy", "no-referrer");
      img.addEventListener("error", () => {
        img.remove();
        badge.textContent = this._getInitials(name);
        badge.classList.remove("has-avatar");
      });
      badge.textContent = "";
      badge.appendChild(img);
      badge.classList.add("has-avatar");
    } else {
      badge.textContent = this._getInitials(name);
    }

    // Label: "A project by {name}" + optional handle.
    const label = document.createElement("span");
    label.className = "label";

    if (href) {
      const a = document.createElement("a");
      a.href = href;
      a.style.color = "inherit";

      const s = document.createElement("strong");
      let linkText = name || "";
      if (handle) linkText += ` (${handle})`;
      s.textContent = linkText;
      a.appendChild(s);

      label.appendChild(a);
    } else {
      const strong = document.createElement("strong");
      strong.textContent = name || "";
      label.appendChild(strong);
      if (handle) {
        const hs = document.createElement("span");
        hs.textContent = ` (${handle})`;
        label.appendChild(hs);
      }
    }

    // Wrap contents in inner div for centring.
    const inner = document.createElement("div");
    inner.className = "inner";

    inner.appendChild(badge);
    inner.appendChild(document.createTextNode("A project by "));
    inner.appendChild(label);

    // Toggle button (expands/collapses panel).
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "toggle";

    // Stable panel ID across re-renders.
    let panelId = this.getAttribute("data-panel-id");
    if (!panelId) {
      panelId = `cb-${Date.now().toString(36)}`;
      this.setAttribute("data-panel-id", panelId);
    }

    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", panelId);

    const chevron = document.createElement("span");
    chevron.className = "chevron";
    chevron.textContent = "▾";

    toggle.appendChild(document.createTextNode("About this site "));
    toggle.appendChild(chevron);

    inner.appendChild(toggle);
    bar.appendChild(inner);

    // === Expanded panel (hidden by default) ===
    const panel = document.createElement("div");
    panel.className = "panel";
    panel.id = panelId;
    panel.setAttribute("hidden", "");

    const panelInner = document.createElement("div");
    panelInner.className = "panel-inner";

    // Column 1: Independent project.
    const col1 = document.createElement("div");
    col1.className = "col";

    const b1 = document.createElement("b");
    b1.textContent = "Independent project";

    const p1 = document.createElement("span");
    p1.textContent = ` Built and maintained by ${name}. Not affiliated with any company or government.`;

    col1.appendChild(b1);
    col1.appendChild(p1);

    // Column 2: Open and private.
    const col2 = document.createElement("div");
    col2.className = "col";

    const b2 = document.createElement("b");
    b2.textContent = "Open and private";

    const p2 = document.createElement("span");
    p2.textContent = " Runs entirely in your browser. Nothing you enter is sent anywhere.";

    col2.appendChild(b2);
    col2.appendChild(p2);

    // Optional source link: only when repo starts with https://.
    if (repo.startsWith("https://")) {
      const a = document.createElement("a");
      a.className = "source-link";
      a.setAttribute("href", repo);

      const srcLabelEl = document.createElement("span");
      srcLabelEl.textContent = "View the source code";
      a.appendChild(srcLabelEl);

      const br = document.createElement("br");
      col2.appendChild(br);
      col2.appendChild(a);
    }

    panelInner.appendChild(col1);
    panelInner.appendChild(col2);
    panel.appendChild(panelInner);

    // Escape: close, return focus to toggle.
    panel.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        panel.setAttribute("hidden", "");
        toggle.setAttribute("aria-expanded", "false");
        chevron.textContent = "▾";
        toggle.focus();
      }
    });

    // Toggle: expand/collapse. Only Escape/close returns focus to toggle.
    toggle.addEventListener("click", () => {
      panel.toggleAttribute("hidden");
      const isOpen = !panel.hasAttribute("hidden");
      toggle.setAttribute("aria-expanded", String(isOpen));
      chevron.textContent = isOpen ? "▴" : "▾";
    });

    this.shadowRoot.appendChild(bar);
    this.shadowRoot.appendChild(panel);
  }
}

if (!customElements.get("creator-banner")) {
  customElements.define("creator-banner", CreatorBanner);
}

export { CreatorBanner };
export default CreatorBanner;
