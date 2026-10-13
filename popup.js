'use strict';
const defaults = { enabled: true, disabledSites: {}, ratio: 0.45, weight: 700, opacity: 1 };
const controls = Object.fromEntries(['enabled', 'site', 'ratio', 'weight', 'opacity'].map((id) => [id, document.getElementById(id)]));
let hostname = '';
let tabId;
let current = { ...defaults };
const dirty = new Set();
function preview(values) {
  Object.assign(current, values);
  if (tabId) chrome.tabs.sendMessage(tabId, { type: 'adhdr-preview', values }).catch(() => {});
}
function render(settings) {
  current = { ...settings, ...Object.fromEntries([...dirty].map((key) => [key, current[key]])) };
  settings = current;
  controls.enabled.checked = settings.enabled;
  controls.site.checked = Boolean(hostname && !Object.hasOwn(settings.disabledSites || {}, hostname));
  for (const key of ['ratio', 'weight', 'opacity']) {
    controls[key].value = settings[key];
    document.getElementById(`${key}-value`).value = key === 'weight' ? settings[key] : `${Math.round(settings[key] * 100)}%`;
  }
}
async function save(values) {
  preview(values);
  try { await chrome.storage.sync.set(values); document.getElementById('status').textContent = ''; }
  catch { document.getElementById('status').textContent = 'Could not save settings. Please try again.'; }
}
async function init() {
  const stored = await chrome.storage.sync.get(defaults);
  render(stored);
  for (const key of ['enabled', 'ratio', 'weight', 'opacity']) controls[key].disabled = false;
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
      dirty.add(key);
      preview({ [key]: Number(controls[key].value) });
      document.getElementById(`${key}-value`).value = key === 'weight' ? controls[key].value : `${Math.round(Number(controls[key].value) * 100)}%`;
    });
    // Save on release to avoid exhausting sync write quotas while dragging.
    controls[key].addEventListener('change', () => {
      dirty.delete(key);
      save({ [key]: Number(controls[key].value) });
    });
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const values = { ...current };
    for (const key of Object.keys(defaults)) if (key in changes) values[key] = changes[key].newValue ?? defaults[key];
    render(values);
  });
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = tab?.id;
    if (tabId) ({ hostname } = await Promise.race([
      chrome.tabs.sendMessage(tab.id, { type: 'adhdr-site' }),
      new Promise((resolve) => setTimeout(() => resolve({ hostname: '' }), 500))
    ]));
  } catch { /* Restricted pages do not allow content scripts. */ }
  document.getElementById('hostname').textContent = hostname || 'This page is unavailable. Try a regular website.';
  render(current);
  controls.site.disabled = !hostname;

}
init().catch(() => { document.getElementById('status').textContent = 'Settings could not be loaded. Reopen the popup to retry.'; });
