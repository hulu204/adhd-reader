/* Ask the content script for its hostname: no tabs or activeTab permission needed. */
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-site') return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const { hostname } = await chrome.tabs.sendMessage(tab.id, { type: 'adhdr-site' });
    if (!hostname) return;
    const { disabledSites = {} } = await chrome.storage.sync.get('disabledSites');
    const sites = { ...disabledSites };
    if (Object.hasOwn(sites, hostname)) delete sites[hostname];
    else sites[hostname] = true;
    await chrome.storage.sync.set({ disabledSites: sites });
  } catch {
    // Chrome internal pages and other restricted pages have no content script.
  }
});

async function syncPdfHandler() {
  if (!chrome.mimeHandler) return;
  const { pdfMimeHandler = true } = await chrome.storage.sync.get('pdfMimeHandler');
  await chrome.mimeHandler.setMimeHandlerOptions('application/pdf', { enabled: pdfMimeHandler !== false });
}
chrome.runtime.onInstalled.addListener(() => syncPdfHandler().catch(console.error));
chrome.runtime.onStartup.addListener(() => syncPdfHandler().catch(console.error));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.pdfMimeHandler) syncPdfHandler().catch(console.error);
});
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.type !== 'adhdr-open-pdf' || sender.id !== chrome.runtime.id) return;
  (async () => {
    const url = new URL(message.url);
    if (!['http:', 'https:', 'file:'].includes(url.protocol)) throw new Error('Unsupported PDF URL');
    await chrome.tabs.create({ url: chrome.runtime.getURL('viewer/pdf.html') + '?url=' + encodeURIComponent(url.href) });
    return { ok: true };
  })().then(respond).catch(() => respond({ ok: false }));
  return true;
});
