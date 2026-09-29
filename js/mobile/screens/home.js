import { addonRepository } from "../../data/repository/addonRepository.js";
import { catalogRepository } from "../../data/repository/catalogRepository.js";
import { watchProgressRepository } from "../../data/repository/watchProgressRepository.js";
import { HomeCatalogStore } from "../../data/local/homeCatalogStore.js";
import { buildOrderedHomeCatalogItems, catalogSkipStep, catalogSupportsExtra } from "../../core/addons/homeCatalogs.js";
import { StartupSyncService } from "../../core/profile/startupSyncService.js";
import { metaRepository } from "../../data/repository/metaRepository.js";
import { $, $$, actionSheet, el, esc, icon, lazyImages, toast } from "../dom.js";
import { continueCard, posterCard, progressFraction, railSkeleton, titleHref } from "../cards.js";
import { streamsHref } from "./streams.js";

const HERO_COUNT = 6;

async function homeEntries() {
  const addons = await addonRepository.getInstalledAddons();
  const prefs = HomeCatalogStore.get() || {};
  const byId = new Map(addons.map((a) => [a.baseUrl, a]));
  return buildOrderedHomeCatalogItems(addons, [], prefs.order || [], prefs.disabled || [], prefs.customTitles || {})
    .filter((e) => !e.isDisabled && e.addonBaseUrl && e.catalogId)
    .map((e) => {
      const catalog = byId.get(e.addonBaseUrl)?.catalogs?.find((c) => c.id === e.catalogId && c.apiType === e.type) || {};
      return { ...e, supportsSkip: catalogSupportsExtra(catalog, "skip"), skipStep: catalogSkipStep(catalog) };
    });
}

async function loadRow(entry) {
  const res = await catalogRepository.getCatalog({
    addonBaseUrl: entry.addonBaseUrl,
    addonId: entry.addonId,
    addonName: entry.addonName,
    catalogId: entry.catalogId,
    catalogName: entry.catalogName,
    type: entry.type,
    supportsSkip: entry.supportsSkip,
    skipStep: entry.skipStep
  });
  return res?.status === "success" ? res.data?.items || [] : [];
}

/** The released episode after (season, episode) in a series' video list, or null. */
function nextEpisode(meta, season, episode) {
  const now = Date.now();
  const list = (meta?.videos || [])
    .filter((v) => v?.season != null && Number(v.season) > 0)
    .sort((a, b) => Number(a.season) - Number(b.season) || Number(a.episode ?? a.number) - Number(b.episode ?? b.number));
  const i = list.findIndex((v) => Number(v.season) === Number(season) && Number(v.episode ?? v.number) === Number(episode));
  const next = i >= 0 ? list[i + 1] : null;
  if (!next) return null;
  const released = next.released ? Date.parse(next.released) : 0;
  return released && released > now ? null : next;
}

async function continueWatching() {
  const all = await watchProgressRepository.getAllForContinueWatching().catch(() => []);
  const byRecent = all.filter((p) => p?.contentId).sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
  // Latest entry per title: in progress -> resume card; a finished episode -> "Next up" card for the next one.
  const latest = [];
  const seen = new Set();
  for (const p of byRecent) if (!seen.has(p.contentId)) seen.add(p.contentId) && latest.push(p);
  const out = await Promise.all(
    latest.slice(0, 24).map(async (p) => {
      const frac = progressFraction(p);
      if (Number(p.positionMs) > 0 && frac < 0.92) return p;
      if (p.season == null || p.episode == null) return null;
      const res = await metaRepository.getMetaFromAllAddons(p.contentType || "series", p.contentId).catch(() => null);
      const meta = res?.status === "success" ? res.data : null;
      const next = nextEpisode(meta, p.season, p.episode);
      if (!next) return null;
      return {
        ...p,
        upNext: true,
        videoId: next.id,
        season: Number(next.season),
        episode: Number(next.episode ?? next.number),
        episodeTitle: next.title || next.name || null,
        background: next.thumbnail || p.background || meta?.background || null,
        positionMs: 0,
      };
    })
  );
  return out.filter(Boolean).slice(0, 20);
}

function heroMarkup(items) {
  return `
    <section class="fp-hero">
      <div class="fp-hero-track">
        ${items
          .map(
            (it) => `
          <div class="fp-hero-slide">
            <img class="bg" src="${esc(it.background || it.poster)}" alt="">
            <div class="fp-hero-body">
              ${it.logo ? `<img class="fp-hero-logo" src="${esc(it.logo)}" alt="${esc(it.name)}">` : `<div class="fp-hero-title">${esc(it.name)}</div>`}
              <div class="fp-hero-meta">${esc([it.releaseInfo, ...(it.genres || []).slice(0, 3)].filter(Boolean).join(" · "))}</div>
              <div class="fp-hero-actions">
                <a class="fp-btn is-primary" href="${titleHref(it.type, it.id)}">${icon("play")}Watch</a>
                <a class="fp-btn is-ghost" href="${titleHref(it.type, it.id)}">Details</a>
              </div>
            </div>
          </div>`
          )
          .join("")}
      </div>
      <div class="fp-dots" style="position:absolute;left:0;right:0;bottom:4px;z-index:3">${items.map((_, i) => `<i class="${i ? "" : "is-on"}"></i>`).join("")}</div>
    </section>`;
}

export async function renderHome(screen, route, { onDispose }) {
  screen.innerHTML = `
    <section class="fp-hero fp-skel"></section>
    <div data-cw></div>
    <div data-rows>${Array.from({ length: 3 }, () => `<div class="fp-row"><div class="fp-row-head"><span class="fp-row-title">&nbsp;</span></div><div class="fp-rail">${railSkeleton()}</div></div>`).join("")}</div>`;

  let disposed = false;
  // Right after sign-in the local addon list is empty or a fallback; redraw on the first
  // completed pull, and again whenever a later pull changes what home shows.
  let firstPull = true;
  // If sync is slow or fails, show whatever is installed after a few seconds rather than nothing.
  let fallbackTimedOut = false;
  const fallbackTimer = setTimeout(() => {
    fallbackTimedOut = true;
    if (!disposed && $(screen, "[data-rows] .fp-row .fp-skel")) void fill();
  }, 8000);
  const unsubscribe = StartupSyncService.subscribeToPullCompleted?.((event) => {
    if (disposed) return;
    if (firstPull || event?.changedHomeInputs) void Promise.all([fillContinue(), fill()]);
    firstPull = false;
  });
  onDispose(() => {
    clearTimeout(fallbackTimer);
    disposed = true;
    if (typeof unsubscribe === "function") unsubscribe();
  });

  async function fillContinue() {
    const items = await continueWatching();
    const host = $(screen, "[data-cw]");
    if (!host || disposed) return;
    host.innerHTML = items.length
      ? `<div class="fp-row"><div class="fp-row-head"><span class="fp-row-title">Continue Watching</span></div><div class="fp-rail">${items.map((p, i) => continueCard(p, i)).join("")}</div></div>`
      : "";
    $$(host, "[data-cw-more]").forEach((b) =>
      b.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const p = items[Number(b.dataset.cwMore)];
        const pick = await actionSheet({ title: p.title || "", actions: [{ id: "remove", label: "Remove from Continue Watching" }] });
        if (pick !== "remove") return;
        await watchProgressRepository.removeProgress(p.contentId).catch(() => toast("Couldn't remove it. Try again."));
        void fillContinue();
      })
    );
    $$(host, "[data-resume]").forEach((a, i) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const p = items[i];
        window.location.hash = streamsHref({
          type: p.contentType,
          id: p.contentId,
          videoId: p.videoId || p.contentId,
          season: p.season,
          episode: p.episode,
          resumeMs: p.positionMs
        });
      });
    });
    lazyImages(host);
  }

  async function fill() {
    const addons = await addonRepository.getInstalledAddons();
    // Before the first sync after sign-in, Nuvio falls back to its built-in Cinemeta list. Keep
    // the placeholders up until the account's own addons arrive (the pull listener refills).
    const onlyFallback = addons.length > 0 && addons.every((a) => /cinemeta/i.test(a.baseUrl || ""));
    if (onlyFallback && !StartupSyncService.lastPullCompleted && !fallbackTimedOut) return;
    const entries = await homeEntries();
    if (disposed) return;
    const rowsHost = $(screen, "[data-rows]");
    if (!entries.length) {
      $(screen, ".fp-hero")?.remove();
      rowsHost.innerHTML = `<div class="fp-empty"><b>Setting up your pass</b>Your catalogues are syncing. This takes a few seconds on first sign-in.</div>`;
      return;
    }
    const sections = entries.map((entry) =>
        el(`<section class="fp-row" data-key="${esc(entry.key)}">
              <div class="fp-row-head"><span class="fp-row-title">${esc(entry.catalogName)}</span><span class="fp-row-sub">${esc(entry.type === "series" ? "Series" : entry.type === "movie" ? "Movies" : entry.type)}</span></div>
              <div class="fp-rail">${railSkeleton()}</div>
            </section>`)
    );
    rowsHost.replaceChildren(...sections);
    let heroDone = false;
    // Load rows in order, a few at a time, so the first screenful appears fast.
    const queue = entries.map((entry, index) => ({ entry, index }));
    const worker = async () => {
      while (queue.length && !disposed) {
        const { entry, index } = queue.shift();
        const items = await loadRow(entry).catch(() => []);
        if (disposed) return;
        const section = sections[index];
        if (!items.length) {
          section?.remove();
          continue;
        }
        const rail = $(section, ".fp-rail");
        rail.innerHTML = items.slice(0, 30).map(posterCard).join("");
        lazyImages(rail);
        if (!heroDone && index <= 1) {
          const heroItems = items.filter((it) => it.background || it.poster).slice(0, HERO_COUNT);
          if (heroItems.length) {
            heroDone = true;
            const hero = el(heroMarkup(heroItems));
            $(screen, ".fp-hero").replaceWith(hero);
            const track = $(hero, ".fp-hero-track");
            const dots = $$(hero, ".fp-dots i");
            track.addEventListener("scroll", () => {
              const i = Math.round(track.scrollLeft / track.clientWidth);
              dots.forEach((d, j) => d.classList.toggle("is-on", i === j));
            }, { passive: true });
          }
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    if (!heroDone) $(screen, ".fp-hero.fp-skel")?.remove();
  }

  await Promise.all([fillContinue(), fill()]);
}
