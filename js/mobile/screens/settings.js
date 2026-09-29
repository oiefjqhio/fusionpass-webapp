import { AuthManager } from "../../core/auth/authManager.js";
import { ProfileManager } from "../../core/profile/profileManager.js";
import { PlayerSettingsStore } from "../../data/local/playerSettingsStore.js";
import { $, esc, icon, actionSheet } from "../dom.js";
import { availablePlayers, getPreferredPlayer, playerLabel, setPreferredPlayer } from "../externalPlayers.js";
import { setLayout } from "../mobileApp.js";

const SITE = "https://fusionpass.shop";

// Subtitle size is the apps' synced percentage (subtitleStyle.fontSize, 50-200).
const SUB_SIZES = [
  { id: 75, label: "Small" },
  { id: 100, label: "Normal" },
  { id: 130, label: "Large" },
  { id: 160, label: "Extra large" }
];
const subSize = () => Number(PlayerSettingsStore.get()?.subtitleStyle?.fontSize) || 100;
const subSizeLabel = (n) => SUB_SIZES.reduce((a, b) => (Math.abs(b.id - n) < Math.abs(a.id - n) ? b : a)).label;

const choiceLabel = (id) => (!id ? "Ask every time" : id === "browser" ? "Play here" : playerLabel(id) || "Ask every time");

export async function renderSettings(screen) {
  const profiles = await ProfileManager.getProfiles().catch(() => []);
  const draw = () => {
    const activeId = String(ProfileManager.getActiveProfileId() || profiles[0]?.id || "");
    const active = profiles.find((p) => String(p.id) === activeId);
    screen.innerHTML = `
      <div class="fp-topbar"><h1>Settings</h1></div>
      ${
        profiles.length > 1
          ? `<div class="fp-section-label">Profile</div>
      <div class="fp-list">
        <button class="fp-list-item" data-profile><span class="l">Watching as<small>Each profile has its own list and progress</small></span><span class="r">${esc(active?.name || "Profile")}</span></button>
      </div>`
          : ""
      }
      <div class="fp-section-label">Playback</div>
      <div class="fp-list">
        <button class="fp-list-item" data-player><span class="l">When I pick a source<small>Play here, or open a player app like Outplayer or VLC</small></span><span class="r">${esc(choiceLabel(getPreferredPlayer()))}</span></button>
        <button class="fp-list-item" data-subsize><span class="l">Subtitle size<small>Also used by the TV and phone apps</small></span><span class="r">${esc(subSizeLabel(subSize()))}</span></button>
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
    $(screen, "[data-subsize]").onclick = async () => {
      const pick = await actionSheet({ title: "Subtitle size", actions: SUB_SIZES.map((x) => ({ id: String(x.id), label: x.label })) });
      if (!pick) return;
      const style = PlayerSettingsStore.get()?.subtitleStyle || {};
      PlayerSettingsStore.set({ subtitleStyle: { ...style, fontSize: Number(pick) } });
      draw();
    };
    const profileBtn = $(screen, "[data-profile]");
    if (profileBtn)
      profileBtn.onclick = async () => {
        const pick = await actionSheet({ title: "Who's watching?", actions: profiles.map((p) => ({ id: String(p.id), label: p.name || `Profile ${p.id}` })) });
        if (!pick || pick === activeId) return;
        await ProfileManager.setActiveProfile(pick);
        // Reload so library, progress and addons load for the new profile.
        window.location.hash = "#/home";
        window.location.reload();
      };
    $(screen, "[data-tv]").onclick = () => setLayout("tv");
    $(screen, "[data-signout]").onclick = async () => {
      const ok = await actionSheet({ title: "Sign out of Fusion Pass?", actions: [{ id: "yes", label: "Sign out" }] });
      if (ok === "yes") await AuthManager.signOut();
    };
  };
  draw();
}
