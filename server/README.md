# EQ Sentry — backend

A small Node/Express service that powers the parts of EQ Sentry that need a server:

- **USGS proxy + cache** — `GET /api/usgs/:feed` (e.g. `/api/usgs/2.5_week`), cached 60s, serves stale if USGS is down. Avoids browser CORS and rate limits.
- **Alert subscriptions with double opt-in** — `POST /api/subscribe`, `GET /api/confirm`, `GET /api/unsubscribe` (one-click).
- **Automated alert engine** — polls USGS, matches each event to subscribers by district + magnitude, de-duplicates, and sends via SMS / email (Viber & WhatsApp stubs included).
- Can also serve the static website, so one process runs everything.

## Quick start
```bash
cd server
cp .env.example .env        # then fill in values
npm install
npm start                   # http://localhost:8787  (serves API + website)
```
No database server needed — subscribers are stored in `server/data/*.json` (atomic writes).
For production scale, swap `lib/db.js` for Postgres.

## Delivery channels
- **SMS (Nepal): Sparrow SMS** — set `SPARROW_TOKEN` and `SPARROW_FROM`. See https://sparrowsms.com.
- **Email** — set `SMTP_HOST/PORT/USER/PASS` and `EMAIL_FROM` (any SMTP provider).
- **Viber / WhatsApp** — stubs in `lib/channels.js`; add your provider's API and a token.

If no channel is configured (local dev), the confirmation link is printed to the console so you can confirm manually.

## The alert engine
Runs automatically inside the server when `ALERT_POLL=true` (polls every `ALERT_POLL_SECONDS`).
Or run it from cron instead:
```bash
*/2 * * * *  cd /srv/eqsentry/server && npm run alerts:once >> /var/log/eqsentry-alerts.log 2>&1
```
Matching: an event alerts a subscriber when `magnitude ≥ their threshold` **and** the epicentre is within
`DEFAULT_RADIUS_KM` of their district centroid (`lib/districts.js`). Unknown districts fall back to
"anywhere in Nepal at/above threshold". De-duplication is per (event, subscriber).

## Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/api/health` | status + which channels are configured |
| GET  | `/api/usgs/:feed` | cached USGS GeoJSON proxy |
| POST | `/api/subscribe` | `{name,mobile,email,district,lang,threshold,consent}` → sends confirmation |
| GET  | `/api/confirm?token=` | confirm (double opt-in) |
| GET  | `/api/unsubscribe?token=` | one-click unsubscribe |

## Point the website at the API
In `assets/js/config.js` set `window.EQ_API` to your server's base URL (e.g. `https://api.eqsentry.com`).
If unset, the site falls back to calling USGS directly and storing alert sign-ups locally.

See `../DEPLOYMENT.md` for hosting, domain, HTTPS/CDN and cron setup.
