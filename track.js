// Sends an anonymous page view to the private visit log, and an update with
// time on page and scroll depth when the visitor leaves. No cookies.
// Visiting /?notrack once on a device turns this off for that device.
(() => {
  'use strict';

  const ENDPOINT = 'https://visits.anishnambirajan.com/hit';
  const params = new URLSearchParams(location.search);

  try {
    if (params.has('notrack')) localStorage.setItem('notrack', '1');
    if (localStorage.getItem('notrack')) return;
  } catch {
    // Storage blocked; track normally.
  }
  if (navigator.webdriver || location.hostname === 'localhost') return;

  const view = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const started = Date.now();
  let depth = 0;

  function send(data) {
    const body = JSON.stringify({ view, ...data });
    if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, body)) return;
    fetch(ENDPOINT, { method: 'POST', body, keepalive: true }).catch(() => {});
  }

  send({
    type: 'view',
    path: location.pathname,
    ref: document.referrer,
    tag: params.get('for') || '',
    screen: `${screen.width}x${screen.height}`,
  });

  function measure() {
    const seen = Math.round((100 * (scrollY + innerHeight)) / document.documentElement.scrollHeight);
    depth = Math.max(depth, Math.min(100, seen));
  }
  measure();
  addEventListener('scroll', measure, { passive: true });

  function leave() {
    send({ type: 'leave', secs: Math.round((Date.now() - started) / 1000), depth });
  }
  addEventListener('pagehide', leave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') leave();
  });
})();
