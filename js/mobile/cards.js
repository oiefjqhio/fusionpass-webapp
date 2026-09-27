import { esc } from "./dom.js";

export const titleHref = (type, id) => `#/title/${encodeURIComponent(type || "movie")}/${encodeURIComponent(id)}`;

export function posterCard(item) {
  const img = item.poster
    ? `<img data-src="${esc(item.poster)}" alt="" loading="lazy">`
    : `<div class="fallback">${esc(item.name || item.title || "")}</div>`;
  return `
    <a class="fp-poster" href="${titleHref(item.type || item.contentType, item.id || item.contentId)}">
      <div class="img fp-skel">${img}</div>
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

export function continueCard(p) {
  const img = p.background || p.poster;
  const sub = episodeLabel(p) || (p.durationMs ? `${Math.round((1 - progressFraction(p)) * p.durationMs / 60000)}m left` : "");
  return `
    <a class="fp-wide" href="#" data-resume="${esc(p.contentId)}">
      <div class="img fp-skel">
        ${img ? `<img data-src="${esc(img)}" alt="">` : ""}
        <div class="label">${esc(p.title || "")}${sub ? `<small>${esc(sub)}</small>` : ""}</div>
        <div class="bar"><i style="width:${Math.round(progressFraction(p) * 100)}%"></i></div>
      </div>
    </a>`;
}

export function railSkeleton(n = 6) {
  return Array.from({ length: n }, () => '<div class="fp-poster"><div class="img fp-skel"></div></div>').join("");
}
