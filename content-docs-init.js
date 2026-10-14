(() => {
  const announce = () => document.dispatchEvent(new CustomEvent('adhdr-annotate', { detail: chrome.runtime.id, bubbles: true }));
  // The handshake tolerates either MAIN/isolated script execution order.
  window.addEventListener('adhdr-annotate-ready', announce);
  announce();
})();
