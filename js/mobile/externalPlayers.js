// Hand a stream URL to an installed player app. Link formats match the ones Stremio ships
// (stremio-core deep links), which are known to work on iOS and Android.

const ua = () => navigator.userAgent || "";
export const isIOS = () => /iphone|ipad|ipod/i.test(ua()) || (/macintosh/i.test(ua()) && navigator.maxTouchPoints > 1);
export const isAndroid = () => /android/i.test(ua());

const enc = encodeURIComponent;
const androidIntent = (url, pkg = "") => {
  const m = String(url).match(/^(https?):\/\/(.*)$/i);
  if (!m) return url;
  return `intent://${m[2]}#Intent;${pkg ? `package=${pkg};` : ""}type=video/any;scheme=${m[1]};end`;
};

const PLAYERS = [
  { id: "outplayer", label: "Outplayer", platforms: ["ios"], link: (u) => `outplayer://${u}` },
  { id: "vlc", label: "VLC", platforms: ["ios"], link: (u) => `vlc-x-callback://x-callback-url/stream?url=${enc(u)}` },
  { id: "infuse", label: "Infuse", platforms: ["ios"], link: (u) => `infuse://x-callback-url/play?url=${enc(u)}` },
  { id: "vidhub", label: "VidHub", platforms: ["ios"], link: (u) => `open-vidhub://x-callback-url/open?url=${enc(u)}` },
  { id: "android-any", label: "Choose a player", platforms: ["android"], link: (u) => androidIntent(u) },
  { id: "android-vlc", label: "VLC", platforms: ["android"], link: (u) => androidIntent(u, "org.videolan.vlc") },
  { id: "android-mx", label: "MX Player", platforms: ["android"], link: (u) => androidIntent(u, "com.mxtech.videoplayer.ad") },
  { id: "android-just", label: "Just Player", platforms: ["android"], link: (u) => androidIntent(u, "com.brouken.player") }
];

export function availablePlayers() {
  const platform = isIOS() ? "ios" : isAndroid() ? "android" : "desktop";
  return PLAYERS.filter((p) => p.platforms.includes(platform));
}

export function openInPlayer(playerId, url) {
  const p = PLAYERS.find((x) => x.id === playerId);
  if (!p || !url) return false;
  window.location.href = p.link(url);
  return true;
}

const PREF = "fp.mobile.externalPlayer";
export const getPreferredPlayer = () => {
  try {
    return localStorage.getItem(PREF) || "";
  } catch {
    return "";
  }
};
export const setPreferredPlayer = (id) => {
  try {
    if (id) localStorage.setItem(PREF, id);
    else localStorage.removeItem(PREF);
  } catch {
    // storage blocked: the choice just is not remembered
  }
};
export const playerLabel = (id) => PLAYERS.find((p) => p.id === id)?.label || "";
