# Privacy

ADHD Reader collects no page content or analytics. Website, Docs, pasted text, and PDF content are processed locally, never uploaded to a developer server, and never stored by the extension. There is no tracking, analytics, or remote runtime code.

Chrome sync stores global enable, emphasis ratio/weight/opacity, disabled hostnames, and the PDF-handler preference. Chrome may sync these through your account according to browser settings. There is no developer-operated server.

`storage` saves those preferences. `activeTab` allows access to the active tab URL when you invoke the popup, so PDF and Docs actions can be offered. HTTP(S) and file host permissions allow the standalone PDF reader to fetch a requested document directly from its original source; cookies may accompany that request for authenticated PDFs. The source server receives this ordinary document request. The preferred MIME-handler path consumes Chrome's existing response instead of re-requesting the original URL. Local PDFs chosen with the file picker remain local.

The `<all_urls>` content-script match grants broad website access for automatic local formatting; Chrome may show a broad access warning. Generic scripts run only in the top frame. Docs uses a separate panel and a document-start annotation hint, which Google may ignore. Clipboard text is accessed only through the user's paste action; no clipboard permission is requested. The PDF MIME handler can render embedded documents without enabling generic content scripts in all frames.

Removing the extension removes locally stored preferences; Chrome manages synced preference retention.
