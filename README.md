# ADHD Reader – Focus & Speed Reading

ADHD Reader is a Chrome Manifest V3 extension that emphasizes the first part of words as a fixation-style reading aid for ADHD readers and speed readers. Reading preferences differ; this tool makes no medical or reading-speed claims.

## Features

- Automatically applies on supported websites, with a global switch and hostname-based site opt-outs.
- Adjustable bold ratio (20–70%, default 45%), bold weight (500–900, default 700), and rest-of-word opacity (40–100%, default 100%). Sliders preview immediately on the current page; preferences sync when a control is released.
- Alt+Shift+R toggles the current site. Customize shortcuts at `chrome://extensions/shortcuts` if Chrome reports a conflict.
- Dynamic content is processed in small idle-time batches. Disabling restores text in small batches and preserves edits made by the page.
- Unicode grapheme clusters are supported, including RTL text; text nodes longer than 4,000 UTF-16 units are skipped to limit blocking work; Chinese, Japanese, and Korean scripts are left unchanged. Code, form controls, editable elements, embedded frames, and graphics are skipped.

## Install unpacked

1. Open `chrome://extensions` in Chrome and enable **Developer mode**.
2. Choose **Load unpacked** and select this directory (the folder containing `manifest.json`).
3. Open or reload a regular website. Use the toolbar popup to adjust settings.

Chrome internal pages, the Chrome Web Store, and other protected pages cannot run content scripts. File pages require Chrome's explicit “Allow access to file URLs” setting. Only the top frame is processed. Shadow DOM, PDFs, and Google Docs canvas-based text are not supported in this MVP. Pages with complex DOM ownership or unusual typography may need a site opt-out.

## Privacy

The only requested API permission is `storage`. Automatic operation also requires broad website access through the `<all_urls>` content-script match. It contains no remote code, tracking, analytics, or network requests. Chrome sync stores preferences and disabled hostnames; page text never leaves the page. See [PRIVACY.md](PRIVACY.md).

## Development and packaging

No dependencies are required. Regenerate icons with `node scripts/make-icons.js`. Run `node --check` on each JavaScript file, then `bash scripts/build.sh` to create `dist/adhd-reader.zip`. The build uses `zip`, or Python's standard-library zipfile fallback.

Manual smoke check: load the extension, verify ordinary English text changes and CJK/code/editable text stays intact, change each setting, toggle globally and per site, try the shortcut, add dynamic text, and confirm disabling restores the original text. Repeat on several websites.

## Roadmap

- PDF and Google Docs support through dedicated rendering integrations.
- More typography controls and accessibility testing.
- Optional ExtensionPay paywall for future premium features; no payment integration is present in this MVP.

Store title: **ADHD Reader – Focus & Speed Reading**.
