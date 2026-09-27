import { streamRepository } from "../../data/repository/streamRepository.js";
import { metaRepository } from "../../data/repository/metaRepository.js";
import { $, $$, esc, icon, actionSheet, toast } from "../dom.js";
import { availablePlayers, getPreferredPlayer, openInPlayer, playerLabel } from "../externalPlayers.js";

export function streamsHref({ type, id, videoId, season = null, episode = null, resumeMs = 0 }) {
  const q = new URLSearchParams();
  if (videoId && videoId !== id) q.set("v", videoId);
  if (season != null && episode != null) {
    q.set("s", season);
    q.set("e", episode);
  }
  if (resumeMs > 0) q.set("t", Math.floor(resumeMs));
  const qs = q.toString();
  return `#/streams/${encodeURIComponent(type || "movie")}/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`;
}

// Sources found in this session, so returning from the player (or re-opening a title soon after)
// shows the list at once instead of searching every addon again.
const CACHE_MS = 10 * 60 * 1000;
const recent = new Map();

// Formats browsers can't play (no sound, or software decoding): Dolby/DTS audio, HEVC, Dolby Vision.
const NEEDS_APP = /(?:^|[^a-z0-9])(DD\+|DDP|E-?AC-?3|DTS|TrueHD|Atmos|HEVC|x265|H\.?265|DV|Dolby Vision|REMUX)(?![a-z])/i;
const needsPlayerApp = (s) => Boolean(s?.behaviorHints?.notWebReady) || NEEDS_APP.test(`${s?.name || ""} ${s?.title || ""} ${s?.description || ""}`);

// Fusion Pass plays direct HTTP (debrid, Usenet, HTTP) only; torrent/P2P entries never show.
const playable = (s) => Boolean(s?.url && /^https?:\/\//i.test(s.url)) || Boolean(s?.externalUrl);

function flatten(groups) {
  const out = [];
  (groups || []).forEach((g) =>
    (g.streams || []).forEach((s) => {
      if (playable(s)) out.push({ ...s, addonName: s.addonName || g.addonName || "" });
    })
  );
  return out;
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export async function renderStreams(screen, route, { back, openPlayer, onDispose }) {
  const [type, id] = route.parts;
  const videoId = route.query.get("v") || id;
  const season = route.query.has("s") ? Number(route.query.get("s")) : null;
  const episode = route.query.has("e") ? Number(route.query.get("e")) : null;
  const resumeMs = Number(route.query.get("t") || 0);
  const meta =
    metaRepository.getCachedMeta?.(type, id) ||
    (await metaRepository.getMetaFromAllAddons(type, id).then((r) => (r?.status === "success" ? r.data : null)).catch(() => null));
  const video = (meta?.videos || []).find((v) => v.id === videoId);
  const title = meta?.name || "";
  const sub = season != null ? `S${season} E${episode}${video?.title || video?.name ? ` · ${video.title || video.name}` : ""}` : meta?.releaseInfo || "";

  screen.innerHTML = `
    <div class="fp-topbar"><button class="fp-round" data-back aria-label="Back">${icon("back")}</button><h1 style="font-size:20px">Sources</h1></div>
    <div class="fp-stream-head">
      ${meta?.poster ? `<img src="${esc(meta.poster)}" alt="">` : ""}
      <div><div class="t">${esc(title)}</div><div class="s">${esc(sub)}${resumeMs ? ` · resume at ${Math.floor(resumeMs / 60000)}m` : ""}</div></div>
    </div>
    <div class="fp-filter" data-filter></div>
    <div class="fp-stream-list" data-list><div class="fp-spinner"></div></div>`;
  $(screen, "[data-back]").onclick = () => back();

  let streams = [];
  let filter = "";
  const groups = new Map(); // addonName -> group, as each addon answers
  const asked = new Map(); // addonName -> "searching" | count
  const takeGroups = (list) => {
    (list || []).forEach((g) => g && groups.set(g.addonName || g.addonId || "", g));
    streams = flatten([...groups.values()]);
    groups.forEach((g, name) => asked.set(name, flatten([g]).length));
  };
  let disposed = false;
  const abort = new AbortController();
  onDispose(() => {
    disposed = true;
    abort.abort();
  });

  const draw = () => {
    const addons = [...new Set(streams.map((s) => s.addonName).filter(Boolean))];
    const filterHost = $(screen, "[data-filter]");
    filterHost.innerHTML =
      addons.length > 1
        ? [`<button class="fp-season${filter ? "" : " is-on"}" data-f="">All</button>`, ...addons.map((a) => `<button class="fp-season${filter === a ? " is-on" : ""}" data-f="${esc(a)}">${esc(a)}</button>`)].join("")
        : "";
    $$(filterHost, "[data-f]").forEach((b) => (b.onclick = () => ((filter = b.dataset.f), draw())));
    const list = streams.filter((s) => !filter || s.addonName === filter);
    const host = $(screen, "[data-list]");
    if (!list.length) return;
    host.innerHTML = list
      .map(
        (s, i) => `
        <button class="fp-stream" data-i="${i}">
          <div class="n">${esc(s.name || s.addonName)}</div>
          ${s.title || s.description ? `<div class="d">${esc(s.description || s.title)}</div>` : ""}
          <div class="a">${esc(s.addonName)}${needsPlayerApp(s) ? " · needs a player app" : ""}</div>
        </button>`
      )
      .join("");
    $$(host, "[data-i]").forEach((b) => (b.onclick = () => choose(list[Number(b.dataset.i)])));
  };

  const context = {
    itemId: id,
    itemType: type,
    videoId,
    season,
    episode,
    title,
    poster: meta?.poster || null,
    background: meta?.background || null,
    logo: meta?.logo || null,
    episodeTitle: video?.title || video?.name || null,
    imdbId: /^tt\d+/.test(id) ? id.split(":")[0] : null
  };

  async function choose(stream) {
    if (stream.externalUrl && !stream.url) {
      window.open(stream.externalUrl, "_blank", "noopener");
      return;
    }
    const players = availablePlayers();
    const preferred = getPreferredPlayer();
    if (preferred === "browser") return openPlayer({ url: stream.url, stream, context, resumeMs });
    if (preferred && players.some((p) => p.id === preferred)) return openInPlayer(preferred, stream.url);
    // Phones can't decode Dolby/DTS audio or heavy HEVC in the browser: offer player apps first.
    const appFirst = needsPlayerApp(stream) && players.length > 0;
    const here = { id: "browser", label: "Play here", icon: "play", hint: appFirst ? "may have no sound" : "progress syncs" };
    const apps = players.map((p) => ({ id: p.id, label: p.label, icon: "external" }));
    const pick = await actionSheet({
      title: "Play with",
      subtitle: appFirst ? `${stream.name || ""}\nThis file's audio or video format needs a player app on phones.` : stream.name || "",
      actions: [...(appFirst ? [...apps, here] : [here, ...apps]), { id: "copy", label: "Copy link", icon: "copy" }]
    });
    if (!pick) return;
    if (pick === "browser") openPlayer({ url: stream.url, stream, context, resumeMs });
    else if (pick === "copy") toast((await copy(stream.url)) ? "Link copied" : "Couldn't copy the link");
    else if (!openInPlayer(pick, stream.url)) toast(`Couldn't open ${playerLabel(pick)}`);
  }

  const cacheKey = `${type}|${videoId}`;
  const cached = recent.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_MS && cached.streams.length) {
    streams = cached.streams;
    draw();
    return;
  }

  try {
    const result = await streamRepository.getStreamsFromAllAddons(type, videoId, {
      itemId: id,
      season,
      episode,
      signal: abort.signal,
      onAddon: (addon) => {
        if (disposed || !addon) return;
        if (!asked.has(addon.displayName)) asked.set(addon.displayName, "searching");
      },
      onChunk: (chunk) => {
        if (disposed || chunk?.status !== "success") return;
        takeGroups(chunk.data);
        draw();
      }
    });
    if (disposed) return;
    if (result?.status === "success") takeGroups(result.data);
    else if (Array.isArray(result)) takeGroups(result);
  } catch (error) {
    if (disposed) return;
    console.warn("[fp-mobile] streams failed", error);
  }
  if (streams.length) recent.set(cacheKey, { at: Date.now(), streams });
  if (!streams.length) {
    const names = [...asked.keys()].filter(Boolean);
    const detail = names.length
      ? `Asked ${names.map((n) => esc(n)).join(", ")}: no playable sources came back for this title.`
      : "None of your addons offer sources for this kind of title.";
    $(screen, "[data-list]").innerHTML = `<div class="fp-empty"><b>No sources found</b>${detail}</div>`;
  } else {
    draw();
  }
}
