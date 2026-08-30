// Validate the plugin manifest against the OKT-45 contract.
//
// Mirrors the four critical checks in `openkite::plugin_js::PluginManifest::validate()`
// (name regex, version non-empty, entry is a relative `.js` with no `..`),
// plus a filesystem check that the entry file exists. The plugin repo
// cannot depend on the host crate, so the rules are duplicated here —
// kept in sync with the host's source.

use std::path::{Path, PathBuf};

fn main() {
    let manifest_path = PathBuf::from("manifest.json");
    let text = match std::fs::read_to_string(&manifest_path) {
        Ok(t) => t,
        Err(err) => {
            eprintln!("read {}: {err}", manifest_path.display());
            std::process::exit(1);
        }
    };
    let value: serde_json::Value = match serde_json::from_str(&text) {
        Ok(v) => v,
        Err(err) => {
            eprintln!("parse {}: {err}", manifest_path.display());
            std::process::exit(1);
        }
    };

    let mut errors: Vec<String> = Vec::new();

    let name = value.get("name").and_then(Value::as_str).unwrap_or("");
    if name.is_empty() {
        errors.push("name must not be empty".into());
    } else if !name
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        errors.push(format!("name '{name}' may only contain [a-zA-Z0-9-_]"));
    }

    let version = value.get("version").and_then(Value::as_str).unwrap_or("");
    if version.trim().is_empty() {
        errors.push("version must not be empty".into());
    }

    let entry = value.get("entry").and_then(Value::as_str).unwrap_or("");
    if entry.trim().is_empty() {
        errors.push("entry must not be empty".into());
    } else {
        if !entry.ends_with(".js") {
            errors.push(format!("entry '{entry}' must be a .js file"));
        }
        let p = Path::new(entry);
        if p.is_absolute() {
            errors.push(format!("entry '{entry}' must be relative"));
        }
        if entry.split(['/', '\\']).any(|seg| seg == "..") {
            errors.push(format!("entry '{entry}' must not contain '..'"));
        }
        if !Path::new(entry).exists() {
            errors.push(format!("entry file '{entry}' does not exist on disk"));
        }
    }

    if let Some(sidebar) = value.get("sidebar").and_then(Value::as_array) {
        for (idx, item) in sidebar.iter().enumerate() {
            let label = item.get("label").and_then(Value::as_str).unwrap_or("");
            if label.trim().is_empty() {
                errors.push(format!("sidebar[{idx}].label must not be empty"));
            }
        }
    }

    if errors.is_empty() {
        println!("manifest.json ok (name={name}, version={version}, entry={entry})");
    } else {
        eprintln!("manifest.json invalid:");
        for err in &errors {
            eprintln!("  - {err}");
        }
        std::process::exit(1);
    }
}

use serde_json::Value;
