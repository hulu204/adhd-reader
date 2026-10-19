(() => {
  'use strict';
  const defaults = { enabled: true, disabledSites: {}, ratio: 0.45, weight: 700, opacity: 1 };
  const skipped = 'script,style,noscript,textarea,input,select,option,code,pre,kbd,samp,svg,math,canvas,iframe,[contenteditable],.adhdr-w';
  if (location.hostname === 'docs.google.com' && location.pathname.startsWith('/document/')) return;
  const { letters, create, update } = ADHDReader;
  const originals = new Map();
  let settings = { ...defaults }, active = false, scheduled = false;
  let roots = new Set(), stack = [], updates = null;
  let loaded = false, ratingRecorded = false;
  const pending = {};
  const eligible = (node) => node.parentElement && !node.parentElement.closest(skipped)
    && node.parentElement.namespaceURI === 'http://www.w3.org/1999/xhtml' && letters.test(node.data);

  function emphasize(parts) { update(parts, settings.ratio); }
  function transform(node) {
    if (!eligible(node) || node.data.length > 4000) return;
    const source = node.data;
    const { wrapper, parts } = create(source, settings);
    if (!parts.length) return;
    originals.set(wrapper, { node, source, parts });
    node.replaceWith(wrapper);
    if (!ratingRecorded) {
      ratingRecorded = true;
      try { chrome.runtime.sendMessage({ type: 'rp-record', hash: GripreadRating.hashPage(location.origin + location.pathname) }).catch(() => {}); }
      catch { /* Reading works even when local storage is unavailable. */ }
    }
  }
  function restore(wrapper, original) {
    // Preserve edits made by the host page instead of resurrecting stale source text.
    original.node.data = wrapper.textContent;
    wrapper.replaceWith(original.node);
    originals.delete(wrapper);
  }
  function enqueue(root) {
    if (!active || !root?.isConnected) return;
    if (root.nodeType === Node.TEXT_NODE || root.nodeType === Node.ELEMENT_NODE) roots.add(root);
    schedule();
  }
  function collect(records) {
    for (const record of records) {
      // Sweep detached wrappers incrementally after removals.
      if (record.removedNodes?.length) updates = originals.entries();
      if (record.type === 'attributes') {
        updates = originals.entries();
        enqueue(record.target);
      } else if (record.type === 'characterData') enqueue(record.target);
      else for (const node of record.addedNodes) enqueue(node);
    }
    schedule();
  }
  const observer = new MutationObserver(collect);
  function observe() {
    observer.observe(document.documentElement, { childList: true, subtree: true,
      characterData: true, attributes: true, attributeFilter: ['contenteditable'] });
  }
  function schedule() {
    if (scheduled || (!updates && !roots.size && !stack.length)) return;
    scheduled = true;
    const run = (deadline) => {
      collect(observer.takeRecords()); observer.disconnect();
      const start = performance.now(); let count = 0;
      try {
        while (count++ < 100 && performance.now() - start < 6
          && (deadline.didTimeout || deadline.timeRemaining() > 1)) {
          if (updates) {
            const next = updates.next();
            if (next.done) { updates = null; continue; }
            const [wrapper, original] = next.value;
            if (!wrapper.isConnected) originals.delete(wrapper);
            else if (!active || wrapper.parentElement?.closest(skipped)) restore(wrapper, original);
            else if (wrapper.textContent === original.source
              && original.parts.every((part) => wrapper.contains(part.bold) && wrapper.contains(part.rest))) emphasize(original.parts);
            continue;
          }
          if (!active) { roots.clear(); stack = []; break; }
          if (!stack.length) {
            const root = roots.values().next().value;
            if (!root) break;
            roots.delete(root); stack.push(root);
          }
          const node = stack.pop();
          if (!node.cursor && !node.isConnected) continue;
          if (node.nodeType === Node.TEXT_NODE) transform(node);
          else if (node.nodeType === Node.ELEMENT_NODE && !node.closest(skipped)) {
            // A cursor visits one sibling at a time, even in very wide subtrees.
            if (node.firstChild) stack.push({ cursor: node.firstChild });
          } else if (node.cursor) {
            const child = node.cursor;
            if (child.nextSibling) stack.push({ cursor: child.nextSibling });
            stack.push(child);
          }
        }
      } finally { observe(); scheduled = false; schedule(); }
    };
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 100 });
    else setTimeout(() => run({ didTimeout: true, timeRemaining: () => 6 }), 16);
  }
  function apply(values) {
    if (!loaded) Object.assign(pending, values);
    const previous = settings, wasActive = active;
    settings = { ...settings, ...values };
    for (const [key, min, max] of [['ratio', .2, .7], ['weight', 500, 900], ['opacity', .4, 1]]) {
      settings[key] = Number.isFinite(settings[key]) ? Math.min(max, Math.max(min, settings[key])) : defaults[key];
    }
    settings.enabled = settings.enabled !== false;
    if (!settings.disabledSites || typeof settings.disabledSites !== 'object') settings.disabledSites = {};
    active = settings.enabled && !Object.hasOwn(settings.disabledSites, location.hostname);
    document.documentElement.style.setProperty('--adhdr-weight', String(settings.weight));
    document.documentElement.style.setProperty('--adhdr-opacity', String(settings.opacity));
    if (active !== wasActive || previous.ratio !== settings.ratio) updates = originals.entries();
    if (active && !wasActive) enqueue(document.body || document.documentElement);
    if (!active) { roots.clear(); stack = []; }
    schedule();
  }
  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message.type === 'adhdr-site') {
      const embedded = document.querySelector('embed[type="application/pdf"], object[type="application/pdf"]');
      const candidate = embedded?.getAttribute('src') || embedded?.getAttribute('data');
      let url = location.href;
      try { if (candidate) url = new URL(candidate, location.href).href; } catch { /* Ignore invalid source. */ }
      respond({ hostname: location.hostname, pdf: document.contentType === 'application/pdf' || Boolean(embedded), url });
    }
    if (message.type === 'adhdr-preview') { apply(message.values); respond({ ok: true }); }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const values = {};
    for (const key of Object.keys(defaults)) if (key in changes) values[key] = changes[key].newValue ?? defaults[key];
    apply(values);
  });
  observe();
  const initial = chrome.storage.sync.get(defaults);
  initial.then((stored) => { loaded = true; apply({ ...stored, ...pending }); })
    .catch(() => { loaded = true; apply({ ...defaults, ...pending }); });
})();
