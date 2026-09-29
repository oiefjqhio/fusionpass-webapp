import { esc, icon } from "./dom.js";

export const titleHref = (type, id) => `#/title/${encodeURIComponent(type || "movie")}/${encodeURIComponent(id)}`;

/** The "⋯" on a card: opens that card's actions (remove from a list). */
const moreButton = (attr, i) => `<button class="fp-card-more" type="button" ${attr}="${i}" aria-label="More">${icon("more")}</button>`;

/** `more` = index for a remove button (library grid). */
export function posterCard(item, more = null) {
  const img = item.poster
    ? `<img data-src="${esc(item.poster)}" alt="" loading="lazy">`
    : `<div class="fallback">${esc(item.name || item.title || "")}</div>`;
  return `
    <a class="fp-poster" href="${titleHref(item.type || item.contentType, item.id || item.contentId)}">
      <div class="img fp-skel">${img}${more != null ? moreButton("data-lib-more", more) : ""}</div>
      <div class="name">${esc(item.name || item.title || "")}</div>
    </a>`;
}

export function progressFraction(p) {
  const d = Number(p?.durationMs || 0);
  const pos = Number(p?.positionMs || 0);
  return d > 0 ? Math.min(1, Math.max(0, pos / d)) : 0;
}

export function episodeLabel(p) {
  if (p?.season == null || p?.episode == null) return "";
  return `S${p.season} E${p.episode}${p.episodeTitle ? ` · ${p.episodeTitle}` : ""}`;
}

export function continueCard(p, i = 0) {
  const img = p.background || p.poster;
  const sub = p.upNext
    ? `Next · ${episodeLabel(p)}`
    : episodeLabel(p) || (p.durationMs ? `${Math.round((1 - progressFraction(p)) * p.durationMs / 60000)}m left` : "");
  return `
    <a class="fp-wide" href="#" data-resume="${esc(p.contentId)}">
      <div class="img fp-skel">
        ${img ? `<img data-src="${esc(img)}" alt="">` : ""}
        <div class="label">${esc(p.title || "")}${sub ? `<small>${esc(sub)}</small>` : ""}</div>
        ${p.upNext ? "" : `<div class="bar"><i style="width:${Math.round(progressFraction(p) * 100)}%"></i></div>`}
        ${moreButton("data-cw-more", i)}
      </div>
    </a>`;
}

export function railSkeleton(n = 6) {
  return Array.from({ length: n }, () => '<div class="fp-poster"><div class="img fp-skel"></div></div>').join("");
}
