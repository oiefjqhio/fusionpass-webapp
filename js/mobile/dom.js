// Fusion Pass phone UI: tiny DOM helpers shared by the mobile screens.

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

export function el(markup) {
  const t = document.createElement("template");
  t.innerHTML = String(markup).trim();
  return t.content.firstElementChild;
}

export const $ = (root, sel) => root.querySelector(sel);
export const $$ = (root, sel) => Array.from(root.querySelectorAll(sel));

// Inline icons (24px viewBox, stroke = currentColor).
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  library: '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill="currentColor" stroke="none"/>',
  logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H4"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  rewind: '<path d="M11 7 5 12l6 5zM19 7l-6 5 6 5z" fill="currentColor" stroke="none"/>',
  forward: '<path d="m13 7 6 5-6 5zM5 7l6 5-6 5z" fill="currentColor" stroke="none"/>',
  cc: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 10.5a2 2 0 1 0 0 3M17 10.5a2 2 0 1 0 0 3"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'
};

export function icon(name, cls = "") {
  return `<svg class="fp-i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ""}</svg>`;
}

export function toast(message, ms = 2600) {
  let host = document.querySelector(".fp-toast");
  if (!host) {
    host = el('<div class="fp-toast" role="status" aria-live="polite"></div>');
    document.body.appendChild(host);
  }
  host.textContent = message;
  host.classList.add("is-on");
  clearTimeout(host._t);
  host._t = setTimeout(() => host.classList.remove("is-on"), ms);
}

/** Bottom sheet with a list of actions; resolves with the chosen action id (or null). */
export function actionSheet({ title = "", subtitle = "", actions = [] }) {
  return new Promise((resolve) => {
    const sheet = el(`
      <div class="fp-sheet" role="dialog" aria-modal="true">
        <div class="fp-sheet-scrim" data-close></div>
        <div class="fp-sheet-panel">
          <div class="fp-sheet-grip"></div>
          ${title ? `<div class="fp-sheet-title">${esc(title)}</div>` : ""}
          ${subtitle ? `<div class="fp-sheet-sub">${esc(subtitle)}</div>` : ""}
          <div class="fp-sheet-actions">
            ${actions
              .map(
                (a) => `<button class="fp-sheet-action" data-id="${esc(a.id)}">${a.icon ? icon(a.icon) : ""}<span>${esc(a.label)}</span>${a.hint ? `<small>${esc(a.hint)}</small>` : ""}</button>`
              )
              .join("")}
          </div>
          <button class="fp-sheet-cancel" data-close>Cancel</button>
        </div>
      </div>`);
    const done = (value) => {
      sheet.classList.remove("is-on");
      setTimeout(() => sheet.remove(), 200);
      resolve(value);
    };
    sheet.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-id]");
      if (btn) return done(btn.dataset.id);
      if (e.target.closest("[data-close]")) done(null);
    });
    document.body.appendChild(sheet);
    requestAnimationFrame(() => sheet.classList.add("is-on"));
  });
}

export function formatMinutes(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Load images only when their row scrolls near the viewport. */
export function lazyImages(root) {
  const imgs = $$(root, "img[data-src]");
  if (!("IntersectionObserver" in window)) {
    imgs.forEach((img) => (img.src = img.dataset.src));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute("data-src");
        io.unobserve(img);
      });
    },
    { rootMargin: "400px 400px" }
  );
  imgs.forEach((img) => io.observe(img));
}
