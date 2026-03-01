# TERIN Toolkit — Browser Extension

Internal productivity extension. Built as a **Manifest V3** Chrome extension (also works in any Chromium-based browser such as Brave or Edge) using React + Vite.

## Usage

Press **`Ctrl + Shift + K`** on any website to open the **Command Palette** — a quick-access launcher for all tools in the extension.

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (hot-reload, unpacked extension)
npm run dev

# Production build → dist/
npm run build
```

### Loading the unpacked extension (installation)

1. `npm run build` (or keep `npm run dev` running for hot-reload)
2. Open `chrome://extensions` (or `brave://extensions`)
3. Enable **Developer mode**
4. Click **Load unpacked** → select the `dist/` folder
5. The dashboard is available at the extension's dedicated page

> **Hot-reload note:** `npm run dev` injects a WebSocket client via `@crxjs/vite-plugin`. Changes to source files rebuild and reload the extension automatically without needing to repeat step 4.

## Data & Storage

All extension data is persisted in `browser.storage.local` under keys prefixed with `terin_`. **Data never leaves your browser** unless you explicitly configure auto-sync (see below). The `StorageManager` class in `src/lib/storage.ts` is the single point of access — use it in stores rather than calling `browser.storage` directly.

### Export / Import

Go to **Settings → Export / Import**.

| Action | Description |
|---|---|
| **Export All Data** | Downloads a `terin-backup-YYYY-MM-DD.json` snapshot of all tool data |
| **Import — Merge** | Combines the file with existing data; imported records overwrite duplicates (recommended) |
| **Import — Replace All** | Wipes all existing data and applies the file verbatim |

The JSON payload schema:

```jsonc
{
  "version": 1,
  "exportedAt": "2026-03-01T...",
  "data": {
    "bookmarks": { ... },
    "bookmark_folders": { ... },
    "css_rules": { ... }
    // ... one key per store
  }
}
```

### Auto-Sync (optional)

Settings also exposes a **File System Access API** sync option. Point it at a folder inside Dropbox / Google Drive / OneDrive and the extension will write the same JSON payload there automatically after every change, keeping data in sync across machines.

> **Brave users:** Brave's strict privacy settings block the File System Access API by default. Use manual export/import as a workaround, or lower the setting in `brave://settings/content/filesystem`.
