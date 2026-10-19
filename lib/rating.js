(() => {
  'use strict';
  function shouldShow({ installedAt, pages, state, now }) {
    return state === undefined && Number.isFinite(installedAt)
      && now - installedAt >= 5 * 24 * 60 * 60 * 1000
      && Array.isArray(pages) && pages.length >= 10;
  }
  function hashPage(key) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) {
      hash ^= key.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
  async function recordHash(storage, hash) {
    try {
      if (!/^[0-9a-f]{8}$/.test(hash)) return;
      const { rp_pages = [] } = await storage.get('rp_pages');
      if (!Array.isArray(rp_pages) || rp_pages.length >= 10) return;
      if (!rp_pages.includes(hash)) await storage.set({ rp_pages: [...rp_pages, hash] });
    } catch { /* Optional counters never interfere with reading. */ }
  }
  const recordPage = (storage, key) => recordHash(storage, hashPage(key));
  // Serializes writes so concurrent tabs cannot overwrite each other's hashes (used by the service worker).
  function createRecorder(storage) {
    let queue = Promise.resolve();
    return hash => (queue = queue.then(() => recordHash(storage, hash)));
  }
  globalThis.GripreadRating = { shouldShow, hashPage, recordHash, recordPage, createRecorder };
})();
