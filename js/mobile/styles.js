// Fusion Pass phone UI styles. Palette and proportions follow the Nuvio phone app
// (ThemeColors.kt / Tokens.kt): near-black ground, neutral greys, our violet accent.
export const MOBILE_CSS = `
html.fp-mobile, html.fp-mobile body {
  --bg: #0D0D0D; --bg-2: #1A1A1A; --card: #242424; --line: #252A2A; --line-2: #3A4040;
  --fg: #F5F7F8; --fg-2: #B8BEC5; --muted: #969CA3; --accent: #7B6CFF; --accent-2: #9C8FFF;
  --danger: #E36A8A; --ok: #66BB6A;
  --safe-t: env(safe-area-inset-top, 0px); --safe-b: env(safe-area-inset-bottom, 0px);
  --tabbar: calc(58px + var(--safe-b));
  width: 100%; height: auto; min-height: 100%; overflow: visible; margin: 0;
  background: var(--bg); color: var(--fg); font-size: 15px; line-height: 1.4;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", Roboto, sans-serif;
  -webkit-text-size-adjust: 100%; -webkit-tap-highlight-color: transparent;
}
html.fp-mobile * { box-sizing: border-box; }
html.fp-mobile #app { width: 100%; height: auto; overflow: visible; }
.fp-i { width: 22px; height: 22px; flex: none; }
button.fp-btn, .fp-btn { appearance: none; border: 0; font: inherit; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 44px; padding: 0 18px; border-radius: 12px; font-weight: 600; font-size: 15px; color: var(--fg); background: var(--card); text-decoration: none; }
.fp-btn.is-primary { background: var(--fg); color: #111; }
.fp-btn.is-accent { background: var(--accent); color: #fff; }
.fp-btn.is-ghost { background: rgba(255,255,255,.08); }
.fp-btn.is-icon { width: 44px; padding: 0; border-radius: 50%; }
.fp-btn:disabled { opacity: .5; }
.fp-btn:active { transform: scale(.97); }

/* App frame */
.fp-screen { min-height: 100vh; padding-bottom: calc(var(--tabbar) + 16px); }
.fp-screen.no-tabs { padding-bottom: calc(var(--safe-b) + 24px); }
.fp-topbar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 10px; padding: calc(var(--safe-t) + 8px) 16px 10px; background: linear-gradient(var(--bg) 60%, rgba(13,13,13,0)); }
.fp-topbar h1 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -.01em; }
.fp-topbar.is-floating { position: fixed; left: 0; right: 0; background: none; pointer-events: none; }
.fp-topbar.is-floating > * { pointer-events: auto; }
.fp-round { width: 40px; height: 40px; border-radius: 50%; border: 0; display: grid; place-items: center; color: #fff; background: rgba(0,0,0,.45); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
.fp-tabbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; height: var(--tabbar); padding-bottom: var(--safe-b); display: grid; grid-template-columns: repeat(4, 1fr); background: rgba(28,28,30,.82); -webkit-backdrop-filter: blur(20px) saturate(1.4); backdrop-filter: blur(20px) saturate(1.4); border-top: 1px solid rgba(255,255,255,.06); }
.fp-tab { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; color: var(--muted); font-size: 11px; font-weight: 600; text-decoration: none; }
.fp-tab .fp-i { width: 24px; height: 24px; }
.fp-tab.is-on { color: var(--fg); }
.fp-tab.is-on .fp-i { color: var(--accent-2); }

/* Hero */
.fp-hero { position: relative; height: min(68vh, 560px); overflow: hidden; }
.fp-hero-track { display: flex; height: 100%; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
.fp-hero-track::-webkit-scrollbar { display: none; }
.fp-hero-slide { position: relative; flex: 0 0 100%; height: 100%; scroll-snap-align: start; }
.fp-hero-slide img.bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.fp-hero-slide::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(13,13,13,.25) 0%, rgba(13,13,13,0) 30%, rgba(13,13,13,.55) 62%, var(--bg) 100%); }
.fp-hero-body { position: absolute; left: 0; right: 0; bottom: 18px; z-index: 2; padding: 0 20px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; }
.fp-hero-logo { max-width: 72%; max-height: 110px; object-fit: contain; filter: drop-shadow(0 2px 12px rgba(0,0,0,.6)); }
.fp-hero-title { font-size: 30px; font-weight: 800; letter-spacing: -.02em; }
.fp-hero-meta { color: var(--fg-2); font-size: 13px; font-weight: 500; }
.fp-hero-actions { display: flex; gap: 10px; width: 100%; max-width: 360px; }
.fp-hero-actions .fp-btn { flex: 1; }
.fp-dots { display: flex; gap: 6px; justify-content: center; margin-top: 4px; }
.fp-dots i { width: 6px; height: 6px; border-radius: 3px; background: rgba(255,255,255,.3); transition: background-color .2s; }
.fp-dots i.is-on { width: 18px; background: #fff; }

/* Rows */
.fp-row { margin-top: 22px; }
.fp-row-head { display: flex; align-items: baseline; justify-content: space-between; padding: 0 16px 10px; }
.fp-row-title { font-size: 18px; font-weight: 700; letter-spacing: -.01em; }
.fp-row-sub { color: var(--muted); font-size: 12px; font-weight: 500; }
.fp-rail { display: flex; gap: 10px; overflow-x: auto; padding: 0 16px; scroll-padding: 0 16px; scroll-snap-type: x proximity; scrollbar-width: none; }
.fp-rail::-webkit-scrollbar { display: none; }
.fp-poster { flex: 0 0 auto; width: 112px; scroll-snap-align: start; text-decoration: none; color: inherit; }
.fp-poster .img { position: relative; aspect-ratio: 2/3; border-radius: 10px; overflow: hidden; background: var(--card); }
.fp-poster img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fp-poster .name { margin-top: 6px; font-size: 12px; color: var(--fg-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fp-poster .img .fallback { position: absolute; inset: 0; display: grid; place-items: center; padding: 8px; text-align: center; font-size: 12px; color: var(--muted); }
.fp-wide { flex: 0 0 auto; width: 240px; scroll-snap-align: start; text-decoration: none; color: inherit; }
.fp-wide .img { position: relative; aspect-ratio: 16/9; border-radius: 12px; overflow: hidden; background: var(--card); }
.fp-wide img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fp-wide .img::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,.75)); }
.fp-wide .label { position: absolute; left: 10px; right: 10px; bottom: 12px; z-index: 2; font-size: 13px; font-weight: 600; }
.fp-wide .label small { display: block; color: var(--fg-2); font-weight: 500; font-size: 11px; }
.fp-wide .bar { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: rgba(255,255,255,.2); z-index: 3; }
.fp-wide .bar i { display: block; height: 100%; background: var(--accent); }
.fp-card-more { position: absolute; top: 6px; right: 6px; z-index: 4; width: 32px; height: 32px; border: 0; border-radius: 16px; display: grid; place-items: center; background: rgba(0,0,0,.55); color: #fff; padding: 0; }
.fp-card-more svg { width: 18px; height: 18px; }
.fp-skel { background: linear-gradient(90deg, #1b1b1b, #262626, #1b1b1b); background-size: 200% 100%; animation: fp-sk 1.2s infinite linear; }
@keyframes fp-sk { to { background-position: -200% 0; } }

/* Detail */
.fp-detail-hero { position: relative; height: 56vh; min-height: 340px; }
.fp-detail-hero img.bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.fp-detail-hero::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(13,13,13,.3), rgba(13,13,13,0) 35%, rgba(13,13,13,.7) 75%, var(--bg)); }
.fp-detail-head { position: relative; z-index: 2; margin-top: -120px; padding: 0 20px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; }
.fp-detail-body { padding: 0 20px; }
.fp-meta-line { color: var(--fg-2); font-size: 13px; display: flex; flex-wrap: wrap; gap: 6px 10px; justify-content: center; align-items: center; }
.fp-meta-line .rate { display: inline-flex; align-items: center; gap: 4px; color: #f5c518; font-weight: 700; }
.fp-meta-line .rate .fp-i { width: 14px; height: 14px; }
.fp-chip { display: inline-flex; align-items: center; height: 24px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--line-2); font-size: 11px; color: var(--fg-2); }
.fp-actions { display: flex; gap: 10px; width: 100%; margin-top: 6px; }
.fp-actions .fp-btn.is-primary { flex: 1; }
.fp-desc { color: var(--fg-2); font-size: 14px; line-height: 1.55; margin: 18px 0 0; }
.fp-desc.is-clamped { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.fp-kv { margin-top: 14px; font-size: 13px; color: var(--muted); }
.fp-kv b { color: var(--fg-2); font-weight: 600; }
.fp-seasons { display: flex; gap: 8px; overflow-x: auto; padding: 18px 20px 4px; scroll-padding: 0 20px; scrollbar-width: none; }
.fp-seasons::-webkit-scrollbar { display: none; }
.fp-season { flex: none; height: 34px; padding: 0 14px; border-radius: 17px; border: 0; background: var(--card); color: var(--fg-2); font: inherit; font-size: 13px; font-weight: 600; }
.fp-season.is-on { background: var(--fg); color: #111; }
.fp-episodes { padding: 8px 16px 0; display: flex; flex-direction: column; gap: 12px; }
.fp-ep { display: flex; gap: 12px; align-items: flex-start; text-decoration: none; color: inherit; }
.fp-ep .thumb { position: relative; flex: 0 0 140px; aspect-ratio: 16/9; border-radius: 10px; overflow: hidden; background: var(--card); }
.fp-ep .thumb img { width: 100%; height: 100%; object-fit: cover; }
.fp-ep .thumb .bar { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: rgba(255,255,255,.2); }
.fp-ep .thumb .bar i { display: block; height: 100%; background: var(--accent); }
.fp-ep .thumb .seen { position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; border-radius: 50%; background: var(--accent); display: grid; place-items: center; }
.fp-ep .thumb .seen .fp-i { width: 12px; height: 12px; color: #fff; }
.fp-ep .info { min-width: 0; }
.fp-ep .t { font-size: 14px; font-weight: 600; }
.fp-ep .s { font-size: 12px; color: var(--muted); margin-top: 2px; }
.fp-ep .d { font-size: 12px; color: var(--fg-2); margin-top: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* Streams */
.fp-filter { display: flex; gap: 8px; overflow-x: auto; padding: 4px 16px 12px; scrollbar-width: none; }
.fp-filter::-webkit-scrollbar { display: none; }
.fp-stream-list { display: flex; flex-direction: column; gap: 10px; padding: 0 16px; }
.fp-stream { display: block; width: 100%; text-align: left; border: 0; font: inherit; color: inherit; padding: 12px 14px; border-radius: 12px; background: var(--bg-2); }
.fp-stream:active { background: var(--card); }
.fp-stream .n { font-size: 13px; font-weight: 700; white-space: pre-line; }
.fp-stream .d { font-size: 12px; color: var(--fg-2); margin-top: 4px; white-space: pre-line; word-break: break-word; }
.fp-stream .a { font-size: 11px; color: var(--muted); margin-top: 6px; }
.fp-stream-head { display: flex; gap: 12px; align-items: center; padding: 0 16px 14px; }
.fp-stream-head img { width: 54px; aspect-ratio: 2/3; object-fit: cover; border-radius: 8px; background: var(--card); }
.fp-stream-head .t { font-size: 17px; font-weight: 700; }
.fp-stream-head .s { font-size: 13px; color: var(--muted); }

/* Search / library / settings */
.fp-search { margin: 0 16px; display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 14px; border-radius: 12px; background: var(--bg-2); color: var(--muted); }
.fp-search input { flex: 1; min-width: 0; height: 100%; background: none; border: 0; outline: 0; color: var(--fg); font: inherit; font-size: 16px; }
.fp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px 10px; padding: 0 16px; }
.fp-grid .fp-poster { width: auto; }
.fp-empty { padding: 60px 32px; text-align: center; color: var(--muted); font-size: 14px; }
.fp-empty b { display: block; color: var(--fg); font-size: 17px; margin-bottom: 6px; }
.fp-list { margin: 0 16px; border-radius: 14px; overflow: hidden; background: var(--bg-2); }
.fp-list-item { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 54px; padding: 10px 16px; border: 0; background: none; color: inherit; font: inherit; text-align: left; text-decoration: none; }
.fp-list-item + .fp-list-item { border-top: 1px solid var(--line); }
.fp-list-item .l { flex: 1; min-width: 0; }
.fp-list-item .l small { display: block; color: var(--muted); font-size: 12px; margin-top: 2px; }
.fp-list-item .r { color: var(--muted); font-size: 14px; }
.fp-list-item.is-danger { color: var(--danger); }
.fp-section-label { padding: 22px 32px 8px; font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.fp-segs { display: flex; gap: 6px; padding: 0 16px 14px; }

/* Login */
.fp-login { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; padding: calc(var(--safe-t) + 24px) 24px calc(var(--safe-b) + 24px); background: radial-gradient(120% 70% at 50% 0%, rgba(123,108,255,.22), rgba(13,13,13,0) 60%), var(--bg); }
.fp-login img.logo { width: 64px; height: 64px; border-radius: 16px; }
.fp-login h1 { font-size: 30px; margin: 22px 0 6px; letter-spacing: -.02em; }
.fp-login p { color: var(--fg-2); margin: 0 0 26px; }
.fp-field { display: block; width: 100%; height: 52px; padding: 0 16px; margin-bottom: 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--bg-2); color: var(--fg); font: inherit; font-size: 16px; outline: 0; }
.fp-field:focus { border-color: var(--accent); }
.fp-login .fp-btn { width: 100%; height: 52px; margin-top: 6px; }
.fp-error { color: var(--danger); font-size: 13px; margin: 4px 0 8px; min-height: 18px; }
.fp-login .foot { margin-top: 22px; font-size: 13px; color: var(--muted); text-align: center; }
.fp-login .foot a { color: var(--accent-2); }

/* Player */
.fp-player { position: fixed; inset: 0; z-index: 50; background: #000; }
.fp-player video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: #000; }
.fp-player .ui { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; background: linear-gradient(rgba(0,0,0,.6), rgba(0,0,0,0) 25%, rgba(0,0,0,0) 70%, rgba(0,0,0,.7)); transition: opacity .25s; }
.fp-player.is-idle .ui { opacity: 0; pointer-events: none; }
/* No live blur over playing video: Firefox on Android re-blurs every frame. */
.fp-player .fp-round { -webkit-backdrop-filter: none; backdrop-filter: none; background: rgba(0,0,0,.55); }
.fp-player .top { display: flex; align-items: center; gap: 10px; padding: calc(var(--safe-t) + 10px) 14px 0; }
.fp-player .top .t { flex: 1; min-width: 0; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fp-player .mid { display: flex; justify-content: center; align-items: center; gap: 44px; }
.fp-player .mid .big { width: 68px; height: 68px; }
.fp-player .mid .big .fp-i { width: 32px; height: 32px; }
.fp-player .bottom { padding: 0 16px calc(var(--safe-b) + 14px); }
.fp-player .times { display: flex; justify-content: space-between; font-size: 12px; color: var(--fg-2); margin-bottom: 6px; font-variant-numeric: tabular-nums; }
.fp-player input[type=range] { width: 100%; accent-color: var(--accent); }
.fp-player .spin { position: absolute; left: 50%; top: 50%; width: 40px; height: 40px; margin: -20px; border-radius: 50%; border: 3px solid rgba(255,255,255,.2); border-top-color: #fff; animation: fp-spin 0.8s linear infinite; display: none; }
.fp-player.is-loading .spin { display: block; }
@keyframes fp-spin { to { transform: rotate(360deg); } }
.fp-player .fp-skip { position: absolute; right: 16px; bottom: calc(var(--safe-b) + 88px); z-index: 5; }
.fp-player video::cue { background: rgba(0,0,0,.6); font-size: 1.05em; }
.fp-player .err { position: absolute; left: 24px; right: 24px; top: 50%; transform: translateY(-50%); text-align: center; display: none; }
.fp-player.is-error .err { display: block; }
.fp-player .err p { color: var(--fg-2); }
.fp-player .err .fp-btn + .fp-btn { margin-left: 8px; }

/* Sheet + toast */
.fp-sheet { position: fixed; inset: 0; z-index: 80; }
.fp-sheet-scrim { position: absolute; inset: 0; background: rgba(0,0,0,.5); opacity: 0; transition: opacity .2s; }
.fp-sheet-panel { position: absolute; left: 0; right: 0; bottom: 0; padding: 8px 12px calc(var(--safe-b) + 12px); background: #1C1C1E; border-radius: 18px 18px 0 0; transform: translateY(100%); transition: transform .22s ease-out; max-height: 80vh; overflow-y: auto; }
.fp-sheet.is-on .fp-sheet-scrim { opacity: 1; }
.fp-sheet.is-on .fp-sheet-panel { transform: none; }
.fp-sheet-grip { width: 36px; height: 5px; border-radius: 3px; background: #48484A; margin: 0 auto 10px; }
.fp-sheet-title { font-weight: 700; font-size: 16px; padding: 4px 8px 0; }
.fp-sheet-sub { color: var(--muted); font-size: 12px; padding: 2px 8px 8px; white-space: pre-line; }
.fp-sheet-actions { background: #2C2C2E; border-radius: 12px; overflow: hidden; }
.fp-sheet-action { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 52px; padding: 0 16px; border: 0; background: none; color: var(--fg); font: inherit; font-size: 16px; text-align: left; }
.fp-sheet-action + .fp-sheet-action { border-top: 1px solid #3A3A3C; }
.fp-sheet-action span { flex: 1; }
.fp-sheet-action small { color: var(--muted); font-size: 12px; }
.fp-sheet-cancel { width: 100%; height: 52px; margin-top: 8px; border: 0; border-radius: 12px; background: #2C2C2E; color: var(--fg); font: inherit; font-size: 16px; font-weight: 600; }
.fp-toast { position: fixed; left: 50%; bottom: calc(var(--tabbar) + 16px); z-index: 90; transform: translate(-50%, 20px); opacity: 0; padding: 10px 16px; border-radius: 20px; background: #2C2C2E; color: var(--fg); font-size: 14px; transition: .2s; pointer-events: none; max-width: calc(100% - 32px); }
.fp-toast.is-on { opacity: 1; transform: translate(-50%, 0); }
.fp-spinner { width: 28px; height: 28px; margin: 40px auto; border-radius: 50%; border: 3px solid rgba(255,255,255,.15); border-top-color: var(--fg); animation: fp-spin .8s linear infinite; }

@media (min-width: 700px) {
  .fp-poster { width: 140px; }
  .fp-wide { width: 300px; }
  .fp-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
  .fp-hero { height: 70vh; }
}
`;
