'use strict';
const defaults = ADHDReader.defaults;
const keys = ['enabled', 'site', 'ratio', 'weight', 'opacity', 'pdfMimeHandler'];
const controls = Object.fromEntries(keys.map(id => [id, document.getElementById(id)]));
const presets = { Light: { ratio: .3, weight: 600, opacity: 1 }, Balanced: { ratio: .45, weight: 700, opacity: .9 }, Strong: { ratio: .6, weight: 800, opacity: .7 } };
let hostname = '', tabId, current = { ...defaults }, contextUrl = '', isDocs = false;
const dirty = new Set();
function preview(values) {
  Object.assign(current, values);
  ADHDReader.render(document.getElementById('preview'), 'Find your focus, one word at a time. Reading can follow your own rhythm.', current);
  if (tabId) {
    chrome.tabs.sendMessage(tabId, { type: 'adhdr-preview', values }).catch(() => {});
    // Extension viewer pages receive runtime messages rather than tab content messages.
    chrome.runtime.sendMessage({ type: 'adhdr-viewer-preview', tabId, values }).catch(() => {});
  }
}
function render(settings) {
  current = ADHDReader.normalize({ ...settings, ...Object.fromEntries([...dirty].map(key => [key, current[key]])) });
  for (const key of ['enabled', 'pdfMimeHandler']) controls[key].checked = current[key] !== false;
  controls.site.checked = Boolean(hostname && !Object.hasOwn(current.disabledSites, hostname));
  for (const key of ['ratio', 'weight', 'opacity']) {
    controls[key].value = current[key];
    document.getElementById(`${key}-value`).value = key === 'weight' ? current[key] : `${Math.round(current[key] * 100)}%`;
  }
  for (const button of document.querySelectorAll('[data-preset]')) button.setAttribute('aria-pressed', String(Object.entries(presets[button.dataset.preset]).every(([key, value]) => current[key] === value)));
  const list = document.getElementById('disabled-sites'); list.replaceChildren();
  const hosts = Object.keys(current.disabledSites).sort();
  document.getElementById('empty').hidden = hosts.length > 0;
  document.getElementById('site-count').textContent = `(${hosts.length})`;
  for (const host of hosts) {
    const row = document.createElement('li'), name = document.createElement('span'), remove = document.createElement('button');
    name.textContent = host; remove.textContent = 'Remove'; remove.setAttribute('aria-label', `Enable ${host}`);
    remove.onclick = () => changeSite(host, true); row.append(name, remove); list.append(row);
  }
  preview({});
}
async function save(values) {
  preview(values); render(current);
  try { await chrome.storage.sync.set(values); document.getElementById('status').textContent = ''; }
  catch { document.getElementById('status').textContent = 'Could not save settings. Please try again.'; }
}
async function changeSite(host, enabled) {
  try {
    const { disabledSites = {} } = await chrome.storage.sync.get('disabledSites');
    const sites = { ...disabledSites };
    if (enabled) delete sites[host]; else sites[host] = true;
    await save({ disabledSites: sites });
  } catch { document.getElementById('status').textContent = 'Could not read site settings.'; }
}
function pdfUrl(tabUrl = '') {
  try {
    const url = new URL(tabUrl);
    if (url.protocol === 'chrome-extension:' && (url.hostname === 'mhjfbmdgcfjbbpaeojofohoefgiehjai' || (url.hostname === chrome.runtime.id && url.pathname === '/viewer/pdf.html'))) {
      const original = url.searchParams.get('file') || url.searchParams.get('url');
      return original && /^(https?:|file:)/.test(original) ? original : '';
    }
    return ['http:', 'https:', 'file:'].includes(url.protocol) && /\.pdf$/i.test(url.pathname) ? url.href : '';
  } catch { return ''; }
}
async function init() {
  render(await chrome.storage.sync.get(defaults));
  for (const key of keys.filter(key => key !== 'site')) controls[key].disabled = false;
  controls.enabled.onchange = () => save({ enabled: controls.enabled.checked });
  controls.pdfMimeHandler.onchange = () => save({ pdfMimeHandler: controls.pdfMimeHandler.checked });
  if (!chrome.mimeHandler) document.getElementById('pdf-hint').textContent = 'Automatic PDF handling needs Chrome 151+. PDF URL and local-file reading remain available.';
  controls.site.onchange = () => changeSite(hostname, controls.site.checked);
  for (const key of ['ratio', 'weight', 'opacity']) {
    controls[key].oninput = () => { dirty.add(key); preview({ [key]: Number(controls[key].value) }); render(current); };
    controls[key].onchange = () => { dirty.delete(key); save({ [key]: Number(controls[key].value) }); };
  }
  for (const button of document.querySelectorAll('[data-preset]')) button.onclick = () => { dirty.clear(); save(presets[button.dataset.preset]); };
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const values = { ...current };
    for (const key of Object.keys(defaults)) if (key in changes) values[key] = changes[key].newValue ?? defaults[key];
    render(values);
  });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); tabId = tab?.id;
  contextUrl = pdfUrl(tab?.url);
  try {
    if (tabId) {
      let info;
      try { info = await chrome.tabs.sendMessage(tabId, { type: 'adhdr-site' }); }
      catch { info = await chrome.runtime.sendMessage({ type: 'adhdr-viewer-info', tabId }); }
      hostname = info?.hostname || ''; isDocs = Boolean(info?.docs);
      if (info?.pdf && info.url) contextUrl = info.url;
    }
  } catch { /* Protected pages may still expose their URL with activeTab. */ }
  if (!hostname) { try { const url = new URL(contextUrl || tab?.url); if (['https:', 'http:'].includes(url.protocol)) hostname = url.hostname; } catch { /* No accessible URL. */ } }
  if (tab?.url?.startsWith('https://docs.google.com/document/')) isDocs = true;
  const context = document.getElementById('context');
  context.hidden = !contextUrl && !isDocs;
  context.textContent = isDocs ? 'Open Focus Reader' : 'Open in ADHD Reader';
  context.onclick = async () => {
    try {
      const result = isDocs ? await chrome.tabs.sendMessage(tabId, { type: 'adhdr-docs-open' }) : await chrome.runtime.sendMessage({ type: 'adhdr-open-pdf', url: contextUrl });
      if (!result?.ok) throw new Error('Unavailable');
      window.close();
    } catch { document.getElementById('status').textContent = 'Could not open reader. Reload the page and try again.'; }
  };
  document.getElementById('hostname').textContent = hostname || 'This page has no supported site controls.';
  controls.site.disabled = !hostname; render(current);
}
init().catch(() => { document.getElementById('status').textContent = 'Settings could not be loaded. Reopen the popup to retry.'; });
