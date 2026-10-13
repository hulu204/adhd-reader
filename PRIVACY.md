# Privacy

ADHD Reader collects no data. It has no analytics, tracking, remote code, or network requests. Website text is transformed locally in the current page and is never transmitted or saved by the extension.

Only settings are stored in `chrome.storage.sync`: global enable, bold ratio, bold weight, rest-of-word opacity, and disabled site hostnames. Chrome may sync these preferences through your browser account according to your Chrome sync settings. There is no developer-operated server.

The only requested API permission is `storage`. Content scripts run on supported websites in the top frame to apply the reading aid. Removing the extension removes its locally stored preferences; Chrome manages synced preference retention.
