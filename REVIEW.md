# ADHD Reader review

Reviewed and fixed locally on 2026-10-14. No browser, network, dependencies, or git commands were used.

## High

- **Fixed — Every preference rebuilt the entire page.** Weight and opacity now update CSS variables without replacing text. Ratio updates existing emphasis spans in idle batches, so text is never temporarily reverted while changing the ratio.
- **Fixed — Stale text restoration could overwrite page edits.** Reversion uses current wrapper text and preserves the original text node identity. Removed parent normalization, which could merge text nodes owned by the host application.
- **Fixed — Unbounded traversal and synchronous reversion.** Traversal now counts all visited nodes and skips excluded subtrees, with sibling cursors rather than collecting every child at once. Traversal, ratio updates, cleanup, and restoration share idle batches capped at 100 steps / approximately 6 ms. Individual text nodes over 4,000 UTF-16 units are skipped to limit the cost of a single transformation.

## Medium

- **Fixed — Mutation callbacks scanned all tracked wrappers.** Removed full-map scans from mutation delivery; removals trigger incremental cleanup. Own DOM changes are made with the observer disconnected after draining queued external records. Already wrapped text and excluded subtrees are skipped on subsequent traversal.
- **Fixed — Editable transitions left formatting inside editors.** Changes to `contenteditable` trigger incremental restoration of affected wrappers. Editable ancestors, including inherited editing, are conservatively excluded. Inputs, textarea, select/option, code/pre/kbd/samp, script/style/noscript, SVG, MathML, canvas and iframes remain excluded. Namespace checking also protects SVG text.
- **Fixed — Popup sliders only applied after sync persistence.** Input events now send immediate previews to the active tab; sync writes remain on release to avoid write quotas. Storage events preserve sliders being dragged. Global controls receive handlers before the page lookup, and content-script lookup has a 500 ms timeout. Storage listeners consume changed keys directly rather than racing asynchronous rereads.
- **Fixed — Startup reads could overwrite newer preferences.** Content-script initialization merges changes/previews received while the initial read is pending. Failed initial reads fall back to defaults.
- **Fixed — Hostname lookup inherited object properties.** Site toggles and content activation use own-property checks, preventing hostnames such as `constructor` from being treated as disabled by prototype inheritance.
- **Remaining — Exact layout stability cannot be guaranteed.** Bold font metrics can change word width and wrapping; inline boundaries can affect ligatures and Arabic joining. Grapheme segmentation avoids splitting combining sequences, and logical word prefixes preserve RTL order, but shaping needs browser validation. Added inherited typography, zero box decorations, and suppressed injected-span pseudo-elements to reduce interference. Guaranteeing identical geometry would require a different rendering approach.
- **Remaining — Shadow DOM and embedded frames.** Only the top document is processed. Open/closed shadow roots and iframe documents are unsupported; this is explicit in README. Supporting them requires root-specific observation, CSS, and lifecycle management; closed roots cannot be discovered normally.
- **Remaining — Host frameworks can own the same DOM.** SPA insertions, replacements, text changes, and removed subtrees are observed without navigation hooks; same-document route changes retain hostname preferences. Nevertheless, framework reconciliation, page scripts inspecting child nodes, parent CSS selectors, or scripts editing generated spans can conflict. Modified wrapper text is preserved, and structurally altered emphasis is not rewritten from stale word records. Site opt-out remains the escape hatch.
- **Remaining — Browser timing and rendering unverified.** No browser was used as requested. Actual popup latency, scroll anchoring, font shaping, content-script integration, Chrome sync quota behavior, and accessibility on real pages require browser testing. Idle chunks bound individual batches, not total completion time; huge-page toggles restore progressively.

## Low

- **Fixed — Broad website access was omitted from permission explanations.** README and PRIVACY now distinguish the sole API permission (`storage`) from `<all_urls>` content-script website access. Broad website access is necessary for the existing automatic-on-all-sites behavior; no tabs, scripting, activeTab, or additional host permissions were added.
- **Fixed — Semantic bold elements could inherit host `b` styling.** Emphasis uses classed spans; typography and box resets reduce host CSS interference.
- **Remaining — Long text nodes and CJK are deliberately unchanged.** The 4,000-unit cap trades coverage for responsiveness. CJK words remain skipped because this prefix-emphasis algorithm is unsuitable for their segmentation. PDFs/canvas text are unsupported.
- **Remaining — Settings failure and concurrent site-map edits.** Popup reports persistence errors, but a failed save can leave the current tab preview different from stored preferences. Site opt-outs are one sync object, so simultaneous popup/shortcut/device edits can overwrite one another; sync storage has no atomic read-modify-write. A per-site schema would require migration and is outside this simple fix.
- **Remaining — Mutation bursts and memory scale with page content.** Root sets deduplicate identical roots but not overlapping ancestors. Traversal can revisit descendants after overlapping insertions, though existing emphasis is skipped. Tracking and generated spans scale with transformed words; detached entries are released incrementally. Very large mutation deliveries can still cost callback time, and repeated bursts may defer cleanup.
- **Reviewed — Store policy and privacy.** MV3, local packaged scripts, no eval, remote code, analytics, payment code, or network requests. Only reading preferences and disabled hostnames are synced; page text is neither transmitted nor persisted. Description presents a reading aid and README disclaims medical/speed guarantees. Store listing/privacy disclosures must accurately reflect synced settings and broad website access; approval cannot be established through source review.

## Validation

- `node --check content.js`, `popup.js`, and `background.js`: passed.
- Dependency-free Node DOM simulation: passed traversal, excluded preformatted text, Unicode text preservation (RTL/combining/CJK), CSS-only weight/opacity changes, in-place ratio changes, dynamic insertions, editable transitions, host-edited text restoration, and re-enable. This is a limited simulation, not a browser DOM or Chrome integration test.
- `bash scripts/build.sh`: passed; rebuilt `dist/adhd-reader.zip` with final files.
