// Retires the offline copy of the old free Football IQ at this address.
// Phones and browsers that installed it check this file for updates; this
// version deletes the saved game files, removes itself, and reloads open tabs
// so they show the new landing page (which points to play.artcornerstudio.cloud/football-iq/).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));
    await self.registration.unregister();
    const tabs = await self.clients.matchAll({ type: 'window' });
    tabs.forEach((tab) => tab.navigate(tab.url));
  })());
});
