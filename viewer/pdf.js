import { getDocument, GlobalWorkerOptions } from '../vendor/pdfjs/pdf.min.mjs';
GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('vendor/pdfjs/pdf.worker.min.mjs');
const status = document.getElementById('status'), pages = document.getElementById('pages');
const fallback = document.getElementById('fallback');
let settings = ADHDReader.defaults, stream, originalUrl = '', task, generation = 0, viewerTabId;
const records = [];
function render(record) {
  let hostname = '';
  try { hostname = new URL(originalUrl).hostname; } catch { /* Local selection has no hostname. */ }
  ADHDReader.render(record.article, record.text, { ...settings, enabled: settings.enabled && !Object.hasOwn(settings.disabledSites, hostname) });
}
function update(values) { settings = ADHDReader.normalize({ ...settings, ...values }); records.forEach(render); }
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  const values = {};
  for (const key of Object.keys(ADHDReader.defaults)) if (key in changes) values[key] = changes[key].newValue ?? ADHDReader.defaults[key];
  update(values);
});
chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message.type === 'adhdr-site' || (message.type === 'adhdr-viewer-info' && message.tabId === viewerTabId)) {
    let hostname = ''; try { hostname = new URL(originalUrl).hostname; } catch { /* No URL. */ }
    respond({ hostname, pdf: true, url: originalUrl });
  }
  if (message.type === 'adhdr-preview' || (message.type === 'adhdr-viewer-preview' && message.tabId === viewerTabId)) { update(message.values); respond({ ok: true }); }
});
fallback.onclick = async () => {
  try { await chrome.mimeHandler.abortAndFallbackToNativeHandler(); }
  catch { status.textContent = 'Could not switch viewers. Turn off “Handle PDFs with Gripread” in the popup, then reload the original PDF.'; }
};
async function load(data, label) {
  const token = ++generation;
  if (task) await task.destroy();
  records.length = 0; pages.replaceChildren();
  document.getElementById('source').textContent = label;
  status.textContent = 'Extracting PDF text…';
  try {
    task = getDocument({ data, isEvalSupported: false, useSystemFonts: true });
    const pdf = await task.promise;
    let readable = 0;
    for (let number = 1; number <= pdf.numPages; number++) {
      if (token !== generation) return;
      const page = await pdf.getPage(number), content = await page.getTextContent();
      if (token !== generation) return;
      const text = content.items.filter(item => typeof item.str === 'string').map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('').trim();
      if (text) readable++;
      const section = document.createElement('section'), heading = document.createElement('h2'), article = document.createElement('article');
      section.className = 'page'; heading.textContent = `Page ${number} of ${pdf.numPages}`; article.dir = 'auto';
      const record = { article, text: text || 'No extractable text on this page. This may be a scan or image.' };
      records.push(record); render(record); section.append(heading, article); pages.append(section);
      page.cleanup(); status.textContent = `Reading ${number} of ${pdf.numPages} pages…`;
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    status.textContent = readable ? `${pdf.numPages} pages loaded. Settings follow the extension popup.` : 'No text found. OCR is not included; use the original PDF viewer for scanned pages.';
  } catch (error) {
    if (token !== generation) return;
    status.textContent = error?.name === 'PasswordException' ? 'This PDF requires a password. Use Chrome’s PDF viewer to open it.' : 'Could not read this PDF. Try a local file, or use Chrome’s PDF viewer. The file may be protected or invalid.';
  }
}
document.getElementById('file').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  try { originalUrl = ''; await load(new Uint8Array(await file.arrayBuffer()), file.name); }
  catch { status.textContent = 'Could not read the selected file. Please choose it again.'; }
};
async function init() {
  update(await chrome.storage.sync.get(ADHDReader.defaults));
  if (chrome.tabs?.getCurrent) viewerTabId = (await chrome.tabs.getCurrent())?.id;
  const requested = new URLSearchParams(location.search).get('url');
  if (!requested && chrome.mimeHandler) {
    try { stream = await chrome.mimeHandler.getStreamInfo(); } catch { /* Opened as a standalone viewer. */ }
  }
  if (stream) {
    originalUrl = stream.originalUrl; viewerTabId = stream.tabId ?? viewerTabId; fallback.hidden = false;
    if (settings.pdfMimeHandler === false) { await chrome.mimeHandler.abortAndFallbackToNativeHandler(); return; }
    // Consume the one-use stream fully, never re-fetch the original request.
    const response = await fetch(stream.streamUrl);
    if (!response.ok) throw new Error('Stream unavailable');
    await load(new Uint8Array(await response.arrayBuffer()), originalUrl);
  } else if (requested) {
    const url = new URL(requested);
    if (!['http:', 'https:', 'file:'].includes(url.protocol)) throw new Error('Unsupported URL');
    originalUrl = url.href;
    const response = await fetch(url.href, { credentials: 'include' });
    if (!response.ok) throw new Error('PDF fetch failed');
    await load(new Uint8Array(await response.arrayBuffer()), originalUrl);
  }
}
init().catch(() => { status.textContent = 'Could not load this PDF URL. File URLs need “Allow access to file URLs”; private links may require authentication or have expired. Choose a downloaded PDF above or use Chrome’s viewer.'; });
