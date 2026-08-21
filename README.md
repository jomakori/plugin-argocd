# openkite-plugin-argocd

OpenKite first-party ArgoCD plugin — consumes
[`openkite-plugin-sdk`](https://github.com/jomakori/openkite).

Implements the `OpenKitePlugin` trait: auto-detects ArgoCD on cluster connect,
talks to `argocd-server` over gRPC (tonic), and renders applications, sync
state, resource trees, and diff views inside OpenKite.

## Status

Phase 2 — not started. Begins after OpenKite core (Phase 1) is functional
without plugins.

## Install (once published)

Copy the release dylib into `~/.openkite/plugins/`:

```bash
mkdir -p ~/.openkite/plugins
cp libplugin_argocd.dylib ~/.openkite/plugins/   # macOS
cp libplugin_argocd.so ~/.openkite/plugins/       # Linux
cp plugin_argocd.dll ~/.openkite/plugins/         # Windows
```

> ⚠ Dylib loading is **experimental**: the plugin must be built with the same
> rustc toolchain and the exact `openkite-plugin-sdk` version as the OpenKite
> build. Check the release notes for the compat matrix.

## Build

```bash
cargo build --release   # requires protoc (or protoc-bin-vendored)
```

## License

MIT + Apache-2.0 (dual).
