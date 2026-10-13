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
    if (sites[hostname]) delete sites[hostname];
    else sites[hostname] = true;
    await chrome.storage.sync.set({ disabledSites: sites });
  } catch {
    // Chrome internal pages and other restricted pages have no content script.
  }
});
