(() => {
  'use strict';
  const defaults = { enabled: true, disabledSites: {}, ratio: 0.45, weight: 700, opacity: 1 };
  const skipped = 'script,style,noscript,textarea,input,select,option,code,pre,kbd,samp,svg,math,canvas,iframe,[contenteditable],.adhdr-w';
  const letters = /\p{L}/u;
  const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\u3100-\u312f\u31a0-\u31bf]/u;
  const words = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu;
  const originals = new Map();
  const segmenter = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  let settings = defaults;
  let active = false;
  let generation = 0;
  let scheduled = false;
  const roots = new Set();
  let walker = null;

  const eligible = (node) => node.parentElement && !node.parentElement.closest(skipped)
    && letters.test(node.data);

  function transform(node) {
    if (!eligible(node)) return;
    const source = node.data;
    const wrapper = document.createElement('span');
    wrapper.className = 'adhdr-w';
    let cursor = 0;
    let changed = false;
    for (const match of source.matchAll(words)) {
      const word = match[0];
      if (!letters.test(word) || cjk.test(word)) continue;
      wrapper.append(document.createTextNode(source.slice(cursor, match.index)));
      const units = segmenter ? Array.from(segmenter.segment(word), (part) => part.segment) : Array.from(word);
      const count = Math.max(1, Math.ceil(units.length * settings.ratio));
      const bold = document.createElement('b');
      bold.className = 'adhdr-b';
      bold.textContent = units.slice(0, count).join('');
      wrapper.append(bold);
      if (count < units.length) {
        const rest = document.createElement('span');
        rest.className = 'adhdr-r';
        rest.textContent = units.slice(count).join('');
        wrapper.append(rest);
      }
      cursor = match.index + word.length;
      changed = true;
    }
    if (!changed) return;
    wrapper.append(document.createTextNode(source.slice(cursor)));
    originals.set(wrapper, { node, source });
    node.replaceWith(wrapper);
  }

  function enqueue(root) {
    if (!active || !root?.isConnected) return;
    if (root.nodeType === Node.TEXT_NODE && eligible(root)) roots.add(root);
    else if (root.nodeType === Node.ELEMENT_NODE && !root.closest(skipped)) roots.add(root);
    schedule();
  }

  function collect(records) {
    for (const record of records) {
      if (record.type === 'characterData') enqueue(record.target);
      else if (record.type === 'attributes') enqueue(record.target);
      else for (const node of record.addedNodes) enqueue(node);
    }
    // Release detached subtrees on dynamic sites.
    for (const wrapper of originals.keys()) if (!wrapper.isConnected) originals.delete(wrapper);
  }
  const observer = new MutationObserver(collect);
  const observe = () => observer.observe(document.documentElement, {
    childList: true, subtree: true, characterData: true,
    attributes: true, attributeFilter: ['contenteditable']
  });

  function schedule() {
    if (scheduled || !active || (!roots.size && !walker)) return;
    scheduled = true;
    const version = generation;
    const run = (deadline) => {
      if (version !== generation) return;
      collect(observer.takeRecords());
      // Disconnect only for our synchronous DOM edits, avoiding self-triggered work.
      observer.disconnect();
      const started = performance.now();
      let processed = 0;
      const batch = [];
      try {
        while (active && processed < 200 && performance.now() - started < 8
          && (deadline.didTimeout || deadline.timeRemaining() > 1)) {
          if (!walker) {
            const root = roots.values().next().value;
            if (!root) break;
            roots.delete(root);
            if (!root.isConnected) continue;
            if (root.nodeType === Node.TEXT_NODE) { batch.push(root); processed++; continue; }
            walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
              acceptNode: (node) => eligible(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
            });
          }
          const node = walker.nextNode();
          if (!node) { walker = null; continue; }
          batch.push(node);
          processed++;
        }
        for (const node of batch) if (node.isConnected) transform(node);
      } finally { observe(); }
      scheduled = false;
      schedule();
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 200 });
    else setTimeout(() => run({ didTimeout: true, timeRemaining: () => 8 }), 16);
  }

  function apply() {
    generation++;
    scheduled = false;
    roots.clear();
    walker = null;
    observer.disconnect();
    const parents = new Set();
    for (const [wrapper, original] of originals) {
      if (!wrapper.isConnected) continue;
      parents.add(wrapper.parentNode);
      original.node.data = original.source;
      wrapper.replaceWith(original.node);
    }
    originals.clear();
    for (const parent of parents) parent.normalize();
    active = settings.enabled && !settings.disabledSites[location.hostname];
    document.documentElement.style.setProperty('--adhdr-weight', String(settings.weight));
    document.documentElement.style.setProperty('--adhdr-opacity', String(settings.opacity));
    observe();
    if (active) enqueue(document.body || document.documentElement);
  }

  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message.type === 'adhdr-site') respond({ hostname: location.hostname });
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    let changed = false;
    for (const key of Object.keys(defaults)) {
      if (key in changes) { settings[key] = changes[key].newValue ?? defaults[key]; changed = true; }
    }
    if (changed) apply();
  });
  chrome.storage.sync.get(defaults).then((stored) => { settings = stored; apply(); });
})();
