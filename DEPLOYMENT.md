# Deploying EQ Sentry to eqsentry.com

EQ Sentry has two parts:

1. **The website** — a static site (this folder, minus `server/`). Works on its own: live map, insights, preparedness, resources, PWA/offline. Alert sign-ups fall back to the browser.
2. **The backend** (`server/`) — optional, but required for **real alerts** (SMS/email), the **automated alert engine**, and the **cached USGS proxy**.

You can ship (1) today and add (2) when you're ready.

---

## Option A — Static site only (fastest)

Deploy this folder to any static host; all give you HTTPS + a global CDN automatically:

- **Netlify / Vercel / Cloudflare Pages** — drag-and-drop the folder, or connect a Git repo. A `netlify.toml` is included.
- **GitHub Pages** — push the folder to a repo and enable Pages.
- **Any web server (nginx/Apache)** — copy the files to the web root.

Then point the domain:

1. In your host, add the custom domain `eqsentry.com` (and `www`).
2. At your DNS provider, add the records the host shows you (usually a `CNAME` for `www` and an `A`/`ALIAS` for the apex). 
3. Enable the host's free TLS certificate. Done — HTTPS + CDN are handled for you.

> Tip: put **Cloudflare** in front for an extra CDN/caching layer. Cache static assets aggressively, but **bypass cache for `/api/*`**.

---

## Option B — Add the backend (real alerts)

Deploy `server/` to a small Node host: **Render, Railway, Fly.io, or a VPS**. A `server/Dockerfile` is included.

```bash
cd server
cp .env.example .env      # fill in Sparrow SMS / SMTP / region values
npm install
npm start                 # serves API (and can serve the website too)
```

Then connect the website to it:

- Put the API behind `https://api.eqsentry.com` (subdomain → your Node host).
- Edit **`assets/js/config.js`** and set `window.EQ_API = "https://api.eqsentry.com";`
- Set `ALLOW_ORIGIN=https://eqsentry.com` in the server `.env`.

Now alert sign-ups go through double opt-in and the map/banner use the cached proxy.

### Delivery providers
- **SMS (Nepal):** create a Sparrow SMS account, set `SPARROW_TOKEN` + `SPARROW_FROM`.
- **Email:** any SMTP provider → `SMTP_*` + `EMAIL_FROM`.
- **Viber/WhatsApp:** stubs in `server/lib/channels.js` — add your provider.

### Scheduled jobs (cron)
The alert engine can run inside the server (`ALERT_POLL=true`) or via cron:
```cron
# poll USGS and send alerts every 2 minutes
*/2 * * * *  cd /srv/eqsentry/server && npm run alerts:once >> /var/log/eqsentry-alerts.log 2>&1

# refresh the stored catalogue + insights data daily at 03:15
15 3 * * *   cd /srv/eqsentry && node scripts/update-catalog.mjs >> /var/log/eqsentry-catalog.log 2>&1
```

---

## PWA / offline
Served over HTTPS, the site is installable (Add to Home Screen) and the service worker
keeps the preparedness guide and emergency numbers available offline — important right
after a quake. No setup needed beyond HTTPS.

## Optional: district boundaries
The map will draw a district layer if you drop a `data/nepal_districts.geojson`
(polygon GeoJSON) into the folder and regenerate `assets/js/data-layers.js` with
`node scripts/update-catalog.mjs`. (Full district polygons are large, so they aren't bundled by default.)

## Go-live checklist
- [ ] Deploy static site, add `eqsentry.com`, enable HTTPS.
- [ ] (Optional) Deploy `server/`, set `.env`, point `api.eqsentry.com`.
- [ ] Set `window.EQ_API` in `assets/js/config.js`.
- [ ] Configure Sparrow SMS and/or SMTP; send yourself a test confirmation.
- [ ] Add the two cron jobs.
- [ ] Submit `sitemap.xml` in Google Search Console.
- [ ] Test the PWA install + offline on a phone.
