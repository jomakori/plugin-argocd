# openkite-plugin-argocd

OpenKite first-party ArgoCD plugin — JS bundle that consumes the
[OpenKite plugin API](https://github.com/jomakori/openkite). Auto-detects
ArgoCD on cluster connect by querying the bridge for
`applications.argoproj.io`, then renders an Applications grid with
sync / health status, a detail slide-over (sync history + resource
tree), and stub views for App Sets, Repositories, and Projects.

## Status

Phase 2 — first end-to-end consumer of the OKT-45/46 plugin API.
The plugin works against any cluster with `argoproj.io` CRDs
installed (k3d + `argocd-server` is the smoke environment). Without
ArgoCD the plugin degrades to an empty state with no console errors.

## Install

Copy the plugin folder into `~/.openkite/plugins/`:

```bash
mkdir -p ~/.openkite/plugins
cp -r . ~/.openkite/plugins/argocd/
```

The host scans `~/.openkite/plugins/*/manifest.json` at startup and
on every directory change. A new copy shows up after the next watcher
tick; a removed copy clears on the next tick too.

## Layout

```
plugin-argocd/
├── manifest.json          # plugin contract (name, version, entry, sidebar)
├── main.js                # entry — single self-contained bundle
├── src/
│   └── styles/            # source of truth for the plugin stylesheet
│       ├── tokens.css
│       ├── cards.css
│       ├── inspector.css
│       └── shell.css
├── bin/
│   └── validate-manifest.rs  # mirrors PluginManifest::validate (CI)
├── .github/
│   ├── workflows/js-lint.yml
│   └── pull_request_template.md
└── Cargo.toml             # the validate-manifest binary
```

### Why a single `main.js`

The host evaluates the plugin entry via `document::eval`, which runs
as a classic script with no module system, no relative-URL base, and
no static-file serving for plugin CSS. So `main.js` inlines both the
full stylesheet (concatenated from `src/styles/*.css`) and every JS
module as an IIFE that contributes to a `window.__argocd` namespace.
The CSS source files are kept on disk for editing; re-inline by hand
after a stylesheet change (the inlining is mechanical — see the
top comment in `main.js`).

## Build

There is no build step. `cargo run --bin validate-manifest` checks
the manifest against the host's `PluginManifest::validate()` rules
(name regex `[a-zA-Z0-9-_]`, entry relative `.js` with no `..`,
version non-empty, entry file exists). `node --check main.js` confirms
JS syntax.

## Manual smoke

1. `cp -r . ~/.openkite/plugins/argocd/`
2. Launch OpenKite against a cluster **with** `argoproj.io` CRDs.
   Verify: the "Argo CD" sidebar section appears (4 entries);
   the Applications grid renders; the status bar shows
   "ArgoCD: Synced" in green; a card click opens the detail
   slide-over with sync / health / history / resources.
3. Repeat against a cluster **without** ArgoCD. Verify: the empty
   state with the install hint; the status bar shows
   "ArgoCD: not detected"; no console errors.
4. Edit `main.js` on disk (e.g. add `console.log("hi")`) — the host
   watcher re-evals — the `__argocd_injected` guard keeps the
   stylesheet from being injected twice, and the `__argocd_mounted`
   guard prevents a duplicate view mount.
5. Remove the plugin dir — the sidebar items, status row, and routes
   clear on the next watcher tick.

## Known limitation

The host's `Route::Plugin` wildcard in `router.rs` currently 404s
on JS-registered routes — only entries from the static `ROUTE_TABLE`
(Rust SDK plugins) render through the router. This plugin works
around the gap with a `position: fixed` overlay that covers the
host's main outlet when the URL matches `/argocd/*`. The proper
fix is a JS-routes render slot in `router.rs` (tracking ticket
forthcoming).

## License

MIT + Apache-2.0 (dual).
