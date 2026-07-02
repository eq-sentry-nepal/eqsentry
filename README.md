# EQ Sentry — eqsentry.com

A bilingual (नेपाली / English) earthquake monitoring and preparedness website for Nepal.
Dark, instrument-style design with live data, an interactive map, preparedness guidance,
an alert sign-up and local emergency resources.

## Pages
| File | Purpose |
|------|---------|
| `index.html` | Home — live readout, features, historic record, Drop-Cover-Hold |
| `map.html` | Interactive map: **Live** USGS feed · **Catalogue** (811 events, 1911–2026) · **Notable** historic quakes · heatmap + plate-boundary layers |
| `insights.html` | Interactive data: charts (per year / magnitude / depth), a magnitude explorer slider, and an animated quake "time-machine" |
| `preparedness.html` | Before / during / after, emergency-kit checklist, family plan, **readiness self-assessment quiz** |
| `resources.html` | Nepal emergency numbers, official agencies, hospitals |
| `alerts.html` | Alert registration form |
| `about.html` | Mission, data sources, disclaimer, contact |

## Structure
```
index.html, map.html, preparedness.html, resources.html, alerts.html, about.html
assets/css/style.css        — "Dark Seismograph" design system
assets/js/i18n.js           — bilingual engine, header/footer, live banner, motion
assets/js/map.js            — Leaflet map + 3 data sources
data/
  nepal_earthquakes.geojson — 811 M4.5+ events, Nepal region, 1911–2026 (USGS)
  nepal_earthquakes.csv     — same, spreadsheet-friendly
  notable_earthquakes.geojson — 8 curated historic majors (1934–2025)
  summary.json              — small stats file used by the home page
  README.md                 — data documentation
```

## Running it
Because the pages fetch data (USGS + local `data/` files), open the site over **HTTP**, not `file://`.

```bash
# from this folder
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Testing & automation
- `npm test` runs `scripts/smoke-test.mjs` — zero-dependency checks: JS syntax, per-page
  i18n JSON validity + en/ne parity, broken internal links, sitemap coverage,
  service-worker shell integrity, and data-file consistency. Runs on every push
  via GitHub Actions (`.github/workflows/ci.yml`).
- `npm run update-data` refreshes the USGS catalogue and re-runs the smoke test.
  A weekly GitHub Action (`.github/workflows/update-catalog.yml`) does this automatically
  and commits the result.
- Visible catalogue figures (count, year range) are data-driven: i18n strings embed
  `{count|811}`-style tokens that resolve from `data/summary.json` at runtime.
- Client-side errors are captured by `assets/js/monitor.js` (inspect with
  `EQ_MONITOR.dump()` in the console; reported to the backend when `EQ_API` is set).
- Security: the CSP (`_headers`) forbids inline scripts — page translations live in
  non-executable JSON blocks and all logic is in external files under `assets/js/`.

## Deploying to eqsentry.com
It's a fully static site — upload the whole folder to any static host
(Netlify, Vercel, GitHub Pages, Cloudflare Pages, or any web server) and point
`eqsentry.com` at it. No build step or backend required.

## Language
Click the globe toggle (top right) to switch नेपाली / English. The choice is
remembered in the browser. Default is English.

## Alerts (note)
The sign-up form currently stores entries in the visitor's browser as a demonstration.
To send real SMS/email alerts, connect the form to a delivery service
(e.g. a form/email service or a small backend) — wire it in `alerts.html`.

## Data & credits
- Live and historical earthquake data: **USGS Earthquake Hazards Program**.
- Official Nepal seismicity: **National Earthquake Monitoring & Research Center** (seismonepal.gov.np).
- Map tiles: OpenStreetMap / CARTO. Map library: Leaflet.

## Disclaimer
EQ Sentry is an **informational** service, not an official warning authority, and it
**does not predict earthquakes**. The map shows events that have already been recorded.
In an emergency, follow Nepal's official agencies and call the emergency numbers.

A public-safety initiative by Prashant Acharya — [prashantacharya.com](https://prashantacharya.com).
