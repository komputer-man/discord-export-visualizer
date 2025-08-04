# Discord Export Visualizer

**Discord Export Visualizer** lets you securely explore your Discord data exports (ZIP files) — **100% offline, in your browser**. It's privacy-first and fully open-source.

## Features

- View your **Discord export (ZIP)** with no external servers or uploads.
- Inspect **account info**, **messages**, **avatars**, and **connected apps** locally.
- **Completely offline** — no data ever leaves your device.
- Open-source, with full transparency and community involvement.

## How It Works

1. **Load** your exported Discord ZIP file via the web interface or drag‑and‑drop.
2. The tool runs entirely in your browser using [JSZip].
3. You can view your **Account** and **Messages** folders rendered as navigable sections.
4. Includes a built-in **test runner** to validate parsing logic on your data.

_No backend, cloud, or data storage — everything stays on your device._

## Quick Start

1. **Download or clone** this repository:  
   `git clone https://github.com/komputer-man/discord-export-visualizer.git`
2. **Open** `index.html` in your browser.
3. **Upload your Discord export ZIP** file.
4. Navigate sections: **Account** → **Messages**, explore the data.
5. Click **Run tests** to check parsing routines on the loaded ZIP.

## Supported Data

- `Account/user.json` → displays ID, username, global name, email, phone, premium status, flags.
- `Account/avatar.png`, `Account/recent_avatars/*` → display avatars in thumbnails.
- `Account/applications/*/application.json` → list connected apps.
- Channels and DMs in `Messages/*` as JSON or CSV → table view with timestamps, content, attachments.

## Privacy & Security

- **No data upload** — all file handling and processing happen locally.
- **No logs**, no network requests — your data stays entirely offline.
- **Open source**: you can review or modify every line yourself.

---

## About & Contributions

Discord Export Visualizer is an open-source project available on GitHub:

[https://github.com/komputer-man/discord-export-visualizer](https://github.com/komputer-man/discord-export-visualizer)

- Licensed under [MIT License]
- Contributions are welcome! Bug reports, feature requests, or pull requests are highly appreciated.

## Testing

- A simple parser test suite is included in each module.
- Use the **Run tests** button after loading your ZIP export to verify functionality.

## Why Use This Tool?

- Tired of manual JSON/CSV digging?
- Concerned about data privacy?
- Prefer open-source, lightweight, browser-only tooling?

This tool was built with simplicity, transparency, and security in mind.
