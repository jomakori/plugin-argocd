// ArgoCD plugin for OpenKite — single self-contained bundle.
//
// The host evaluates this file via `document::eval`, which runs as a
// classic script with no module system, no relative-URL base, and no
// static-file serving for plugin CSS. So this file inlines:
//   1. The full plugin stylesheet (concatenated from src/styles/*.css)
//   2. Every JS module as an IIFE that shares the window.__argocd namespace
//   3. The main entry that registers UI and boots the views
//
// To rebuild after editing src/**, run `scripts/build-bundle.sh`.

(function () {
  if (window.__argocd_injected) return;
  window.__argocd_injected = true;

  // ---- inline CSS ----------------------------------------------------------
  var CSS = "" ;

  CSS = `
    /* ---- src/styles/tokens.css ---- */
    /* Plugin-local tokens for the ArgoCD plugin.
     *
     * The host (assets/main.css) already exposes the design tokens we need
     * for surfaces, type, and status colors. This file only adds a few
     * plugin-local custom properties that don't belong on the host
     * (custom scrollbar, layered shadows). All of them are scoped under
     * \`.argocd-plugin\` so they cannot leak into the host shell.
     */
    .argocd-plugin {
      /* No color or status tokens here — use the host vars directly
       * (var(--green), var(--yellow), var(--red), var(--accent),
       * var(--argo), var(--border), etc.). The host already maps these
       * to the design system and the theme engine. */
      --argo-radius-sm: 6px;
      --argo-radius-md: 8px;
      --argo-shadow-card: 0 1px 3px rgba(0, 0, 0, 0.04),
        0 4px 12px rgba(0, 0, 0, 0.06);
      --argo-shadow-card-hover: 0 4px 16px rgba(0, 0, 0, 0.08),
        0 8px 24px rgba(0, 0, 0, 0.06);
      color-scheme: light;
    }
    
    /* ---- src/styles/cards.css ---- */
    /* Applications grid + card. Mirrors the mockup's \`.app-grid\` /
     * \`.app-card\` (openkite-console.css lines 571-694) with status
     * stripe colors mapped to host tokens. The mobile swipe-to-reveal
     * affordance (mockup lines 590-621) is mirrored too: the
     * \`.card-swipe-actions\` buttons sit behind \`.card-main\`, which
     * slides left when the card carries \`.swiped\`.
     *
     * Status mapping:
     *   Synced       → var(--green)
     *   OutOfSync    → var(--yellow)
     *   Degraded     → var(--red)
     *   Progressing  → var(--accent)
     *   Suspended    → var(--fg-2) (host token, neutral)
     *   Unknown      → var(--fg-2)
     */
    .argocd-plugin .app-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(272px, 1fr));
      gap: 14px;
      padding-bottom: 20px;
    }
    
    .argocd-plugin .app-card {
      position: relative;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      background: var(--bg-1);
      box-shadow: var(--argo-shadow-card);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      transition: transform 0.18s ease, box-shadow 0.18s ease;
      cursor: pointer;
    }
    .argocd-plugin .app-card:hover {
      transform: translateY(-3px);
      box-shadow: var(--argo-shadow-card-hover);
    }
    .argocd-plugin .app-card:active {
      transform: translateY(-1px);
    }
    .argocd-plugin .app-card:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    /* Mobile swipe-to-reveal actions (mockup lines 590-612). Sits behind
     * \`.card-main\`; the buttons are revealed when the card carries
     * \`.swiped\` (see the transform below). */
    .argocd-plugin .app-card .card-swipe-actions {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 112px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 10px;
      background: color-mix(in oklab, var(--argo) 7%, white);
      border-left: 1px solid var(--border);
      /* The actions sit behind an *opaque* card, which hides them visually but not
       * from the tab order or the accessibility tree: without this, a keyboard user
       * tabs onto invisible Sync/Refresh buttons on every card, and Enter fires a
       * real ArgoCD sync with no visible affordance. Hidden has to mean hidden.
       * The delay keeps them visible while the card slides back over them. */
      visibility: hidden;
      transition: visibility 0s linear 0.22s;
    }
    .argocd-plugin .app-card.swiped .card-swipe-actions {
      visibility: visible;
      transition: visibility 0s linear 0s;
    }
    .argocd-plugin .app-card .card-swipe-actions button {
      width: 100%;
      min-height: 44px;
      border: 1px solid var(--border);
      background: var(--bg-2);
      font-size: 11px;
      color: var(--fg-0);
      font-weight: 500;
    }
    .argocd-plugin .app-card .card-swipe-actions button.sync {
      color: var(--green);
    }
    /* \`.card-main\` is opaque so it hides the actions until swiped
     * (mockup \`background: var(--surface)\`). */
    .argocd-plugin .app-card .card-main {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-1);
      transition: transform 0.22s cubic-bezier(0.2, 0.7, 0.2, 1);
    }
    .argocd-plugin .app-card.swiped .card-main {
      transform: translateX(-112px);
    }
    .argocd-plugin .app-card .card-status {
      height: 5px;
      width: 100%;
      flex: 0 0 auto;
    }
    .argocd-plugin .app-card .card-status.synced { background: var(--green); }
    .argocd-plugin .app-card .card-status.outofsync { background: var(--yellow); }
    .argocd-plugin .app-card .card-status.degraded { background: var(--red); }
    .argocd-plugin .app-card .card-status.progressing { background: var(--accent); }
    .argocd-plugin .app-card .card-status.suspended,
    .argocd-plugin .app-card .card-status.unknown { background: var(--fg-2); }
    
    .argocd-plugin .app-card .card-body {
      padding: 16px 16px 14px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    
    .argocd-plugin .app-card .card-title-row {
      display: flex;
      align-items: flex-start;
      gap: 11px;
      padding-right: 36px; /* leave space for kebab */
    }
    .argocd-plugin .app-card .source-icon {
      width: 36px;
      height: 36px;
      flex: 0 0 36px;
      border-radius: var(--r-sm);
      border: 1px solid var(--border);
      background: var(--bg-2);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--fg-2);
    }
    .argocd-plugin .app-card .source-icon .icon {
      width: 18px;
      height: 18px;
    }
    
    .argocd-plugin .app-card .app-name {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: -0.012em;
      margin: 0;
      line-height: 1.2;
      color: var(--fg-0);
    }
    .argocd-plugin .app-card .app-sub {
      font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11.5px;
      color: var(--fg-2);
      margin: 3px 0 0;
    }
    
    .argocd-plugin .app-card .card-menu-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 32px;
      height: 32px;
      min-width: 32px;
      min-height: 32px;
      color: var(--fg-2);
      border-radius: var(--r-sm);
      background: transparent;
      border: 0;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .argocd-plugin .app-card .card-menu-btn:hover {
      background: var(--bg-2);
      color: var(--fg-0);
    }
    
    .argocd-plugin .app-card .card-menu {
      position: absolute;
      top: 44px;
      right: 10px;
      z-index: 5;
      display: flex;
      flex-direction: column;
      min-width: 140px;
      padding: 4px;
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
      background: var(--bg-1);
      box-shadow: var(--argo-shadow-card);
    }
    .argocd-plugin .app-card .card-menu[hidden] { display: none; }
    .argocd-plugin .app-card .card-menu button {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 32px;
      padding: 0 10px;
      border: 0;
      background: transparent;
      color: var(--fg-1);
      font-size: 12px;
      text-align: left;
      cursor: pointer;
      border-radius: 4px;
    }
    .argocd-plugin .app-card .card-menu button:hover {
      background: var(--bg-2);
      color: var(--fg-0);
    }
    
    .argocd-plugin .app-card .tag-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 14px;
    }
    .argocd-plugin .app-card .tag {
      font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10.5px;
      padding: 4px 7px;
      border-radius: 4px;
      background: var(--bg-2);
      border: 1px solid var(--border);
      color: var(--fg-2);
      white-space: nowrap;
    }
    
    .argocd-plugin .app-card .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }
    .argocd-plugin .app-card .badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .argocd-plugin .app-card .pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10.5px;
      padding: 5px 8px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--bg-2);
      color: var(--fg-1);
      font-weight: 500;
    }
    .argocd-plugin .app-card .pill.success { color: var(--green); }
    .argocd-plugin .app-card .pill.warn { color: var(--yellow); }
    .argocd-plugin .app-card .pill.danger { color: var(--red); }
    .argocd-plugin .app-card .pill.info { color: var(--accent); }
    .argocd-plugin .app-card .pill.neutral { color: var(--fg-2); }
    .argocd-plugin .app-card .pill .icon {
      width: 11px;
      height: 11px;
    }
    .argocd-plugin .app-card .card-meta {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10.5px;
      color: var(--fg-2);
    }
    .argocd-plugin .app-card .card-meta .icon {
      width: 13px;
      height: 13px;
    }
    
    /* The render guards every transition globally; this card had no guard, so it
       kept lifting under a reduced-motion preference. The shell variant already
       does this (shell.css) — same pattern, plugin namespace. */
    @media (prefers-reduced-motion: reduce) {
      .argocd-plugin .app-card,
      .argocd-plugin .app-card:hover,
      .argocd-plugin .app-card:active {
        transition: none;
        transform: none;
      }
      .argocd-plugin .app-card .card-main {
        transition: none;
      }
      /* The card does not slide under a reduced-motion preference, so the actions
       * must not wait out the slide before leaving the tab order either. */
      .argocd-plugin .app-card .card-swipe-actions,
      .argocd-plugin .app-card.swiped .card-swipe-actions {
        transition: none;
      }
    }
    
/* ---- src/styles/inspector.css ---- */
    /* Detail slide-over inspector (mockup's \`.inspector\` pattern). */
    .argocd-plugin .inspector-scrim {
      position: fixed;
      inset: 0;
      z-index: 65;
      background: rgba(15, 23, 42, 0.28);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
    }
    .argocd-plugin .inspector-scrim[hidden] { display: none; }
    .argocd-plugin .inspector {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: min(420px, 100%);
      z-index: 70;
      display: flex;
      flex-direction: column;
      background: var(--bg-1);
      border-left: 1px solid var(--border);
      box-shadow: var(--shadow-terminal);
      transform: translateX(100%);
      transition: transform 0.24s ease;
    }
    .argocd-plugin .inspector.open { transform: translateX(0); }
    
    .argocd-plugin .inspector .header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 18px;
      border-bottom: 1px solid var(--border);
    }
    .argocd-plugin .inspector .header h2 {
      font-size: 15px;
      font-weight: 600;
      margin: 0;
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--fg-0);
    }
    .argocd-plugin .inspector .header .close {
      width: 32px;
      height: 32px;
      min-width: 32px;
      min-height: 32px;
      border: 0;
      background: transparent;
      color: var(--fg-2);
      border-radius: var(--r-sm);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .argocd-plugin .inspector .header .close:hover {
      background: var(--bg-2);
      color: var(--fg-0);
    }
    .argocd-plugin .inspector .body {
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding: 16px 18px 24px;
    }
    .argocd-plugin .inspector .summary {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      background: var(--bg-2);
    }
    .argocd-plugin .inspector .summary .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 12px;
    }
    .argocd-plugin .inspector .summary .row .label {
      color: var(--fg-2);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 10.5px;
      font-weight: 600;
    }
    .argocd-plugin .inspector .summary .row .value {
      color: var(--fg-0);
      font-weight: 500;
      font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    
    .argocd-plugin .inspector .group {
      margin-top: 18px;
    }
    .argocd-plugin .inspector .group h3 {
      margin: 0 0 8px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--fg-2);
    }
    .argocd-plugin .inspector .kv-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .argocd-plugin .inspector .kv-list .kv {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 10px;
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
      background: var(--bg-1);
      font-size: 12px;
    }
    .argocd-plugin .inspector .kv-list .kv .k {
      color: var(--fg-2);
    }
    .argocd-plugin .inspector .kv-list .kv .v {
      color: var(--fg-0);
      font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
      text-align: right;
      word-break: break-all;
    }
    
    .argocd-plugin .inspector .history {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .argocd-plugin .inspector .history .entry {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
      background: var(--bg-1);
      font-size: 12px;
    }
    .argocd-plugin .inspector .history .entry .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--fg-2);
      flex: 0 0 auto;
    }
    .argocd-plugin .inspector .history .entry.synced .dot { background: var(--green); }
    .argocd-plugin .inspector .history .entry.outofsync .dot { background: var(--yellow); }
    .argocd-plugin .inspector .history .entry.unknown .dot { background: var(--fg-2); }
    .argocd-plugin .inspector .history .entry .when {
      font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      color: var(--fg-2);
      margin-left: auto;
    }
    
    .argocd-plugin .inspector .resources {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .argocd-plugin .inspector .resources .group-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 10px;
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
      background: var(--bg-1);
      font-size: 12px;
    }
    .argocd-plugin .inspector .resources .group-row .kind {
      color: var(--fg-0);
      font-weight: 500;
    }
    .argocd-plugin .inspector .resources .group-row .count {
      font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
      color: var(--fg-2);
      font-size: 11px;
    }
    
    .argocd-plugin .inspector .actions {
      display: flex;
      gap: 8px;
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    .argocd-plugin .inspector .actions button {
      flex: 1;
      min-height: 32px;
      padding: 0 12px;
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
      background: var(--bg-2);
      color: var(--fg-1);
      font-size: 12px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
    }
    .argocd-plugin .inspector .actions button:hover {
      border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
    }
    .argocd-plugin .inspector .actions .icon {
      width: 14px;
      height: 14px;
    }
    
    @media (prefers-reduced-motion: reduce) {
      .argocd-plugin .inspector {
        transition: none;
      }
    }
    
    /* ---- src/styles/shell.css ---- */
    /* The plugin's overlay shell. Mounts to <body> and covers the host
     * main column while a plugin view is active. Hides itself when the
     * route no longer matches the plugin's own sub-routes (apps,
     * appsets, repos, projects).
     */
    .argocd-shell {
      position: fixed;
      inset: 0;
      z-index: 20;
      display: flex;
      flex-direction: column;
      background: var(--bg-0);
      color: var(--fg-0);
      font-family: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }
    
    .argocd-shell[hidden] {
      display: none;
    }
    
    .argocd-shell .page-head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--border);
      background: color-mix(in srgb, var(--bg-1) 80%, transparent);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    .argocd-shell .eyebrow {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--argo);
    }
    .argocd-shell h1 {
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.015em;
      margin: 4px 0 0;
      color: var(--fg-0);
    }
    .argocd-shell .page-sub {
      margin: 4px 0 0;
      color: var(--fg-2);
      font-size: 13px;
    }
    .argocd-shell .page-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    .argocd-shell .content {
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding: 16px 24px 24px;
    }
    
    .argocd-shell button.refresh,
    .argocd-shell button.secondary {
      min-height: 32px;
      padding: 0 12px;
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
      background: var(--bg-1);
      color: var(--fg-1);
      font-size: 12px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    .argocd-shell button.refresh:hover,
    .argocd-shell button.secondary:hover {
      border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
    }
    .argocd-shell button.refresh.refreshing svg {
      animation: argocd-spin 0.8s linear infinite;
    }
    @keyframes argocd-spin {
      to { transform: rotate(360deg); }
    }
    
    .argocd-shell .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 64px 24px;
      border: 1px dashed var(--border);
      border-radius: var(--r-md);
      background: color-mix(in srgb, var(--bg-1) 60%, transparent);
      text-align: center;
      color: var(--fg-1);
      max-width: 560px;
      margin: 32px auto;
    }
    .argocd-shell .empty h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--fg-0);
    }
    .argocd-shell .empty p {
      margin: 0;
      color: var(--fg-2);
      max-width: 460px;
      font-size: 13px;
    }
    .argocd-shell .empty .install-hint {
      display: block;
      margin-top: 8px;
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
      background: var(--bg-2);
      font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11.5px;
      color: var(--fg-1);
      text-align: left;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .argocd-shell .empty .actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    .argocd-shell .empty .err-label {
      font-size: 11.5px;
      color: var(--fg-2);
      font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
      padding: 4px 8px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--bg-2);
    }
    
    /* Reusable section-head used by stub views (appsets/repos/projects) */
    .argocd-shell .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0 8px;
    }
    .argocd-shell .section-head h2 {
      font-size: 14px;
      font-weight: 600;
      margin: 0;
      color: var(--fg-0);
    }
    .argocd-shell .section-head .badge {
      font-size: 11px;
      font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--bg-2);
      color: var(--fg-2);
    }
    
    /* The stub list (appsets / repos / projects) — same card grid
     * as Applications so the visual is consistent. */
    .argocd-shell .stub-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(272px, 1fr));
      gap: 14px;
    }
    .argocd-shell .stub-card {
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      background: var(--bg-1);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .argocd-shell .stub-card .name {
      font-size: 14px;
      font-weight: 600;
      color: var(--fg-0);
    }
    .argocd-shell .stub-card .sub {
      font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11.5px;
      color: var(--fg-2);
    }
    
    /* Toast for "follow-up" UX (sync / refresh actions surface this). */
    .argocd-shell .toast {
      position: fixed;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      padding: 8px 14px;
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      background: var(--bg-1);
      color: var(--fg-1);
      font-size: 12px;
      box-shadow: var(--argo-shadow-card);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.18s ease, transform 0.18s ease;
      z-index: 100;
    }
    .argocd-shell .toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(-4px);
    }
    
    @media (prefers-reduced-motion: reduce) {
      .argocd-shell .app-card,
      .argocd-shell .app-card:hover {
        transition: none;
        transform: none;
      }
    }
    
  `;


  (function () {
    var style = document.createElement('style');
    style.setAttribute('data-argocd-styles', 'true');
    style.textContent = CSS;
    document.head.appendChild(style);
  })();
})();

(function (root) {


  var SVG_NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k.indexOf('on') === 0 && typeof v === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (k === 'dataset' && v && typeof v === 'object') {
          for (var dk in v) {
            if (Object.prototype.hasOwnProperty.call(v, dk)) {
              node.dataset[dk] = v[dk];
            }
          }
        } else if (v === true) {
          node.setAttribute(k, '');
        } else {
          node.setAttribute(k, String(v));
        }
      }
    }
    if (children) {
      for (var i = 0; i < children.length; i++) {
        var c = children[i];
        if (c == null || c === false) continue;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
    }
    return node;
  }

  function icon(id, size) {
    var wrap = document.createElementNS(SVG_NS, 'svg');
    wrap.setAttribute('class', 'icon');
    wrap.setAttribute('aria-hidden', 'true');
    if (size) {
      wrap.setAttribute('width', String(size));
      wrap.setAttribute('height', String(size));
    }
    var use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#' + id);
    wrap.appendChild(use);
    return wrap;
  }

  function pill(kind, text, iconId) {
    return el('span', { class: 'pill ' + kind }, [iconId ? icon(iconId) : null, text]);
  }

  function sourceIconFor(sourceType) {
    if (sourceType === 'Helm') return 'helm-mark';
    if (sourceType === 'Kustomize') return 'kustomize-mark';
    return 'argo-mark';
  }

  function normalizeStatus(s) {
    if (!s) return 'Unknown';
    var lower = String(s).toLowerCase();
    if (lower === 'synced') return 'Synced';
    if (lower === 'outofsync') return 'OutOfSync';
    if (lower === 'degraded') return 'Degraded';
    if (lower === 'progressing') return 'Progressing';
    if (lower === 'suspended') return 'Suspended';
    if (lower === 'healthy') return 'Healthy';
    if (lower === 'missing') return 'Missing';
    return 'Unknown';
  }

  function relTimeFromHistory(history) {
    if (!Array.isArray(history) || history.length === 0) return '\u2014';
    var last = history[history.length - 1];
    var finished = last.finishedAt || last.deployedAt;
    if (!finished) return '\u2014';
    var t = Date.parse(finished);
    if (Number.isNaN(t)) return '\u2014';
    var delta = (Date.now() - t) / 1000;
    if (delta < 60) return Math.max(1, Math.round(delta)) + 's';
    if (delta < 3600) return Math.round(delta / 60) + 'm';
    if (delta < 86400) return Math.round(delta / 3600) + 'h';
    return Math.round(delta / 86400) + 'd';
  }

  function normalizeApp(raw) {
    var meta = raw.metadata || {};
    var spec = raw.spec || {};
    var status = raw.status || {};
    var source = (spec.sources && spec.sources[0]) || spec.source || {};
    var sourceType =
      (source.chart && 'Helm') ||
      (source.kustomize && 'Kustomize') ||
      (source.repoURL && source.path ? 'Kustomize' : 'Helm') ||
      (source.helm && 'Helm') ||
      'Helm';
    var sync = (status.sync && status.sync.status) || 'Unknown';
    var health = (status.health && status.health.status) || 'Unknown';
    var repo = source.repoURL || '(no repo)';
    var target = '';
    if (source.chart) {
      var name = source.chart.name || '';
      var ver = source.targetRevision || '';
      target = ('chart ' + (ver || '')).trim();
      if (name) target = (name + ' ' + target).trim();
    } else if (source.kustomize) {
      target = ('kustomize ' + (source.targetRevision || '')).trim();
    } else {
      target = source.path || source.targetRevision || '\u2014';
    }
    return {
      uid: meta.uid || (meta.namespace || '') + '/' + (meta.name || Math.random()),
      name: meta.name || '(unnamed)',
      namespace: meta.namespace || 'default',
      project: spec.project || 'default',
      sourceType: sourceType,
      repo: repo,
      target: target,
      sync: normalizeStatus(sync),
      health: normalizeStatus(health),
      lastSync: relTimeFromHistory(status.history),
      __raw: raw,
    };
  }

  function syncToPillKind(sync) {
    switch (sync) {
      case 'Synced': return 'success';
      case 'OutOfSync': return 'warn';
      case 'Degraded': return 'danger';
      case 'Progressing': return 'info';
      default: return 'neutral';
    }
  }

  function healthToPillKind(health) {
    switch (health) {
      case 'Healthy': return 'success';
      case 'Degraded': return 'danger';
      case 'Progressing': return 'info';
      default: return 'neutral';
    }
  }

  function setCardSwipe(card, swiped) {
    card.classList.toggle('swiped', !!swiped);
  }

  function cardFromApp(app, opts) {
    var onOpen = opts && opts.onOpen;
    var onMenu = opts && opts.onMenu;
    var onAction = opts && opts.onAction;
    var card = el('article', {
      class: 'app-card', tabindex: '0', role: 'button',
      'aria-label': app.name + ' card',
      dataset: { app: app.name, ns: app.namespace, sync: app.sync },
    }, [
      el('div', { class: 'card-swipe-actions', 'aria-label': 'Quick actions' }, [
        el('button', {
          type: 'button', class: 'sync',
          onclick: function (e) { e.stopPropagation(); setCardSwipe(card, false); onAction && onAction('sync', app); },
        }, ['Sync']),
        el('button', {
          type: 'button',
          onclick: function (e) { e.stopPropagation(); setCardSwipe(card, false); onAction && onAction('refresh', app); },
        }, ['Refresh']),
      ]),
      el('div', { class: 'card-main' }, [
        el('div', { class: 'card-status ' + app.sync.toLowerCase() }),
        el('div', { class: 'card-body' }, [
          el('button', {
            class: 'card-menu-btn', type: 'button',
            'aria-label': app.name + ' actions',
            'aria-haspopup': 'menu', 'aria-expanded': 'false',
            onclick: function (e) { e.stopPropagation(); onMenu && onMenu(card, app); },
          }, [icon('i-kebab')]),
          el('div', { class: 'card-title-row' }, [
            el('span', { class: 'source-icon' }, [icon(sourceIconFor(app.sourceType))]),
            el('div', null, [
              el('h2', { class: 'app-name', text: app.name }),
              el('p', { class: 'app-sub', text: app.project + ' / ' + app.namespace }),
            ]),
          ]),
          el('div', { class: 'tag-row' }, [
            el('span', { class: 'tag', text: app.repo }),
            el('span', { class: 'tag', text: app.target }),
          ]),
          el('div', { class: 'card-footer' }, [
            el('div', { class: 'badges' }, [
              pill(syncToPillKind(app.sync), app.sync, 'i-sync'),
              pill(healthToPillKind(app.health), app.health, 'i-check'),
            ]),
            el('span', { class: 'card-meta' }, [icon('i-clock'), app.lastSync]),
          ]),
        ]),
      ]),
    ]);
    card.addEventListener('click', function (e) {
      if (e.target.closest('.card-menu-btn')) return;
      if (e.target.closest('.card-menu')) return;
      if (e.target.closest('.card-swipe-actions')) return;
      if (card.classList.contains('swiped')) { setCardSwipe(card, false); return; }
      onOpen && onOpen(app);
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen && onOpen(app); }
    });
    var swipeStart = null;
    card.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      swipeStart = { x: e.clientX, y: e.clientY, id: e.pointerId };
    });
    card.addEventListener('pointerup', function (e) {
      if (!swipeStart || e.pointerId !== swipeStart.id) return;
      var start = swipeStart;
      swipeStart = null;
      var dx = e.clientX - start.x;
      var dy = e.clientY - start.y;
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy)) {
        setCardSwipe(card, dx < 0);
      }
    });
    card.addEventListener('pointercancel', function () { swipeStart = null; });
    card.__argoApp = app;
    card.__onMenuAction = onAction;
    return card;
  }

  function buildCardMenu(card, app) {
    var existing = card.querySelector('.card-menu');
    if (existing) {
      existing.remove();
      card.querySelector('.card-menu-btn').setAttribute('aria-expanded', 'false');
      return;
    }
    var btn = card.querySelector('.card-menu-btn');
    btn.setAttribute('aria-expanded', 'true');
    var menu = el('div', { class: 'card-menu', role: 'menu' }, [
      el('button', { type: 'button', role: 'menuitem',
        onclick: function (e) { e.stopPropagation(); menu.remove(); btn.setAttribute('aria-expanded', 'false'); card.__onMenuAction && card.__onMenuAction('sync', app); },
      }, [icon('i-sync'), 'Sync']),
      el('button', { type: 'button', role: 'menuitem',
        onclick: function (e) { e.stopPropagation(); menu.remove(); btn.setAttribute('aria-expanded', 'false'); card.__onMenuAction && card.__onMenuAction('refresh', app); },
      }, [icon('i-refresh'), 'Refresh']),
    ]);
    card.appendChild(menu);
    var onAway = function (e) {
      if (!card.contains(e.target)) {
        menu.remove();
        btn.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', onAway, true);
      }
    };
    setTimeout(function () { document.addEventListener('click', onAway, true); }, 0);
  }

  root.render = {
    el: el, icon: icon, pill: pill, sourceIconFor: sourceIconFor,
    normalizeApp: normalizeApp, cardFromApp: cardFromApp, buildCardMenu: buildCardMenu,
  };
})(window.__argocd = window.__argocd || {});


(function (root) {
  function classifyError(message) {
    if (!message) return { kind: 'unknown', message: '' };
    if (message.indexOf('no cluster connected') !== -1) return { kind: 'no-cluster', message: message };
    if (message.indexOf('unknown resource kind') !== -1) return { kind: 'no-crd', message: message };
    if (message.indexOf('forbidden') !== -1 || message.indexOf('Unauthorized') !== -1 || message.indexOf('RBAC') !== -1) {
      return { kind: 'rbac', message: message };
    }
    return { kind: 'transient', message: message };
  }

  function extractList(data, mapper) {
    if (!data) return [];
    if (Array.isArray(data)) return data.map(mapper);
    if (Array.isArray(data.items)) return data.items.map(mapper);
    return [];
  }

  function listApplications() {
    if (!window.openkite || !window.openkite.api) return Promise.reject(new Error('bridge not available'));
    return window.openkite.api.list('applications', null).then(function (data) {
      return extractList(data, root.render.normalizeApp);
    });
  }

  function listAppSets() {
    if (!window.openkite || !window.openkite.api) return Promise.reject(new Error('bridge not available'));
    return window.openkite.api.list('applicationsets', null).then(function (data) {
      return extractList(data, root.render.normalizeApp);
    });
  }

  function getApplication(name, ns) {
    if (!window.openkite || !window.openkite.api) return Promise.reject(new Error('bridge not available'));
    return window.openkite.api.get('applications', ns || 'default', name).then(function (data) {
      return root.render.normalizeApp(data);
    });
  }

  root.api = { classifyError: classifyError, listApplications: listApplications, listAppSets: listAppSets, getApplication: getApplication };
})(window.__argocd = window.__argocd || {});


(function (root) {
  var state = {
    bootstrapped: false, installed: false, apps: [], appsets: [],
    appsetsInstalled: false, error: null, errorKind: null,
    route: '/argocd/apps', intervalId: null, lastRefresh: 0,
  };

  function stopRefresh() {
    if (state.intervalId != null) { clearInterval(state.intervalId); state.intervalId = null; }
  }

  function startRefresh(callback, ms) {
    stopRefresh();
    var interval = ms || 10000;
    state.intervalId = setInterval(function () {
      refreshOnce(callback).catch(function () {});
    }, interval);
  }

  function refreshOnce(callback) {
    var api = root.api;
    return Promise.resolve()
      .then(function () { return api.listApplications(); })
      .then(function (apps) {
        state.apps = apps; state.installed = true;
        state.error = null; state.errorKind = null; state.lastRefresh = Date.now();
      })
      .catch(function (err) {
        var classified = api.classifyError(err && err.message);
        state.error = classified.message || String(err);
        state.errorKind = classified.kind;
        if (classified.kind === 'no-crd') state.installed = false;
      })
      .then(function () {
        return api.listAppSets().then(
          function (sets) { state.appsets = sets; state.appsetsInstalled = true; },
          function (err) {
            var classified = api.classifyError(err && err.message);
            if (classified.kind === 'no-crd') { state.appsets = []; state.appsetsInstalled = false; }
          }
        );
      })
      .then(function () { if (typeof callback === 'function') callback(); });
  }

  function setRoute(route) { state.route = route; }

  root.state = state;
  root.stateApi = { startRefresh: startRefresh, stopRefresh: stopRefresh, refreshOnce: refreshOnce, setRoute: setRoute };
})(window.__argocd = window.__argocd || {});


(function (root) {
  function stubApps() {
    return [
      { uid: 'stub/guestbook', name: 'guestbook', namespace: 'demo-apps', project: 'default', sourceType: 'Helm', repo: 'https://github.com/acme/guestbook', target: 'guestbook chart 1.4.2', sync: 'Synced', health: 'Healthy', lastSync: '2m' },
      { uid: 'stub/rollouts', name: 'canary-rollouts', namespace: 'platform', project: 'prod', sourceType: 'Kustomize', repo: 'https://gitlab.com/acme/gitops', target: 'kustomize 5.4', sync: 'OutOfSync', health: 'Healthy', lastSync: '8m' },
      { uid: 'stub/prometheus', name: 'prometheus-stack', namespace: 'infra', project: 'monitoring', sourceType: 'Helm', repo: 'https://github.com/acme/helm-charts', target: 'kube-prometheus-stack chart 58.2.1', sync: 'Synced', health: 'Healthy', lastSync: '1m' },
      { uid: 'stub/cert-manager', name: 'cert-manager', namespace: 'certs', project: 'security', sourceType: 'Helm', repo: 'https://github.com/cert-manager/cert-manager', target: 'cert-manager chart 1.15.0', sync: 'Synced', health: 'Degraded', lastSync: '34m' },
    ];
  }
  root.stub = { apps: stubApps };
})(window.__argocd = window.__argocd || {});


(function (root) {
  var el = root.render.el;
  var icon = root.render.icon;

  function relTime(iso) {
    var t = Date.parse(iso);
    if (Number.isNaN(t)) return iso;
    var delta = (Date.now() - t) / 1000;
    if (delta < 60) return Math.max(1, Math.round(delta)) + 's ago';
    if (delta < 3600) return Math.round(delta / 60) + 'm ago';
    if (delta < 86400) return Math.round(delta / 3600) + 'h ago';
    return Math.round(delta / 86400) + 'd ago';
  }

  function mountDetail(inspector, app, opts) {
    var onClose = opts && opts.onClose;
    var onAction = opts && opts.onAction;
    inspector.replaceChildren();

    var header = el('div', { class: 'header' }, [
      el('h2', { text: app.name }),
      el('button', { class: 'close', type: 'button', 'aria-label': 'Close detail', onclick: function () { onClose && onClose(); } }, [icon('i-close')]),
    ]);

    var body = el('div', { class: 'body' });
    var summaryRows = [['Sync', app.sync, 'i-sync'], ['Health', app.health, 'i-check'], ['Project', app.project, null], ['Namespace', app.namespace, null], ['Source', app.repo, null], ['Target', app.target, null], ['Last sync', app.lastSync, 'i-clock']];
    var summary = el('div', { class: 'summary' });
    for (var i = 0; i < summaryRows.length; i++) {
      var label = summaryRows[i][0]; var value = summaryRows[i][1]; var iconId = summaryRows[i][2];
      var row = el('div', { class: 'row' }, [
        el('span', { class: 'label', text: label }),
        iconId ? el('span', { class: 'value' }, [icon(iconId, 12), ' ', value || '\u2014']) : el('span', { class: 'value', text: value || '\u2014' }),
      ]);
      summary.appendChild(row);
    }
    body.appendChild(summary);

    var raw = app.__raw || null;
    if (raw && raw.status && Array.isArray(raw.status.history)) {
      var group = el('div', { class: 'group' }, [el('h3', { text: 'Sync history' })]);
      var wrap = el('div', { class: 'history' });
      var recent = raw.status.history.slice(-5).reverse();
      for (var j = 0; j < recent.length; j++) {
        var h = recent[j]; var statusText = h.status || 'Unknown';
        var lower = String(statusText).toLowerCase();
        var cls = lower === 'synced' ? 'synced' : lower === 'outofsync' ? 'outofsync' : 'unknown';
        var when = h.finishedAt || h.deployedAt || '';
        var whenText = when ? relTime(when) : '\u2014';
        wrap.appendChild(el('div', { class: 'entry ' + cls }, [el('span', { class: 'dot' }), el('span', { text: statusText }), el('span', { class: 'when', text: whenText })]));
      }
      group.appendChild(wrap); body.appendChild(group);
    }

    if (raw && raw.status && Array.isArray(raw.status.resources)) {
      var counts = {};
      for (var k = 0; k < raw.status.resources.length; k++) {
        var r = raw.status.resources[k]; var kind = r.kind || 'Unknown';
        counts[kind] = (counts[kind] || 0) + 1;
      }
      var kindKeys = Object.keys(counts);
      if (kindKeys.length > 0) {
        var group2 = el('div', { class: 'group' }, [el('h3', { text: 'Resources' })]);
        var wrap2 = el('div', { class: 'resources' });
        kindKeys.sort();
        for (var m = 0; m < kindKeys.length; m++) {
          wrap2.appendChild(el('div', { class: 'group-row' }, [el('span', { class: 'kind', text: kindKeys[m] }), el('span', { class: 'count', text: String(counts[kindKeys[m]]) })]));
        }
        group2.appendChild(wrap2); body.appendChild(group2);
      }
    }

    body.appendChild(el('div', { class: 'actions' }, [
      el('button', { type: 'button', onclick: function () { onAction && onAction('sync'); } }, [icon('i-sync'), 'Sync']),
      el('button', { type: 'button', onclick: function () { onAction && onAction('refresh'); } }, [icon('i-refresh'), 'Refresh']),
    ]));

    inspector.appendChild(header);
    inspector.appendChild(body);
  }

  root.views = root.views || {};
  root.views.detail = { mount: mountDetail };
})(window.__argocd = window.__argocd || {});


(function (root) {
  var el = root.render.el;
  var state = root.state;

  var COPY = {
    appsets: { eyebrow: 'Argo CD', title: 'App Sets', sub: 'ApplicationSets that fan a single source out to many clusters.', detectKind: 'applicationsets' },
    repos: { eyebrow: 'Argo CD', title: 'Repositories', sub: 'Git / Helm / OCI repositories ArgoCD can pull manifests from.', detectKind: 'repositories' },
    projects: { eyebrow: 'Argo CD', title: 'Projects', sub: 'App Projects that scope clusters, namespaces, and resource allow-lists.', detectKind: 'appprojects' },
  };

  function mountStubView(content, kind) {
    var copy = COPY[kind];
    if (!copy) { content.replaceChildren(el('h1', { text: 'Not found' })); return { stop: function(){}, refresh: function(){} }; }
    var detected = kind === 'appsets' ? state.appsetsInstalled : true;
    var head = el('div', { class: 'page-head' }, [el('div', null, [el('div', { class: 'eyebrow', text: copy.eyebrow }), el('h1', { text: copy.title }), el('p', { class: 'page-sub', text: copy.sub })])]);
    var empty = el('div', { class: 'empty' });
    if (state.errorKind === 'no-crd' || !detected) {
      empty.replaceChildren(el('h2', { text: 'ArgoCD not detected' }), el('p', { text: 'The `' + copy.detectKind + '.argoproj.io` CRD was not found in this cluster.' }));
    } else {
      empty.replaceChildren(el('h2', { text: 'Detected' }), el('p', { text: 'List view ships in a follow-up. Route registration is live so the shell renders the entry without errors.' }));
    }
    content.replaceChildren(head, empty);
    return { stop: function(){}, refresh: function(){} };
  }

  root.views = root.views || {};
  root.views.stub = { mount: mountStubView };
})(window.__argocd = window.__argocd || {});


(function (root) {
  var el = root.render.el;
  var icon = root.render.icon;
  var cardFromApp = root.render.cardFromApp;
  var buildCardMenu = root.render.buildCardMenu;
  var state = root.state;
  var stateApi = root.stateApi;
  var api = root.api;
  var mountDetail = root.views.detail.mount;

  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

  function mountAppsView(content, opts) {
    var onAction = opts && opts.onAction;
    var onRoute = opts && opts.onRoute;
    var setStatus = opts && opts.setStatus;
    var showToast = (opts && opts.showToast) || function () {};

    var head = el('div', { class: 'page-head' }, [
      el('div', null, [el('div', { class: 'eyebrow', text: 'Argo CD' }), el('h1', { text: 'Applications' }), el('p', { class: 'page-sub', text: 'Sync and health status for every Application in this cluster.' })]),
      el('div', { class: 'page-actions' }, [
        el('button', { class: 'refresh', type: 'button', 'aria-label': 'Refresh applications',
          onclick: function (e) {
            var btn = e.currentTarget; btn.classList.add('refreshing');
            stateApi.refreshOnce(render).then(function () { setStatus && setStatus('ok'); }).finally(function () { btn.classList.remove('refreshing'); });
          },
        }, [icon('i-refresh-soft'), 'Refresh']),
      ]),
    ]);

    var grid = el('div', { class: 'app-grid' });
    var empty = el('div', { class: 'empty', hidden: 'true' });
    var errorLabel = el('span', { class: 'err-label', hidden: 'true' });
    var inspector = el('aside', { class: 'inspector', 'aria-hidden': 'true' });
    var scrim = el('div', { class: 'inspector-scrim', hidden: 'true' });

    content.replaceChildren(head, grid, empty, errorLabel, inspector, scrim);

    function openDetail(app) {
      api.getApplication(app.name, app.namespace).then(function (d) { renderInspector(d); }).catch(function () { renderInspector(app); });
    }

    function renderInspector(detail) {
      mountDetail(inspector, detail, {
        onClose: closeDetail,
        onAction: function (action) {
          onAction && onAction(action, detail);
          showToast(capitalize(action) + ' requested for `' + detail.name + '` \u2014 wires to argocd-server in a follow-up');
        },
      });
      inspector.classList.add('open');
      inspector.setAttribute('aria-hidden', 'false');
      scrim.hidden = false;
      var closeBtn = inspector.querySelector('.close');
      if (closeBtn) closeBtn.focus();
    }

    function closeDetail() {
      inspector.classList.remove('open');
      inspector.setAttribute('aria-hidden', 'true');
      scrim.hidden = true;
    }

    scrim.addEventListener('click', closeDetail);
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape' && inspector.classList.contains('open')) closeDetail();
    });

    function render() {
      grid.replaceChildren();
      empty.hidden = true;
      errorLabel.hidden = true;

      if (state.errorKind === 'no-cluster') {
        empty.hidden = false;
        empty.replaceChildren(
          el('h2', { text: 'No cluster connected' }),
          el('p', { text: 'Connect a cluster context to list ArgoCD Applications.' }),
          el('div', { class: 'actions' }, [el('button', { class: 'secondary', type: 'button', onclick: function () { onRoute && onRoute('/cluster'); } }, [icon('i-chevron'), 'Open the cluster selector'])])
        );
        return;
      }

      if (state.errorKind === 'no-crd' || (!state.installed && !state.error)) {
        empty.hidden = false;
        var installHint = el('code', { class: 'install-hint', text: 'kubectl apply -n argocd \\\n  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml' });
        empty.replaceChildren(
          el('h2', { text: 'ArgoCD not detected' }),
          el('p', { text: 'No applications.argoproj.io resources found in this cluster.' }),
          el('div', { class: 'actions' }, [el('button', { class: 'secondary', type: 'button',
            onclick: function (e) {
              var btn = e.currentTarget; btn.classList.add('refreshing');
              stateApi.refreshOnce(render).then(function () { if (state.installed) setStatus && setStatus('ok'); }).finally(function () { btn.classList.remove('refreshing'); });
            },
          }, [icon('i-refresh-soft'), 'Re-detect'])]),
          installHint
        );
        return;
      }

      if (state.errorKind === 'rbac' || state.errorKind === 'transient') {
        empty.hidden = false;
        empty.replaceChildren(
          el('h2', { text: 'Cannot list applications' }),
          el('p', { text: 'The plugin could not enumerate ArgoCD Applications. Verify RBAC and network access, then retry.' }),
          el('div', { class: 'actions' }, [el('button', { class: 'secondary', type: 'button',
            onclick: function (e) { var btn = e.currentTarget; btn.classList.add('refreshing'); stateApi.refreshOnce(render).finally(function () { btn.classList.remove('refreshing'); }); },
          }, [icon('i-refresh-soft'), 'Retry'])])
        );
        errorLabel.hidden = false;
        errorLabel.textContent = state.error || 'unknown error';
        return;
      }

      if (state.apps.length === 0) {
        empty.hidden = false;
        empty.replaceChildren(el('h2', { text: 'No Applications yet' }), el('p', { text: 'ArgoCD is installed but no Applications have been declared.' }));
        return;
      }

      for (var i = 0; i < state.apps.length; i++) {
        (function (app) {
          var card = cardFromApp(app, {
            onOpen: openDetail,
            onMenu: function (c) { buildCardMenu(c, app); },
            onAction: function (action, a) { showToast(capitalize(action) + ' requested for `' + a.name + '` \u2014 wires to argocd-server in a follow-up'); },
          });
          grid.appendChild(card);
        })(state.apps[i]);
      }
    }

    render();
    stateApi.startRefresh(render, 10000);
    return { stop: function () { stateApi.stopRefresh(); }, refresh: render };
  }

  root.views = root.views || {};
  root.views.apps = { mount: mountAppsView };
})(window.__argocd = window.__argocd || {});


(function (root) {
  root.views = root.views || {};
  root.views.appsets = { mount: root.views.stub.mount };
  root.views.repos = { mount: root.views.stub.mount };
  root.views.projects = { mount: root.views.stub.mount };
})(window.__argocd = window.__argocd || {});


(function (root) {
  var ICON_SPRITE = [
    '<svg class="svg-defs" aria-hidden="true">',
    '  <symbol id="argo-mark" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">',
    '    <path d="M9 1.6 L15.6 5.4 L15.6 12.6 L9 16.4 L2.4 12.6 L2.4 5.4 Z" />',
    '    <path d="M6 12 L9 5.6 L12 12" />',
    '    <path d="M7.2 9.6 L10.8 9.6" />',
    '  </symbol>',
    '  <symbol id="helm-mark" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">',
    '    <circle cx="9" cy="9" r="6" />',
    '    <path d="M9 3 L9 15" />',
    '    <path d="M3 9 L15 9" />',
    '    <path d="M4.8 4.8 L13.2 13.2" />',
    '    <path d="M13.2 4.8 L4.8 13.2" />',
    '  </symbol>',
    '  <symbol id="kustomize-mark" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">',
    '    <rect x="2" y="2" width="14" height="14" rx="2" />',
    '    <path d="M5.5 13 L5.5 5 L12.5 13 L12.5 5" />',
    '  </symbol>',
    '  <symbol id="repo-mark" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">',
    '    <path d="M3 4.5 L3 13.5 L15 13.5" />',
    '    <path d="M3 4.5 L9 9 L15 4.5" />',
    '  </symbol>',
    '  <symbol id="i-sync" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">',
    '    <path d="M3.5 9 A 5.5 5.5 0 0 1 13.5 6" />',
    '    <path d="M14.5 9 A 5.5 5.5 0 0 1 4.5 12" />',
    '    <path d="M11 6 L13.5 6 L13.5 8.5" />',
    '    <path d="M7 12 L4.5 12 L4.5 9.5" />',
    '  </symbol>',
    '  <symbol id="i-refresh" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">',
    '    <path d="M3.5 9 A 5.5 5.5 0 1 1 9 14.5" />',
    '    <path d="M3.5 4.5 L3.5 9 L8 9" />',
    '  </symbol>',
    '  <symbol id="i-check" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">',
    '    <path d="M3.5 9.5 L7 13 L14.5 5" />',
    '  </symbol>',
    '  <symbol id="i-warn" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">',
    '    <path d="M9 2.5 L16 15 L2 15 Z" />',
    '    <path d="M9 7 L9 11" />',
    '    <circle cx="9" cy="13" r="0.6" fill="currentColor" stroke="none" />',
    '  </symbol>',
    '  <symbol id="i-error" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">',
    '    <circle cx="9" cy="9" r="6.5" />',
    '    <path d="M6 6 L12 12" />',
    '    <path d="M12 6 L6 12" />',
    '  </symbol>',
    '  <symbol id="i-clock" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">',
    '    <circle cx="9" cy="9" r="6.5" />',
    '    <path d="M9 5.5 L9 9 L12 11" />',
    '  </symbol>',
    '  <symbol id="i-kebab" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">',
    '    <circle cx="9" cy="3.5" r="0.9" fill="currentColor" stroke="none" />',
    '    <circle cx="9" cy="9" r="0.9" fill="currentColor" stroke="none" />',
    '    <circle cx="9" cy="14.5" r="0.9" fill="currentColor" stroke="none" />',
    '  </symbol>',
    '  <symbol id="i-refresh-soft" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">',
    '    <path d="M4 8 A 5 5 0 0 1 13 6" />',
    '    <path d="M14 8 A 5 5 0 0 1 5 13" />',
    '    <path d="M11 4 L13 6 L11 8" />',
    '    <path d="M7 14 L5 12 L7 10" />',
    '  </symbol>',
    '  <symbol id="i-close" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">',
    '    <path d="M4 4 L14 14" />',
    '    <path d="M14 4 L4 14" />',
    '  </symbol>',
    '  <symbol id="i-chevron" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">',
    '    <path d="M6 4 L12 9 L6 14" />',
    '  </symbol>',
    '</svg>',
  ].join('\n');

  function mountIconSprite() {
    if (document.getElementById('argocd-icon-sprite')) return;
    var wrap = document.createElement('div');
    wrap.id = 'argocd-icon-sprite';
    wrap.innerHTML = ICON_SPRITE;
    document.body.appendChild(wrap);
  }

  root.icons = { mount: mountIconSprite };
})(window.__argocd = window.__argocd || {});


(function (root) {
  function register() {
    if (!root.openkite) {
      console.warn('argocd plugin: openkite bridge missing; entry will retry on next eval');
      return false;
    }
    var SIDEBAR_ITEMS = [
      { label: 'Applications', icon: 'argo', route: '/argocd/apps' },
      { label: 'App Sets', icon: 'argo', route: '/argocd/appsets' },
      { label: 'Repos', icon: 'repo', route: '/argocd/repos' },
      { label: 'Projects', icon: 'argo', route: '/argocd/projects' },
    ];
    var ROUTE_TITLES = {
      '/argocd/apps': 'ArgoCD Applications',
      '/argocd/appsets': 'ArgoCD App Sets',
      '/argocd/repos': 'ArgoCD Repositories',
      '/argocd/projects': 'ArgoCD Projects',
    };
    SIDEBAR_ITEMS.forEach(function (item) { root.openkite.registerSidebar(item); });
    Object.keys(ROUTE_TITLES).forEach(function (path) {
      root.openkite.registerRoute({ path: path, title: ROUTE_TITLES[path] });
    });
    root.openkite.registerStatusItem({ label: 'ArgoCD: detecting\u2026', color: 'blue' });
    return true;
  }

  function statusFor(state) {
    if (state.errorKind === 'no-cluster') return { label: 'ArgoCD: no cluster', color: 'red' };
    if (state.errorKind === 'no-crd' || !state.installed) return { label: 'ArgoCD: not detected', color: 'red' };
    if (state.errorKind === 'rbac' || state.errorKind === 'transient') return { label: 'ArgoCD: error', color: 'red' };
    return { label: 'ArgoCD: Synced', color: 'green' };
  }

  var currentView = null;
  var currentRoute = null;
  var mounted = false;

  function ensureShell() {
    var shell = document.getElementById('argocd-shell');
    if (shell) return shell;
    root.__argocd.icons.mount();
    var el = document.createElement('div');
    el.id = 'argocd-shell';
    el.className = 'argocd-plugin argocd-shell';
    el.setAttribute('data-argocd-shell', 'true');
    document.body.appendChild(el);
    return el;
  }

  function ensureToast(shell) {
    var toast = shell.querySelector('.toast');
    if (toast) return toast;
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    shell.appendChild(toast);
    return toast;
  }

  function showToast(toast, message) {
    toast.textContent = message;
    toast.classList.add('show');
    if (showToast._t) clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }

  function handleRoute(content, toast, shell) {
    var path = window.location.pathname;
    var views = root.__argocd.views;
    var viewKey = null;
    if (path === '/argocd/apps') viewKey = 'apps';
    else if (path === '/argocd/appsets') viewKey = 'appsets';
    else if (path === '/argocd/repos') viewKey = 'repos';
    else if (path === '/argocd/projects') viewKey = 'projects';

    if (!viewKey || !views || !views[viewKey]) {
      shell.hidden = true;
      if (currentView && typeof currentView.stop === 'function') currentView.stop();
      currentView = null;
      return;
    }
    shell.hidden = false;
    if (currentRoute === path && currentView) return;
    if (currentView && typeof currentView.stop === 'function') currentView.stop();
    currentRoute = path;
    root.__argocd.stateApi.setRoute(path);
    currentView = views[viewKey].mount(content, viewKey, {
      onAction: function (action, app) { console.log('argocd: ' + action + ' ' + (app && app.name)); },
      onRoute: function (route) { history.pushState({}, '', route); },
      setStatus: function () {},
      showToast: function (msg) { showToast(toast, msg); },
    });
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    window.addEventListener('pagehide', function () { root.__argocd.stateApi.stopRefresh(); });
    if (!register()) { setTimeout(mount, 200); return; }

    var shell = ensureShell();
    var toast = ensureToast(shell);
    var content = document.createElement('div');
    content.className = 'content';
    shell.appendChild(content);

    var lastPath = window.location.pathname;
    setInterval(function () {
      if (window.location.pathname !== lastPath) {
        lastPath = window.location.pathname;
        handleRoute(content, toast, shell);
      }
    }, 250);

    handleRoute(content, toast, shell);

    var state = root.__argocd.state;
    var refreshOnce = root.__argocd.stateApi.refreshOnce;
    function setStatus() {
      var next = statusFor(state);
      if (root.openkite && next) {
        root.openkite.registerStatusItem({ label: next.label, color: next.color });
      }
    }
    refreshOnce(function () { setStatus(); handleRoute(content, toast, shell); }).then(function () {
      if (!state.installed && state.errorKind === 'no-crd') {
        return new Promise(function (r) { setTimeout(r, 500); }).then(function () {
          return refreshOnce(function () { setStatus(); handleRoute(content, toast, shell); });
        });
      }
    });
  }

  try { mount(); } catch (err) { console.warn('argocd plugin: mount failed:', err); }
})(window);
