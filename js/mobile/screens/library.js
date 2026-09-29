import { savedLibraryRepository } from "../../data/repository/savedLibraryRepository.js";
import { $, $$, actionSheet, lazyImages, toast } from "../dom.js";
import { posterCard } from "../cards.js";

let tab = "all";
let items = [];

export async function renderLibrary(screen) {
  items = (await savedLibraryRepository.getAll(500).catch(() => [])).sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
  screen.innerHTML = `
    <div class="fp-topbar"><h1>Library</h1></div>
    <div class="fp-segs">
      <button class="fp-season" data-tab="all">All</button>
      <button class="fp-season" data-tab="movie">Movies</button>
      <button class="fp-season" data-tab="series">Series</button>
    </div>
    <div data-grid></div>`;
  const draw = () => {
    $$(screen, "[data-tab]").forEach((b) => b.classList.toggle("is-on", b.dataset.tab === tab));
    const list = items.filter((it) => tab === "all" || String(it.contentType) === tab);
    const grid = $(screen, "[data-grid]");
    if (!list.length) {
      grid.innerHTML = `<div class="fp-empty"><b>Nothing saved yet</b>Tap + on any title to keep it here. Your library syncs with the TV and phone apps.</div>`;
      return;
    }
    grid.innerHTML = `<div class="fp-grid">${list
      .map((it, i) => posterCard({ id: it.contentId, type: it.contentType, name: it.title, poster: it.poster }, i))
      .join("")}</div>`;
    lazyImages(grid);
    $$(grid, "[data-lib-more]").forEach((b) =>
      b.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const it = list[Number(b.dataset.libMore)];
        const pick = await actionSheet({ title: it.title || "", actions: [{ id: "remove", label: "Remove from Library" }] });
        if (pick !== "remove") return;
        try {
          await savedLibraryRepository.remove(it.contentId);
          items = items.filter((x) => x.contentId !== it.contentId);
          draw();
        } catch {
          toast("Couldn't remove it. Try again.");
        }
      })
    );
  };
  $$(screen, "[data-tab]").forEach((b) => (b.onclick = () => ((tab = b.dataset.tab), draw())));
  draw();
}
