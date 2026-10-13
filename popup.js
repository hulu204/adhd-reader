'use strict';
const defaults = { enabled: true, disabledSites: {}, ratio: 0.45, weight: 700, opacity: 1 };
const controls = Object.fromEntries(['enabled', 'site', 'ratio', 'weight', 'opacity'].map((id) => [id, document.getElementById(id)]));
let hostname = '';
function render(settings) {
  controls.enabled.checked = settings.enabled;
  controls.site.checked = Boolean(hostname && !settings.disabledSites[hostname]);
  for (const key of ['ratio', 'weight', 'opacity']) {
    controls[key].value = settings[key];
    document.getElementById(`${key}-value`).value = key === 'weight' ? settings[key] : `${Math.round(settings[key] * 100)}%`;
  }
}
async function save(values) {
  try { await chrome.storage.sync.set(values); document.getElementById('status').textContent = ''; }
  catch { document.getElementById('status').textContent = 'Could not save settings. Please try again.'; }
}
async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) ({ hostname } = await chrome.tabs.sendMessage(tab.id, { type: 'adhdr-site' }));
  } catch { /* Restricted pages do not allow content scripts. */ }
  document.getElementById('hostname').textContent = hostname || 'This page is unavailable. Try a regular website.';
  const settings = await chrome.storage.sync.get(defaults);
  render(settings);
  for (const [key, control] of Object.entries(controls)) control.disabled = key === 'site' && !hostname;
  controls.enabled.addEventListener('change', () => save({ enabled: controls.enabled.checked }));
  controls.site.addEventListener('change', async () => {
    try {
      const { disabledSites = {} } = await chrome.storage.sync.get('disabledSites');
      const sites = { ...disabledSites };
      if (controls.site.checked) delete sites[hostname];
      else sites[hostname] = true;
      await save({ disabledSites: sites });
    } catch { document.getElementById('status').textContent = 'Could not read site settings.'; }
  });
  for (const key of ['ratio', 'weight', 'opacity']) {
    controls[key].addEventListener('input', () => {
      document.getElementById(`${key}-value`).value = key === 'weight' ? controls[key].value : `${Math.round(Number(controls[key].value) * 100)}%`;
    });
    // Save on release to avoid exhausting sync write quotas while dragging.
    controls[key].addEventListener('change', () => save({ [key]: Number(controls[key].value) }));
  }
  chrome.storage.onChanged.addListener(async (_changes, area) => {
    if (area === 'sync') render(await chrome.storage.sync.get(defaults));
  });
}
init().catch(() => { document.getElementById('status').textContent = 'Settings could not be loaded. Reopen the popup to retry.'; });
