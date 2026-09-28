/* eslint-disable no-unused-vars */
import * as internals from "./settingsScreenContext.js";

export function renderPlaybackAudioBody(model) {
  const { t, labelForPlaybackLanguage } = internals;
  return `
          <div class="settings-stack">
            ${"" /* Fusion Pass: no trailer autoplay setting */}
            ${this.renderActionRow({
              focusKey: "playback:audioLanguage",
              title: t("settings.playback.preferredAudio.title"),
              subtitle: t("settings.playback.preferredAudio.subtitle"),
              value: labelForPlaybackLanguage(model.player.preferredAudioLanguage)
            })}
            ${this.renderActionRow({
              focusKey: "playback:secondaryAudioLanguage",
              title: t("sub_secondary_lang", {}, "Secondary Preferred Language"),
              subtitle: t("settings.playback.preferredAudio.subtitle", {}, "Choose the audio language to prefer when it is available."),
              value: labelForPlaybackLanguage(model.player.secondaryPreferredAudioLanguage)
            })}
          </div>
        `;
}
