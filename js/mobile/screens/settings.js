import { AuthManager } from "../../core/auth/authManager.js";
import { $, esc, icon, actionSheet } from "../dom.js";
import { availablePlayers, getPreferredPlayer, playerLabel, setPreferredPlayer } from "../externalPlayers.js";
import { setLayout } from "../mobileApp.js";

const SITE = "https://fusionpass.shop";

const choiceLabel = (id) => (!id ? "Ask every time" : id === "browser" ? "Play here" : playerLabel(id) || "Ask every time");

export async function renderSettings(screen) {
  const draw = () => {
    screen.innerHTML = `
      <div class="fp-topbar"><h1>Settings</h1></div>
      <div class="fp-section-label">Playback</div>
      <div class="fp-list">
        <button class="fp-list-item" data-player><span class="l">When I pick a source<small>Play here, or open a player app like Outplayer or VLC</small></span><span class="r">${esc(choiceLabel(getPreferredPlayer()))}</span></button>
      </div>
      <div class="fp-section-label">Help</div>
      <div class="fp-list">
        <a class="fp-list-item" href="${SITE}/setup" target="_blank" rel="noopener"><span class="l">Set up another device</span>${icon("chevron")}</a>
        <a class="fp-list-item" href="${SITE}/account" target="_blank" rel="noopener"><span class="l">Your pass<small>Renew, change password, devices</small></span>${icon("chevron")}</a>
        <button class="fp-list-item" data-tv><span class="l">Use the TV layout<small>For big screens. A "Phone layout" button brings you back.</small></span>${icon("chevron")}</button>
      </div>
      <div class="fp-section-label">About</div>
      <div class="fp-list">
        <a class="fp-list-item" href="${SITE}/terms" target="_blank" rel="noopener"><span class="l">Terms</span>${icon("chevron")}</a>
        <a class="fp-list-item" href="${SITE}/privacy" target="_blank" rel="noopener"><span class="l">Privacy</span>${icon("chevron")}</a>
        <a class="fp-list-item" href="https://github.com/oiefjqhio/fusionpass-webapp" target="_blank" rel="noopener"><span class="l">Source code<small>Based on Nuvio (GPL-3.0)</small></span>${icon("chevron")}</a>
      </div>
      <div class="fp-section-label"></div>
      <div class="fp-list">
        <button class="fp-list-item is-danger" data-signout>${icon("logout")}<span class="l">Sign out</span></button>
      </div>`;
    $(screen, "[data-player]").onclick = async () => {
      const pick = await actionSheet({
        title: "When I pick a source",
        actions: [
          { id: "ask", label: "Ask every time" },
          { id: "browser", label: "Play here" },
          ...availablePlayers().map((p) => ({ id: p.id, label: p.label }))
        ]
      });
      if (!pick) return;
      setPreferredPlayer(pick === "ask" ? "" : pick);
      draw();
    };
    $(screen, "[data-tv]").onclick = () => setLayout("tv");
    $(screen, "[data-signout]").onclick = async () => {
      const ok = await actionSheet({ title: "Sign out of Fusion Pass?", actions: [{ id: "yes", label: "Sign out" }] });
      if (ok === "yes") await AuthManager.signOut();
    };
  };
  draw();
}
