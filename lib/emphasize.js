(() => {
  'use strict';
  const defaults = { enabled: true, disabledSites: {}, ratio: .45, weight: 700, opacity: 1, pdfMimeHandler: true };
  const letters = /\p{L}/u;
  const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\u3100-\u312f\u31a0-\u31bf]/u;
  const words = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu;
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  function normalize(values = {}) {
    const settings = { ...defaults, ...values };
    for (const [key, min, max] of [['ratio', .2, .7], ['weight', 500, 900], ['opacity', .4, 1]]) {
      settings[key] = Number.isFinite(settings[key]) ? Math.min(max, Math.max(min, settings[key])) : defaults[key];
    }
    settings.enabled = settings.enabled !== false;
    if (!settings.disabledSites || typeof settings.disabledSites !== 'object') settings.disabledSites = {};
    return settings;
  }
  function update(parts, ratio) {
    for (const part of parts) {
      const count = Math.max(1, Math.ceil(part.units.length * ratio));
      part.bold.textContent = part.units.slice(0, count).join('');
      part.rest.textContent = part.units.slice(count).join('');
    }
  }
  function create(source, values) {
    const settings = normalize(values), wrapper = document.createElement('span'), parts = [];
    wrapper.className = 'adhdr-w';
    let cursor = 0;
    for (const match of source.matchAll(words)) {
      if (!letters.test(match[0]) || cjk.test(match[0])) continue;
      wrapper.append(document.createTextNode(source.slice(cursor, match.index)));
      const bold = document.createElement('span'), rest = document.createElement('span');
      bold.className = 'adhdr-b'; rest.className = 'adhdr-r';
      parts.push({ bold, rest, units: Array.from(segmenter.segment(match[0]), p => p.segment) });
      wrapper.append(bold, rest); cursor = match.index + match[0].length;
    }
    wrapper.append(document.createTextNode(source.slice(cursor)));
    update(parts, settings.ratio);
    return { wrapper, parts };
  }
  function render(target, source, values) {
    const settings = normalize(values);
    target.style.setProperty('--adhdr-weight', settings.weight);
    target.style.setProperty('--adhdr-opacity', settings.opacity);
    target.replaceChildren(settings.enabled ? create(source, settings).wrapper : document.createTextNode(source));
  }
  globalThis.ADHDReader = { defaults, letters, normalize, create, update, render };
})();
