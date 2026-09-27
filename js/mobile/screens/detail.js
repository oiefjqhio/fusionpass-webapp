import { metaRepository } from "../../data/repository/metaRepository.js";
import { watchProgressRepository } from "../../data/repository/watchProgressRepository.js";
import { watchedItemsRepository } from "../../data/repository/watchedItemsRepository.js";
import { savedLibraryRepository } from "../../data/repository/savedLibraryRepository.js";
import { $, $$, esc, icon, lazyImages, toast } from "../dom.js";
import { progressFraction } from "../cards.js";
import { streamsHref } from "./streams.js";

const epNumber = (v) => Number(v.episode ?? v.number ?? 0);
const seasonOf = (v) => Number(v.season ?? 0);

function seasonsOf(meta) {
  const map = new Map();
  (meta.videos || []).forEach((v) => {
    if (v?.season == null) return;
    const s = seasonOf(v);
    if (!map.has(s)) map.set(s, []);
    map.get(s).push(v);
  });
  map.forEach((list) => list.sort((a, b) => epNumber(a) - epNumber(b)));
  // Regular seasons first, specials (season 0) last.
  return [...map.entries()].sort(([a], [b]) => (a === 0) - (b === 0) || a - b);
}

function castOf(meta) {
  if (Array.isArray(meta.cast) && meta.cast.length) return meta.cast.slice(0, 8);
  return (meta.links || []).filter((l) => /cast/i.test(l.category || "")).map((l) => l.name).slice(0, 8);
}

/** What the Play button should start: resume, the next episode, or the first one. */
function pickPlay(meta, type, id, progress, seasons) {
  if (type !== "series" || !seasons.length) {
    const resume = progress && progressFraction(progress) < 0.92 ? progress.positionMs : 0;
    return { label: resume ? "Resume" : "Play", href: streamsHref({ type, id, videoId: id, resumeMs: resume }) };
  }
  const flat = seasons.filter(([s]) => s !== 0).flatMap(([, list]) => list);
  const all = flat.length ? flat : seasons.flatMap(([, list]) => list);
  let target = all[0];
  let resumeMs = 0;
  let label = "Play S1 E1";
  if (progress?.season != null) {
    const idx = all.findIndex((v) => seasonOf(v) === Number(progress.season) && epNumber(v) === Number(progress.episode));
    if (idx >= 0 && progressFraction(progress) < 0.92) {
      target = all[idx];
      resumeMs = progress.positionMs;
    } else if (idx >= 0 && all[idx + 1]) {
      target = all[idx + 1];
    }
  }
  if (target) label = `${resumeMs ? "Resume" : "Play"} S${seasonOf(target)} E${epNumber(target)}`;
  return {
    label,
    href: streamsHref({ type, id, videoId: target?.id || id, season: seasonOf(target), episode: epNumber(target), resumeMs })
  };
}

export async function renderDetail(screen, route, { back }) {
  const [type, id] = route.parts;
  screen.innerHTML = `<div class="fp-detail-hero fp-skel"></div><div class="fp-spinner"></div>`;
  const res = await metaRepository.getMetaFromAllAddons(type, id);
  const meta = res?.status === "success" ? res.data : null;
  if (!meta) {
    screen.innerHTML = `<div class="fp-topbar"><button class="fp-round" data-back>${icon("back")}</button></div><div class="fp-empty"><b>Couldn't load this title</b>Try again in a moment.</div>`;
    $(screen, "[data-back]").onclick = () => back();
    return;
  }
  const realType = meta.type || type;
  const [progress, saved, watched] = await Promise.all([
    watchProgressRepository.getProgressByContentId(id).catch(() => null),
    savedLibraryRepository.isSaved(id).catch(() => false),
    watchedItemsRepository.getAll().catch(() => [])
  ]);
  const seasons = seasonsOf(meta);
  const play = pickPlay(meta, realType, id, progress, seasons);
  const cast = castOf(meta);
  const facts = [
    meta.releaseInfo,
    meta.runtime,
    meta.ageRating ? `<span class="fp-chip">${esc(meta.ageRating)}</span>` : "",
    meta.imdbRating ? `<span class="rate">${icon("star")}${esc(meta.imdbRating)}</span>` : ""
  ].filter(Boolean);
  const watchedKeys = new Set(
    watched.filter((w) => String(w.contentId) === String(id) && w.season != null).map((w) => `${w.season}:${w.episode}`)
  );

  screen.innerHTML = `
    <div class="fp-topbar is-floating"><button class="fp-round" data-back aria-label="Back">${icon("back")}</button></div>
    <div class="fp-detail-hero">${meta.background || meta.poster ? `<img class="bg" src="${esc(meta.background || meta.poster)}" alt="">` : ""}</div>
    <div class="fp-detail-head">
      ${meta.logo ? `<img class="fp-hero-logo" src="${esc(meta.logo)}" alt="${esc(meta.name)}">` : `<div class="fp-hero-title">${esc(meta.name)}</div>`}
      <div class="fp-meta-line">${facts.map((f) => (f.startsWith("<") ? f : `<span>${esc(f)}</span>`)).join("")}</div>
      <div class="fp-meta-line">${(meta.genres || []).slice(0, 4).map((g) => `<span>${esc(g)}</span>`).join("<span>·</span>")}</div>
      <div class="fp-actions">
        <a class="fp-btn is-primary" href="${play.href}">${icon("play")}${esc(play.label)}</a>
        <button class="fp-btn is-ghost is-icon" data-save aria-label="${saved ? "Remove from library" : "Add to library"}">${icon(saved ? "check" : "plus")}</button>
      </div>
    </div>
    <div class="fp-detail-body">
      ${meta.description ? `<p class="fp-desc is-clamped" data-desc>${esc(meta.description)}</p>` : ""}
      ${cast.length ? `<div class="fp-kv"><b>Cast</b> ${esc(cast.join(", "))}</div>` : ""}
      ${meta.director?.length ? `<div class="fp-kv"><b>Director</b> ${esc([].concat(meta.director).join(", "))}</div>` : ""}
    </div>
    ${
      seasons.length
        ? `<div class="fp-seasons">${seasons
            .map(([s], i) => `<button class="fp-season${i === 0 ? " is-on" : ""}" data-season="${s}">${s === 0 ? "Specials" : `Season ${s}`}</button>`)
            .join("")}</div><div class="fp-episodes" data-episodes></div>`
        : ""
    }`;

  $(screen, "[data-back]").onclick = () => back();
  const desc = $(screen, "[data-desc]");
  if (desc) desc.onclick = () => desc.classList.toggle("is-clamped");

  const saveBtn = $(screen, "[data-save]");
  saveBtn.onclick = async () => {
    await savedLibraryRepository.toggle({
      contentId: id,
      contentType: realType,
      title: meta.name,
      poster: meta.poster,
      background: meta.background,
      logo: meta.logo,
      releaseInfo: meta.releaseInfo
    });
    const now = await savedLibraryRepository.isSaved(id);
    saveBtn.innerHTML = icon(now ? "check" : "plus");
    toast(now ? "Added to your library" : "Removed from your library");
  };

  const epHost = $(screen, "[data-episodes]");
  const showSeason = (season) => {
    const list = (seasons.find(([s]) => s === season) || [, []])[1];
    epHost.innerHTML = list
      .map((v) => {
        const ep = epNumber(v);
        const isCurrent = progress?.season != null && Number(progress.season) === season && Number(progress.episode) === ep;
        const frac = isCurrent ? progressFraction(progress) : 0;
        const seen = watchedKeys.has(`${season}:${ep}`);
        const href = streamsHref({
          type: realType,
          id,
          videoId: v.id,
          season,
          episode: ep,
          resumeMs: isCurrent && frac < 0.92 ? progress.positionMs : 0
        });
        const released = v.released ? new Date(v.released) : null;
        const date = released && !Number.isNaN(released.getTime()) ? released.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
        return `
          <a class="fp-ep" href="${href}">
            <div class="thumb fp-skel">
              ${v.thumbnail ? `<img data-src="${esc(v.thumbnail)}" alt="">` : ""}
              ${seen ? `<span class="seen">${icon("check")}</span>` : ""}
              ${frac > 0 && frac < 0.92 ? `<div class="bar"><i style="width:${Math.round(frac * 100)}%"></i></div>` : ""}
            </div>
            <div class="info">
              <div class="t">${ep}. ${esc(v.title || v.name || `Episode ${ep}`)}</div>
              ${date ? `<div class="s">${esc(date)}</div>` : ""}
              ${v.overview || v.description ? `<div class="d">${esc(v.overview || v.description)}</div>` : ""}
            </div>
          </a>`;
      })
      .join("");
    lazyImages(epHost);
  };
  if (epHost) {
    const start = progress?.season != null && seasons.some(([s]) => s === Number(progress.season)) ? Number(progress.season) : seasons[0][0];
    $$(screen, "[data-season]").forEach((b) => {
      b.classList.toggle("is-on", Number(b.dataset.season) === start);
      b.onclick = () => {
        $$(screen, "[data-season]").forEach((x) => x.classList.toggle("is-on", x === b));
        showSeason(Number(b.dataset.season));
      };
    });
    showSeason(start);
  }
}
