// Fusion Pass phone UI: a touch-first shell over Nuvio's own core (auth, sync, addons, player).
// Used on phones and tablets; TVs and desktops keep the stock TV interface (see isMobileMode).
import { AuthManager } from "../core/auth/authManager.js";
import { AuthState } from "../core/auth/authState.js";
import { ProfileManager } from "../core/profile/profileManager.js";
import { StartupSyncService } from "../core/profile/startupSyncService.js";
import { PlayerController } from "../core/player/playerController.js";
import { Platform } from "../platform/index.js";
import { I18n } from "../i18n/index.js";
import { warmStreamingLibs } from "../runtime/loadStreamingLibs.js";
import { MOBILE_CSS } from "./styles.js";
import { el, esc, icon } from "./dom.js";
import { renderLogin } from "./screens/login.js";
import { renderHome } from "./screens/home.js";
import { renderDetail } from "./screens/detail.js";
import { renderStreams } from "./screens/streams.js";
import { renderSearch } from "./screens/search.js";
import { renderLibrary } from "./screens/library.js";
import { renderSettings } from "./screens/settings.js";
import { openPlayer, closePlayer, mountPlayer } from "./screens/player.js";

const MODE_KEY = "fp.ui";

// Phones and tablets: touch is the main input and nothing hovers. Touchscreen laptops keep the
// big-screen layout because their main pointer is a trackpad or mouse.
const isTouchDevice = () => Boolean(window.matchMedia?.("(pointer: coarse) and (hover: none)").matches);

// TV browsers and set-top boxes: Samsung, LG, Fire TV (AFT*), Android/Google TV, Sony, Hisense,
// Philips, Chromecast, HbbTV and similar. They get the big-screen (remote-friendly) layout.
const TV_UA = /\b(tizen|web0s|webos|netcast|smart-?tv|smarttv|hbbtv|aft[a-z]{1,4}|android tv|googletv|google tv|bravia|crkey|vidaa|titanos|philipstv|mibox|shield android tv|aquos|roku|appletv|tvos)\b/i;
const isTv = () => window.__NUVIO_PLATFORM__ === "tizen" || TV_UA.test(navigator.userAgent || "");

export function setLayout(mode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // storage blocked: the ?ui= parameter still carries the choice for this load
  }
  const url = new URL(window.location.href);
  url.searchParams.set("ui", mode);
  url.hash = "";
  window.location.replace(url.toString());
}

/** A floating way back to the phone layout while the TV layout is open on a touch device. */
function offerPhoneLayout() {
  const add = () => {
    if (document.getElementById("fp-layout-switch")) return;
    const btn = document.createElement("button");
    btn.id = "fp-layout-switch";
    btn.type = "button";
    btn.textContent = "Phone layout";
    btn.style.cssText =
      "position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:2147483647;" +
      "height:44px;padding:0 18px;border:0;border-radius:22px;background:#7B6CFF;color:#fff;" +
      "font:600 15px -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.45)";
    btn.addEventListener("click", () => setLayout("mobile"));
    // On <html>, not <body>: the TV shell replaces the body's contents while it boots.
    document.documentElement.appendChild(btn);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add, { once: true });
  else add();
}

/** Phones and tablets (coarse pointer) get this UI. ?ui=tv / ?ui=mobile override and stick. */
export function isMobileMode() {
  try {
    const q = new URLSearchParams(window.location.search).get("ui");
    if (q === "tv" || q === "mobile") localStorage.setItem(MODE_KEY, q);
    const saved = localStorage.getItem(MODE_KEY) || q;
    if (saved === "tv") {
      if (isTouchDevice() && !isTv()) offerPhoneLayout();
      return false;
    }
    if (saved === "mobile") return true;
  } catch {
    // storage blocked: fall through to detection
  }
  if (isTv()) return false;
  return isTouchDevice();
}

const TABS = [
  { route: "home", label: "Home", icon: "home" },
  { route: "search", label: "Search", icon: "search" },
  { route: "library", label: "Library", icon: "library" },
  { route: "settings", label: "Settings", icon: "settings" }
];

const SCREENS = {
  login: renderLogin,
  home: renderHome,
  search: renderSearch,
  library: renderLibrary,
  settings: renderSettings,
  title: renderDetail,
  streams: renderStreams
};

let root = null;
let current = { key: "", cleanups: [] };
let signedIn = false;
const scrollMemory = new Map();

export function parseHash(hash = window.location.hash) {
  const raw = String(hash || "").replace(/^#\/?/, "");
  const [path, query = ""] = raw.split("?");
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  return { name: parts[0] || "home", parts: parts.slice(1), query: new URLSearchParams(query) };
}

export function go(path, { replace = false } = {}) {
  const hash = `#/${path.replace(/^\/+/, "")}`;
  if (replace) window.location.replace(hash);
  else window.location.hash = hash;
}

export function back(fallback = "home") {
  if (window.history.length > 1) window.history.back();
  else go(fallback, { replace: true });
}

async function render() {
  const route = parseHash();
  if (!signedIn && route.name !== "login") return go("login", { replace: true });
  if (signedIn && route.name === "login") return go("home", { replace: true });
  if (route.name === "player") return; // the player is an overlay driven by openPlayer()
  closePlayer();

  if (current.key) scrollMemory.set(current.key, window.scrollY);
  current.cleanups.forEach((fn) => {
    try {
      fn();
    } catch (error) {
      console.warn("[fp-mobile] cleanup failed", error);
    }
  });

  const key = window.location.hash;
  const renderer = SCREENS[route.name] || renderHome;
  const isTab = TABS.some((t) => t.route === route.name);
  const screen = el(`<main class="fp-screen${isTab ? "" : " no-tabs"}"></main>`);
  root.replaceChildren(screen);
  if (isTab) root.appendChild(tabBar(route.name));
  window.scrollTo(0, 0);
  const cleanups = [];
  current = { key, cleanups };
  const ctx = { go, back, openPlayer, onDispose: (fn) => cleanups.push(fn) };
  try {
    const ret = await renderer(screen, route, ctx);
    if (typeof ret === "function") cleanups.push(ret);
  } catch (error) {
    console.error("[fp-mobile] screen failed", route.name, error);
    screen.innerHTML = `<div class="fp-empty"><b>Something went wrong</b>${esc(error?.message || "")}</div>`;
  }
  if (current.key !== key) return;
  const y = scrollMemory.get(key);
  if (y) requestAnimationFrame(() => window.scrollTo(0, y));
}

function tabBar(active) {
  return el(`
    <nav class="fp-tabbar" aria-label="Main">
      ${TABS.map(
        (t) => `<a class="fp-tab${t.route === active ? " is-on" : ""}" href="#/${t.route}">${icon(t.icon)}<span>${t.label}</span></a>`
      ).join("")}
    </nav>`);
}

async function enterSignedIn() {
  const profiles = await ProfileManager.getProfiles().catch(() => []);
  const activeId = ProfileManager.getActiveProfileId();
  const profile = profiles.find((p) => String(p.id) === String(activeId)) || profiles[0] || null;
  if (profile) await ProfileManager.setActiveProfile(profile.id);
  // start() resets profile-scoped sync, so it must be enabled through start itself;
  // without it addons, library and progress are never pulled.
  await StartupSyncService.start({ profileScopedSyncEnabled: true, runInitialPull: false });
  StartupSyncService.enableProfileScopedSync();
  void StartupSyncService.requestSyncNow({ force: true, includeProfileSettings: true, notifyPullCompleted: true }).catch((error) => {
    console.warn("[fp-mobile] initial sync failed", error);
  });
  signedIn = true;
  const route = parseHash();
  if (route.name === "login" || !window.location.hash) go("home", { replace: true });
  else render();
}

export async function bootstrapMobileApp() {
  document.documentElement.classList.add("fp-mobile");
  document.title = "Fusion Pass";
  const style = document.createElement("style");
  style.textContent = MOBILE_CSS;
  document.head.appendChild(style);
  const viewport = document.querySelector("meta[name='viewport']");
  viewport?.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");

  document.body.replaceChildren();
  root = el('<div id="fp-root"></div>');
  document.body.appendChild(root);
  mountPlayer(document.body);

  Platform.init();
  await I18n.init();
  PlayerController.init();
  warmStreamingLibs({ delayMs: 2500 });

  window.addEventListener("hashchange", () => void render());
  try {
    // Test hook for headless checks; off unless localStorage fp.debug is set.
    if (localStorage.getItem("fp.debug")) window.fpDebug = { openPlayer, go };
  } catch {
    // storage blocked
  }
  AuthManager.subscribe((state) => {
    if (state === AuthState.SIGNED_OUT) {
      signedIn = false;
      StartupSyncService.stop();
      go("login", { replace: true });
      void render();
    } else if (state === AuthState.AUTHENTICATED && !signedIn) {
      void enterSignedIn();
    }
  });
  await AuthManager.bootstrap();
  if (AuthManager.getAuthState() !== AuthState.AUTHENTICATED) {
    go("login", { replace: true });
    void render();
  }
}
