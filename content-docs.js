(() => {
  'use strict';
  let settings = ADHDReader.defaults, panel, input, output, status, previousFocus;
  const button = document.createElement('button');
  button.id = 'adhdr-docs-button'; button.textContent = 'Focus Reader';
  document.body.append(button);
  function render() {
    if (!output) return;
    ADHDReader.render(output, input.value, { ...settings, enabled: settings.enabled && !Object.hasOwn(settings.disabledSites, location.hostname) });
  }
  function extract() {
    const rects = [...document.querySelectorAll('.kix-appview-editor svg rect[aria-label], .kix-canvas-tile-content svg rect[aria-label]')];
    const text = rects.map(rect => rect.getAttribute('aria-label')).filter(Boolean).join('\n');
    if (text.trim()) {
      input.value = text;
      status.textContent = 'Extracted visible annotated text. Scroll the document and refresh for other pages; verify completeness.';
    } else {
      status.textContent = 'Docs canvas text is unavailable. Close this panel, select document text (Ctrl+A / ⌘A), copy, then reopen and paste below. Clipboard is read only when you paste.';
    }
    render();
  }
  function close() { panel.hidden = true; (previousFocus || button).focus(); }
  function open() {
    previousFocus = document.activeElement;
    if (!panel) {
      panel = document.createElement('section'); panel.id = 'adhdr-docs-panel';
      panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Focus Reader');
      const title = document.createElement('h2'); title.textContent = 'Focus Reader';
      const note = document.createElement('p'); note.textContent = 'A separate reading view. Your document is not edited.';
      const closeButton = document.createElement('button'); closeButton.textContent = 'Close'; closeButton.onclick = close;
      const refresh = document.createElement('button'); refresh.textContent = 'Refresh extracted text'; refresh.onclick = extract;
      status = document.createElement('p'); status.setAttribute('role', 'status');
      input = document.createElement('textarea'); input.placeholder = 'Paste document text here…'; input.setAttribute('aria-label', 'Document text'); input.oninput = render;
      output = document.createElement('article'); output.dir = 'auto';
      panel.append(title, note, closeButton, refresh, status, input, output); document.body.append(panel);
      panel.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
    }
    panel.hidden = false;
    if (!input.value) extract();
    input.focus();
  }
  button.onclick = open;
  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message.type === 'adhdr-site') respond({ hostname: location.hostname, docs: true });
    if (message.type === 'adhdr-docs-open') { open(); respond({ ok: true }); }
    if (message.type === 'adhdr-preview') { settings = ADHDReader.normalize({ ...settings, ...message.values }); render(); respond({ ok: true }); }
  });
  chrome.storage.sync.get(ADHDReader.defaults).then(values => { settings = ADHDReader.normalize(values); render(); });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const values = {};
    for (const key of Object.keys(ADHDReader.defaults)) if (key in changes) values[key] = changes[key].newValue ?? ADHDReader.defaults[key];
    settings = ADHDReader.normalize({ ...settings, ...values }); render();
  });
})();
