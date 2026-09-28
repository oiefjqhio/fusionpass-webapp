#!/usr/bin/env python3
"""Apply the Fusion Pass branding, backend and phone UI to a NuvioTVSmart (Nuvio web) checkout.
Idempotent: run after every upstream sync (git merge upstream/main, then this, commit).

GPL-3.0: this fork's source stays public; Settings > Source code credits Nuvio.
Our own code is js/mobile/ (the phone/tablet UI); everything else stays upstream.
"""
import glob, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = f'{ROOT}/js'
OUT = f'{ROOT}/fusionpass/brand/out'
changed = []


def edit(path, pairs):
    s = open(path, encoding='utf8').read()
    orig = s
    for a, b in pairs:
        if b in s:
            continue  # already applied
        if a not in s:
            sys.exit(f'rebrand: anchor not found in {path}: {a[:80]!r} (upstream changed; update rebrand.py)')
        s = s.replace(a, b)
    if s != orig:
        open(path, 'w', encoding='utf8').write(s)
        changed.append(os.path.relpath(path, ROOT))


def copy(src, dst):
    if not os.path.exists(dst) or open(dst, 'rb').read() != open(src, 'rb').read():
        shutil.copyfile(src, dst)
        changed.append(os.path.relpath(dst, ROOT))


# 1. Logos: every wordmark variant, the mark, and the square app icon used by the phone UI.
for f in glob.glob(f'{ROOT}/assets/brand/app_logo_wordmark*.png'):
    copy(f'{OUT}/app_logo_wordmark.png', f)
copy(f'{OUT}/app_logo_mark.png', f'{ROOT}/assets/brand/app_logo_mark.png')
copy(f'{OUT}/app_icon.png', f'{ROOT}/assets/brand/app_icon.png')
copy(f'{OUT}/app_icon_512.png', f'{ROOT}/assets/brand/app_icon_512.png')
copy(f'{OUT}/app_icon_maskable_512.png', f'{ROOT}/assets/brand/app_icon_maskable_512.png')
copy(f'{OUT}/app_icon_maskable_196.png', f'{ROOT}/assets/brand/app_icon_maskable_196.png')

# 2. Visible text: Nuvio -> Fusion Pass in every language (text between tags only).
for path in glob.glob(f'{ROOT}/res/values*/strings.xml'):
    s = open(path, encoding='utf8').read()
    n = re.sub(r'>([^<]*)<', lambda m: '>' + m.group(1).replace('Nuvio TV', 'Fusion Pass').replace('Nuvio', 'Fusion Pass') + '<', s)
    if n != s:
        open(path, 'w', encoding='utf8').write(n)
        changed.append(os.path.relpath(path, ROOT))
edit(f'{ROOT}/index.html', [
    ('<title>Nuvio TV</title>', '<title>Fusion Pass</title>'),
    ('    <meta name="apple-mobile-web-app-capable" content="yes" />\n',
     '    <meta name="apple-mobile-web-app-capable" content="yes" />\n'
     '    <meta name="apple-mobile-web-app-title" content="Fusion Pass" />\n'
     '    <meta name="apple-mobile-web-app-status-bar-style" content="black" />\n'
     '    <meta name="theme-color" content="#0D0D0D" />\n'
     '    <link rel="manifest" href="manifest.webmanifest" />\n'
     '    <link rel="apple-touch-icon" href="assets/brand/app_icon_maskable_196.png" />\n'
     '    <link rel="icon" type="image/png" href="assets/brand/app_icon.png" />\n'),
])

# 3. Our backend is the built-in one, with email + password sign-in (same as our TV app).
edit(f'{J}/data/local/serverConfigurationStore.js', [
    ('capabilities: { emailPasswordAuth: false, tvLogin: true },',
     'capabilities: { emailPasswordAuth: true, tvLogin: true }, // Fusion Pass: our self-hosted backend'),
])

# 4. Phones and tablets boot the Fusion Pass touch UI (js/mobile/); TVs and desktops keep the TV UI.
A = f'{J}/app.js'
edit(A, [
    ('import { renderAddonRemotePage } from "./bootstrap/renderAddonRemotePage.js";\n',
     'import { renderAddonRemotePage } from "./bootstrap/renderAddonRemotePage.js";\n'
     'import { isMobileMode, bootstrapMobileApp } from "./mobile/mobileApp.js"; // Fusion Pass\n'),
])
s = open(A, encoding='utf8').read()
old = 'const bootstrap = isAddonRemoteMode() ? bootstrapAddonRemoteMode : bootstrapApp;'
new = 'const bootstrap = isAddonRemoteMode() ? bootstrapAddonRemoteMode : isMobileMode() ? bootstrapMobileApp : bootstrapApp;'
if old in s:
    open(A, 'w', encoding='utf8').write(s.replace(old, new))
    changed.append('js/app.js (bootstrap)')
elif new not in s:
    sys.exit('rebrand: app.js bootstrap selector not found (upstream changed; update rebrand.py)')

# 5. Lock-down, same as the Android apps: the account comes fully configured, so no addon manager,
#    plugins, debrid/metadata integrations or tracking in the big-screen UI, and never P2P.
edit(f'{J}/platform/tizen/tizenCapabilities.js', [
    ("""  canUsePlugins(runtime = globalThis) {
    const capabilities = getTizenCapabilities(runtime);
    return !capabilities.isTizen || capabilities.tizenPluginVersionSupported;
  },""", """  canUsePlugins(runtime = globalThis) {
    return false; // Fusion Pass: no plugins
  },"""),
    ("""  isP2pUnsupported(runtime = globalThis) {
    const capabilities = getTizenCapabilities(runtime);""", """  isP2pUnsupported(runtime = globalThis) {
    return true; // Fusion Pass: never P2P
    const capabilities = getTizenCapabilities(runtime);"""),
])
edit(f'{J}/ui/screens/settings/settingsScreenHelpers-08-update-settings-scroll-indicators.js', [
    ("""    if (section.hideFromNav) {
      return false;
    }""", """    if (section.hideFromNav) {
      return false;
    }
    // Fusion Pass: addons, plugins, integrations and tracking are managed for the account.
    if (["contentDiscovery", "plugins", "integration", "trakt"].includes(section.id)) {
      return false;
    }"""),
])
edit(f'{J}/app.js', [
    ("""function isAddonRemoteMode() {
  try {""", """function isAddonRemoteMode() {
  return false; // Fusion Pass: addons are managed for the account, no remote addon manager
  try {"""),
])

# Trailers never autoplay on the detail page (owner report 2026-09-28): on a computer the TV layout's
# autoplayed trailer took over the tab ("Press back to return to details", no Back button) and a click
# on Play restarted it, so nothing could be played. The trailer button still plays one on request.
edit(f'{J}/data/local/playerSettingsStore.js', [
    ('  trailerAutoplay: true,\n', '  trailerAutoplay: false, // Fusion Pass\n'),
    ('    trailerAutoplay: persistentSettings.trailerAutoplay ?? DEFAULTS.trailerAutoplay,', '    trailerAutoplay: false, // Fusion Pass: never, even when synced on from a TV'),
])
edit(f'{J}/ui/screens/settings/settingsScreenPlaybackMarkup-02-audio.js', [
    ("""            ${this.renderToggleRow({
              focusKey: "playback:trailer",
              title: t("settings.playback.autoplayTrailer.title"),
              subtitle: t("settings.playback.autoplayTrailer.subtitle"),
              checked: Boolean(model.player.trailerAutoplay)
            })}
            ${model.player.trailerAutoplay ? this.renderActionRow({ focusKey: "playback:trailerDelay", title: t("audio_trailer_delay"), subtitle: t("audio_trailer_delay_sub", {}, "Delay before trailer playback starts"), value: `${model.player.trailerDelaySeconds ?? 7}s` }) : ""}
""", """            ${"" /* Fusion Pass: no trailer autoplay setting */}
"""),
])

# Mouse support in the big-screen UI on computers (owner report 2026-09-28: "can't click anything").
# Nuvio only listens to pointer clicks on LG webOS (Magic Remote); a desktop browser got keyboard-only
# navigation, so a click on Play did nothing. Any mouse-driven browser now uses the same pointer path.
edit(f'{J}/ui/navigation/focusEngine.js', [
    ('import { Platform } from "../../platform/index.js";\n',
     'import { Platform } from "../../platform/index.js";\n\n// Fusion Pass: pointer (mouse / Magic Remote) handling on webOS and on any browser with a fine pointer.\n'
     'function fpPointerRemote() {\n  return Platform.isWebOS() || Boolean(globalThis.matchMedia?.("(pointer: fine)")?.matches);\n}\n'),
    ('    if (Platform.isWebOS()) {\n      document.addEventListener("mousemove"', '    if (fpPointerRemote()) {\n      document.addEventListener("mousemove"'),
    ('    if (!Platform.isWebOS()) {\n      return;\n    }\n    this.pendingPointerMoveEvent = event;', '    if (!fpPointerRemote()) {\n      return;\n    }\n    this.pendingPointerMoveEvent = event;'),
    ('  processPointerMove(event) {\n    if (!Platform.isWebOS()) {', '  processPointerMove(event) {\n    if (!fpPointerRemote()) {'),
    ('  handlePointerClick(event) {\n    if (!Platform.isWebOS()) {', '  handlePointerClick(event) {\n    if (!fpPointerRemote()) {'),
])

print('rebrand: ok,', len(changed), 'changes')
for c in changed[:60]:
    print('  ', c)
