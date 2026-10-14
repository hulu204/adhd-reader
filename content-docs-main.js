// Runs before the Docs application. Google may ignore this unless whitelisted.
window.addEventListener('adhdr-annotate', (event) => {
  if (typeof event.detail === 'string' && /^[a-p]{32}$/.test(event.detail)) {
    window._docs_annotate_canvas_by_ext = event.detail;
  }
});
document.dispatchEvent(new Event('adhdr-annotate-ready', { bubbles: true }));
