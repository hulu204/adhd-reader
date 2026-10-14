# ADHD Reader – Focus & Speed Reading

Version 0.2.0 is a Chrome Manifest V3 extension that applies fixation-style emphasis to word beginnings. Preferences differ; it makes no medical or reading-speed claims.

## Reading controls

Supported websites are enabled automatically. The popup offers Light / Balanced / Strong presets, adjustable emphasis ratio (20–70%), weight (500–900), remaining-text opacity (40–100%), a live sentence preview, and global/site switches. Sliders preview on the active page and save on release. Manage disabled hostnames in the popup; the default blacklist is empty. Alt+Shift+R toggles the current site (customize at `chrome://extensions/shortcuts`).

Dynamic website text is processed in small idle batches. Code, inputs, contenteditable, graphics, and embedded frames are skipped. Disabling restores text while preserving page edits. Unicode grapheme clusters and RTL are supported; Chinese, Japanese, and Korean scripts are left unchanged. Website text nodes over 4,000 UTF-16 units, shadow DOM, protected Chrome pages, and the Web Store are not processed. Complex websites may need a site opt-out. Generic scripts use `all_frames: false`.

## PDFs

Chrome's built-in PDF viewer cannot have its text rewritten by content scripts. ADHD Reader supplies a separate, local text reading view using Mozilla pdf.js **5.4.149**. Its library and worker are bundled under `vendor/pdfjs/`, with the upstream Apache license; no remote code is loaded.

On Chrome 151+, the `application/pdf` MIME handler reads Chrome's one-use response stream, keeps the original URL in the address bar, and supports embedded PDFs. “Handle PDFs with ADHD Reader” defaults to on; switch it off in the popup to use Chrome's native viewer for future loads. A handler-view button returns the current stream to Chrome's viewer. See [Chrome's public MIME-handler API](https://developer.chrome.com/docs/extensions/reference/api/mimeHandler).

The popup shows **Open in ADHD Reader** for PDF pathnames, recognized Chrome PDF URLs, and PDF content/embed hints. The standalone `viewer/pdf.html?url=` path accepts HTTP(S) and file URLs and fetches the PDF from its original source. Unlike the stream path, this makes a second request: expired links, POST-only documents, authentication, server restrictions, or inaccessible local files can fail. File URL fetching requires “Allow access to file URLs”; the viewer also offers a local PDF picker that needs no upload. MIME handling of local files does not require that file-access switch.

Text is extracted per page with `getTextContent` and follows live sync settings, global enable, and the original hostname's opt-out. This is a text view: layout, images, tables, and reading order may differ. Scanned/image-only PDFs have no text without OCR (not included). Password-protected PDFs may fail; use the native viewer. Large documents consume memory as extracted pages accumulate. When fetching or parsing fails, the viewer explains the local-file/native-viewer fallbacks.

## Google Docs

On `https://docs.google.com/document/*`, use the floating **Focus Reader** button or the contextual popup action. Google Docs renders text to canvas, so the extension does not promise in-place emphasis and never edits the document.

A MAIN-world document-start bridge sets `window._docs_annotate_canvas_by_ext` to the extension ID. Google may only honor this for whitelisted extensions. The panel first tries annotated canvas SVG `rect[aria-label]` text; only currently rendered text may be available. Scroll and refresh, and verify completeness. If extraction is unavailable, close the panel, select and copy document text, then reopen and paste. No clipboard API permission is requested. The panel formats pasted/extracted text locally with the same shared algorithm and live settings.

## Installation and privacy

Open `chrome://extensions`, enable Developer mode, and choose **Load unpacked** with this directory. Reload existing website/Docs tabs after installing or updating.

Permissions: `storage` saves preferences; `activeTab` allows the popup to inspect the user-invoked tab URL, including PDF tabs where content scripts cannot run. HTTP(S)/file host permissions allow standalone PDF fetching. Broad `<all_urls>` content-script access enables local website emphasis. No analytics, tracking, developer server, PDF upload, or remote runtime code is present. PDF URL mode requests the original document from its source. See [PRIVACY.md](PRIVACY.md).

## Development

No application build dependencies, React, or TypeScript are needed. Regenerate icons with `node scripts/make-icons.js`, check each `.js` and `.mjs` with `node --check`, run `node scripts/check.js` for behavioral checks (Node 20+), and run `bash scripts/build.sh` to produce `dist/adhd-reader.zip`.

To refresh the pinned vendor files: `npm pack pdfjs-dist@5.4.149`, then extract only `build/pdf.min.mjs`, `build/pdf.worker.min.mjs`, and `LICENSE` into `vendor/pdfjs/`. Keep library and worker versions identical.

Automated checks cover syntax, shared emphasis behavior, PDF extraction and viewer stream/URL paths. Browser integration, accessibility, real Docs whitelist behavior, and unusual website/PDF typography still require release QA.
