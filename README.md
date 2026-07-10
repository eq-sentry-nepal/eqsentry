# EQ Sentry — Nepal earthquake monitoring & preparedness

A bilingual (नेपाली / English) earthquake monitoring and preparedness site for Nepal.
Live data, an interactive map with P/S-wave simulation, historical analytics back to 1911,
step-by-step preparedness guides, printable bilingual kits, and local emergency resources.

**Live:** https://eq-sentry-nepal.github.io/eqsentry/ — deployed automatically from `main`
by `.github/workflows/pages.yml`.

## Highlights
- **Live map** (`map.html`) — USGS + EMSC feeds, 1911–present catalogue, notable historic
  quakes, heatmap/plate layers, wave-arrival HUD, deep links (`#eq=<id>`), new-quake sound alert.
- **Insights** (`insights.html`) — charts, records, magnitude explorer, time machine, energy compare.
- **Preparedness** (`preparedness.html`, `building.html`, `aftermath.html`, drill mode,
  hazard hunt, readiness quiz) — illustrated, fully bilingual.
- **Family plan** (`plan.html`) — complete household plan saved privately on-device,
  wallet card + printable PDF kits (`assets/downloads/`, regenerable via `scripts/generate-kits.py`).
- **Emergency resources** (`resources.html`) — every national number, searchable
  hospital/embassy directory.
- **Status** (`status.html`) — real uptime checks with hour/day/month bars and admin history.
- PWA: offline fallback page, cache-first shell (`service-worker.js`).

## Language & localisation
The globe toggle switches नेपाली / English (remembered; `?lang=ne` URLs shareable).
Everything localises — UI, tooltips, dates (with graceful fallback when the browser lacks
the `ne` ICU locale), Devanagari numerals, feed place names, Bikram Sambat years.

## Running locally
```bash
python3 -m http.server 8080   # from this folder → http://localhost:8080
```
Pages fetch data files, so use HTTP, not `file://`.

## Configuration
`assets/js/config.js` — optional backend URL (`EQ_API`) and privacy-friendly analytics
(Plausible or GoatCounter; off by default). The optional Node backend in `server/`
adds push/SMS alerts, felt reports and server-side status history (see `server/.env.example`).

## Testing & automation
- `npm test` — zero-dependency smoke test: JS syntax, i18n JSON validity + en/ne parity,
  broken links, sitemap coverage, SW shell integrity, version sync, data consistency.
  Runs on every push (`.github/workflows/ci.yml`).
- `npm run update-data` — refreshes the USGS catalogue; a weekly Action
  (`.github/workflows/update-catalog.yml`) does this and commits the result.

## Data & credits
Live/historical data: **USGS Earthquake Hazards Program**; **EMSC**. Official Nepal
seismicity: **NEMRC** (seismonepal.gov.np). Tiles: OpenStreetMap / CARTO. Maps: Leaflet.

## Disclaimer
EQ Sentry is an **informational** service, not an official warning authority, and it
**does not predict earthquakes**. In an emergency follow Nepal's official agencies —
Police **100**, Ambulance **102**, NEOC **1149**.

A public-safety initiative by Prashant Acharya — [prashantacharya.com](https://prashantacharya.com).
