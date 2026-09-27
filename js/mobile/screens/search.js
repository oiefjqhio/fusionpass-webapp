import { addonRepository } from "../../data/repository/addonRepository.js";
import { catalogRepository } from "../../data/repository/catalogRepository.js";
import { catalogSupportsExtra } from "../../core/addons/homeCatalogs.js";
import { $, esc, icon, lazyImages } from "../dom.js";
import { posterCard, railSkeleton } from "../cards.js";

let lastQuery = "";

async function searchCatalogs() {
  const addons = await addonRepository.getInstalledAddons();
  const out = [];
  addons.forEach((addon) =>
    (addon.catalogs || []).forEach((c) => {
      if (catalogSupportsExtra(c, "search")) out.push({ addon, catalog: c });
    })
  );
  return out;
}

export async function renderSearch(screen, route, { onDispose }) {
  screen.innerHTML = `
    <div class="fp-topbar"><h1>Search</h1></div>
    <label class="fp-search">${icon("search")}<input type="search" enterkeyhint="search" placeholder="Movies, shows, anime" value="${esc(lastQuery)}" autocomplete="off"></label>
    <div data-results></div>`;
  const input = $(screen, "input");
  const results = $(screen, "[data-results]");
  const catalogs = await searchCatalogs();
  let token = 0;
  let timer = 0;
  onDispose(() => clearTimeout(timer));

  const run = async (q) => {
    const my = ++token;
    lastQuery = q;
    if (q.length < 2) {
      results.innerHTML = `<div class="fp-empty">Type at least two letters.</div>`;
      return;
    }
    if (!catalogs.length) {
      results.innerHTML = `<div class="fp-empty"><b>Search isn't available yet</b>Your catalogues are still syncing.</div>`;
      return;
    }
    results.innerHTML = catalogs
      .map(({ catalog }, i) => `<section class="fp-row" data-i="${i}"><div class="fp-row-head"><span class="fp-row-title">${esc(catalog.apiType === "series" ? "Series" : catalog.apiType === "movie" ? "Movies" : catalog.name)}</span><span class="fp-row-sub">${esc(catalogs.length > 2 ? catalog.name : "")}</span></div><div class="fp-rail">${railSkeleton(4)}</div></section>`)
      .join("");
    let found = 0;
    await Promise.all(
      catalogs.map(async ({ addon, catalog }, i) => {
        const res = await catalogRepository
          .getCatalog({
            addonBaseUrl: addon.baseUrl,
            addonId: addon.id,
            addonName: addon.displayName,
            catalogId: catalog.id,
            catalogName: catalog.name,
            type: catalog.apiType,
            extraArgs: { search: q }
          })
          .catch(() => null);
        if (my !== token) return;
        const section = results.querySelector(`[data-i="${i}"]`);
        const items = res?.status === "success" ? res.data?.items || [] : [];
        if (!items.length) return section?.remove();
        found += items.length;
        const rail = section.querySelector(".fp-rail");
        rail.innerHTML = items.slice(0, 30).map(posterCard).join("");
        lazyImages(rail);
      })
    );
    if (my === token && !found) results.innerHTML = `<div class="fp-empty"><b>No results</b>Nothing matched “${esc(q)}”.</div>`;
  };

  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => run(input.value.trim()), 450);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      clearTimeout(timer);
      input.blur();
      void run(input.value.trim());
    }
  });
  if (lastQuery) void run(lastQuery);
  else {
    results.innerHTML = "";
    setTimeout(() => input.focus(), 50);
  }
}
