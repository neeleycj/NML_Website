/* Twitch live indicator for the "WATCH LIVE" buttons.
 *
 * Checks whether the linked Twitch channel is currently streaming and toggles
 * the `is-live` class on every .watch-live-btn. The status comes from decapi.me,
 * a public relay for Twitch's API that allows cross-origin requests, because a
 * static site cannot hold Twitch API credentials. If the check fails for any
 * reason the button simply stays in its muted (offline) state.
 */
(function () {
    'use strict';

    var buttons = Array.prototype.slice.call(document.querySelectorAll('.watch-live-btn'));
    if (!buttons.length) return;

    // Channel name comes from the button's own twitch.tv link.
    var match = (buttons[0].getAttribute('href') || '').match(/twitch\.tv\/([A-Za-z0-9_]+)/);
    if (!match) return;
    var channel = match[1].toLowerCase();

    var STATUS_URL = 'https://decapi.me/twitch/uptime/' + encodeURIComponent(channel);
    var REFRESH_MS = 60 * 1000;      // how often to re-check while the page is open
    var CACHE_KEY = 'nml-twitch-live:' + channel;
    var CACHE_TTL = 45 * 1000;       // reuse a recent result when moving between pages

    function apply(live) {
        buttons.forEach(function (btn) {
            btn.classList.toggle('is-live', live);
            btn.setAttribute('title', live ? channel + ' is live on Twitch right now' : channel + ' is currently offline');
            btn.setAttribute('aria-label', live ? 'Watch live (streaming now)' : 'Watch live (currently offline)');
        });
    }

    function readCache() {
        try {
            var raw = sessionStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            var data = JSON.parse(raw);
            if (Date.now() - data.t > CACHE_TTL) return null;
            return data;
        } catch (e) { return null; }
    }

    function writeCache(live) {
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ live: live, t: Date.now() })); } catch (e) { /* ignore */ }
    }

    function check() {
        if (document.hidden) return;
        fetch(STATUS_URL, { cache: 'no-store' })
            .then(function (res) { return res.ok ? res.text() : ''; })
            .then(function (text) {
                var body = (text || '').trim().toLowerCase();
                // Offline responses look like "nomanslandtcg is offline"; live ones are an uptime
                // such as "1 hour, 12 minutes". Anything unexpected is treated as offline.
                var live = body.length > 0 &&
                    body.indexOf('offline') === -1 &&
                    body.indexOf('error') === -1 &&
                    body.indexOf('not found') === -1 &&
                    body.indexOf('no user') === -1;
                writeCache(live);
                apply(live);
            })
            .catch(function () { /* network problem: leave the current state alone */ });
    }

    var cached = readCache();
    if (cached) apply(cached.live);
    else check();

    setInterval(check, REFRESH_MS);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
})();
