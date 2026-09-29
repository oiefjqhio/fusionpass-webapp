// In-browser player overlay. Playback, HLS and progress saving are Nuvio's PlayerController;
// this file only draws touch controls around its <video id="videoPlayer">.
import { PlayerController } from "../../core/player/playerController.js";
import { subtitleRepository } from "../../data/repository/subtitleRepository.js";
import { PlayerSettingsStore } from "../../data/local/playerSettingsStore.js";
import { skipIntroRepository } from "../../data/repository/skipIntroRepository.js";
import { $, el, esc, icon, actionSheet, toast } from "../dom.js";
import { availablePlayers, openInPlayer } from "../externalPlayers.js";

let host = null;
let video = null;
let session = null;
let idleTimer = 0;
let skips = []; // [{ type, startTime, endTime }] in seconds
let subs = []; // [{ url, lang, label }]
let subBlobUrl = "";

const LANG = { en: "English", eng: "English", tl: "Filipino", tgl: "Filipino", fil: "Filipino" };
const langName = (l) => LANG[String(l || "").toLowerCase()] || String(l || "Subtitles").toUpperCase();

/** SRT (or VTT) text to WebVTT the browser can render. */
function toVtt(text) {
  const t = String(text || "").replace(/^\uFEFF/, "").replace(/\r/g, "");
  if (/^WEBVTT/.test(t)) return t;
  return "WEBVTT\n\n" + t.replace(/^\d+\n(?=\d{2}:\d{2})/gm, "").replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
}

/** Subtitle size from the synced player settings (percent), applied to the browser's cues. */
function applyCueSize() {
  const pct = Number(PlayerSettingsStore.get()?.subtitleStyle?.fontSize) || 100;
  let tag = document.getElementById("fp-cue-size");
  if (!tag) {
    tag = document.createElement("style");
    tag.id = "fp-cue-size";
    document.head.appendChild(tag);
  }
  tag.textContent = `.fp-player video::cue { font-size: ${((1.05 * pct) / 100).toFixed(2)}em; }`;
}

function clearSubtitleTrack() {
  Array.from(video.querySelectorAll("track")).forEach((t) => t.remove());
  if (subBlobUrl) URL.revokeObjectURL(subBlobUrl);
  subBlobUrl = "";
}

async function useSubtitle(sub) {
  clearSubtitleTrack();
  if (!sub) return toast("Subtitles off");
  try {
    const r = await fetch(sub.url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    subBlobUrl = URL.createObjectURL(new Blob([toVtt(await r.text())], { type: "text/vtt" }));
    const track = document.createElement("track");
    track.kind = "subtitles";
    track.label = sub.label;
    track.srclang = sub.lang || "en";
    track.src = subBlobUrl;
    track.default = true;
    video.appendChild(track);
    track.addEventListener("load", () => { if (track.track) track.track.mode = "showing"; });
    if (track.track) track.track.mode = "showing";
    toast(`Subtitles: ${sub.label}`);
  } catch {
    toast("Couldn't load those subtitles");
  }
}

async function loadExtras(context) {
  skips = [];
  subs = [];
  const imdb = context.imdbId || (/^tt\d+/.test(context.itemId || "") ? context.itemId.split(":")[0] : "");
  const [intervals, found] = await Promise.all([
    (context.season != null && context.episode != null
      ? skipIntroRepository.getSkipIntervals(imdb, context.season, context.episode)
      : skipIntroRepository.getMovieSkipIntervals({ imdbId: imdb, contentId: context.itemId, videoId: context.videoId })
    ).catch(() => []),
    subtitleRepository.getSubtitles(context.itemType, context.itemId, context.videoId).catch(() => []),
  ]);
  skips = (intervals || []).filter((i) => i.type === "intro" || i.type === "recap");
  const seen = new Set();
  subs = (found || [])
    .filter((x) => x && x.url && !seen.has(x.url) && seen.add(x.url))
    .map((x, i, all) => {
      const name = langName(x.lang);
      const n = all.slice(0, i).filter((y) => langName(y.lang) === name).length;
      return { url: x.url, lang: x.lang, label: n ? `${name} ${n + 1}` : name };
    });
  $(host, "[data-cc]").hidden = subs.length === 0;
}

const fmt = (sec) => {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
};

function wake() {
  host.classList.remove("is-idle");
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (video && !video.paused) host.classList.add("is-idle");
  }, 3200);
}

function syncButtons() {
  $(host, "[data-toggle]").innerHTML = icon(video.paused ? "play" : "pause");
}

export function mountPlayer(parent) {
  host = el(`
    <div class="fp-player" hidden>
      <video id="videoPlayer" playsinline webkit-playsinline preload="auto"></video>
      <div class="spin"></div>
      <button class="fp-btn is-primary fp-skip" data-skip hidden></button>
      <div class="err"><p data-err>This file can't play in the browser.</p><button class="fp-btn is-accent" data-err-ext>Open in a player app</button><button class="fp-btn is-ghost" data-close2>Close</button></div>
      <div class="ui">
        <div class="top"><button class="fp-round" data-close aria-label="Close">${icon("close")}</button><div class="t" data-title></div><button class="fp-round" data-cc aria-label="Subtitles" hidden>${icon("cc")}</button><button class="fp-round" data-ext aria-label="Open in a player app">${icon("external")}</button><button class="fp-round" data-fs aria-label="Full screen">${icon("expand")}</button></div>
        <div class="mid">
          <button class="fp-round" data-rw aria-label="Back 10 seconds">${icon("rewind")}</button>
          <button class="fp-round big" data-toggle aria-label="Play or pause">${icon("pause")}</button>
          <button class="fp-round" data-ff aria-label="Forward 10 seconds">${icon("forward")}</button>
        </div>
        <div class="bottom">
          <div class="times"><span data-cur>0:00</span><span data-dur>0:00</span></div>
          <input type="range" min="0" max="1000" value="0" data-seek aria-label="Seek">
        </div>
      </div>
    </div>`);
  parent.appendChild(host);
  video = $(host, "video");

  let seeking = false;
  const seek = $(host, "[data-seek]");
  video.addEventListener("timeupdate", () => {
    const d = video.duration || 0;
    $(host, "[data-cur]").textContent = fmt(video.currentTime);
    $(host, "[data-dur]").textContent = fmt(d);
    if (!seeking && d) seek.value = String(Math.round((video.currentTime / d) * 1000));
    const now = video.currentTime;
    const hit = skips.find((i) => now >= i.startTime && now < i.endTime - 1);
    const btn = $(host, "[data-skip]");
    if (hit) {
      btn.textContent = hit.type === "recap" ? "Skip recap" : "Skip intro";
      btn.dataset.to = String(hit.endTime);
      btn.hidden = false;
    } else if (!btn.hidden) btn.hidden = true;
  });
  video.addEventListener("waiting", () => host.classList.add("is-loading"));
  video.addEventListener("playing", () => {
    host.classList.remove("is-loading", "is-error");
    syncButtons();
    wake();
  });
  video.addEventListener("pause", () => {
    syncButtons();
    host.classList.remove("is-idle");
  });
  video.addEventListener("error", () => {
    if (!session) return;
    host.classList.remove("is-loading");
    host.classList.add("is-error");
  });
  video.addEventListener("loadedmetadata", () => {
    host.classList.remove("is-loading");
    if (session?.resumeMs > 0 && !session.resumed) {
      session.resumed = true;
      PlayerController.seekToSeconds?.(session.resumeMs / 1000);
    }
  });

  seek.addEventListener("input", () => {
    seeking = true;
    const d = video.duration || 0;
    $(host, "[data-cur]").textContent = fmt((Number(seek.value) / 1000) * d);
    wake();
  });
  seek.addEventListener("change", () => {
    const d = video.duration || 0;
    if (d) PlayerController.seekToSeconds?.((Number(seek.value) / 1000) * d);
    seeking = false;
  });

  host.addEventListener("click", (e) => {
    if (e.target === video || e.target.classList.contains("ui") || e.target.classList.contains("mid")) {
      if (host.classList.contains("is-idle")) wake();
      else host.classList.add("is-idle");
    }
  });
  $(host, "[data-toggle]").onclick = () => {
    if (video.paused) {
      void video.play().catch(() => {});
      PlayerController.resume?.();
    } else {
      PlayerController.pause?.();
      video.pause();
    }
    wake();
  };
  const jump = (delta) => {
    PlayerController.seekToSeconds?.(Math.max(0, (video.currentTime || 0) + delta));
    wake();
  };
  $(host, "[data-skip]").onclick = (e) => {
    e.stopPropagation();
    PlayerController.seekToSeconds?.(Number(e.currentTarget.dataset.to || 0));
    e.currentTarget.hidden = true;
  };
  $(host, "[data-cc]").onclick = async () => {
    const pick = await actionSheet({
      title: "Subtitles",
      actions: [{ id: "off", label: "Off" }, ...subs.map((x, i) => ({ id: String(i), label: x.label }))],
    });
    if (pick === null) return;
    void useSubtitle(pick === "off" ? null : subs[Number(pick)]);
  };
  $(host, "[data-rw]").onclick = () => jump(-10);
  $(host, "[data-ff]").onclick = () => jump(10);
  $(host, "[data-fs]").onclick = () => {
    if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    else host.requestFullscreen?.();
  };
  const openExternal = async () => {
    const url = session?.url;
    if (!url) return;
    const players = availablePlayers();
    if (!players.length) return toast("No player apps for this device");
    const pick = await actionSheet({ title: "Open in", actions: players.map((p) => ({ id: p.id, label: p.label, icon: "external" })) });
    if (pick) {
      video.pause();
      openInPlayer(pick, url);
    }
  };
  $(host, "[data-ext]").onclick = openExternal;
  $(host, "[data-err-ext]").onclick = openExternal;
  const close = () => window.history.back();
  $(host, "[data-close]").onclick = close;
  $(host, "[data-close2]").onclick = close;
}

export function openPlayer({ url, stream = null, context = {}, resumeMs = 0 }) {
  session = { url, resumeMs, resumed: false };
  host.hidden = false;
  host.classList.remove("is-error", "is-idle");
  host.classList.add("is-loading");
  $(host, "[data-title]").innerHTML = esc(
    [context.title, context.season != null ? `S${context.season} E${context.episode}` : ""].filter(Boolean).join(" · ")
  );
  document.body.style.overflow = "hidden";
  window.location.hash = "#/player";
  const requestHeaders = stream?.behaviorHints?.proxyHeaders?.request || {};
  clearSubtitleTrack();
  applyCueSize();
  $(host, "[data-skip]").hidden = true;
  $(host, "[data-cc]").hidden = true;
  void loadExtras(context);
  void PlayerController.play(url, { ...context, requestHeaders }).catch((error) => {
    console.warn("[fp-mobile] play failed", error);
    host.classList.remove("is-loading");
    host.classList.add("is-error");
  });
  wake();
}

export function closePlayer() {
  if (!session || !host) return;
  session = null;
  // Stop decoding and get the player off screen first; the full teardown (source reset,
  // progress flush) can take a moment on phones, so it runs after the next paint.
  try {
    video.pause();
  } catch {
    // media element already torn down
  }
  host.hidden = true;
  document.body.style.overflow = "";
  clearSubtitleTrack();
  skips = [];
  setTimeout(() => {
    if (session) return; // a new video started in the meantime
    try {
      PlayerController.stop?.();
    } catch (error) {
      console.warn("[fp-mobile] stop failed", error);
    }
  }, 60);
}
