# Integrating official NEMRC / seismonepal.gov.np data — feasibility notes

**Goal:** show Nepal's official National Earthquake Monitoring & Research Center
events alongside USGS/EMSC.

## Findings
- NEMRC publishes recent events on seismonepal.gov.np as an HTML table; there is
  **no documented public JSON/GeoJSON API or CORS headers**, so the browser cannot
  fetch it directly.
- Options, in order of preference:
  1. **Ask for access** — email NEMRC requesting a machine-readable feed or
     permission to mirror; a public-safety, credited, non-commercial use case.
  2. **Server-side mirror** — a scheduled job in `server/` (or a GitHub Action)
     that parses the public table into `data/nemrc.json` with attribution, rate
     limited (e.g. every 15 min), with a kill switch. Legally: public factual data,
     but honour any robots/ToS signals and stop on request.
  3. Do nothing until (1) answers — current USGS+EMSC coverage already includes
     all M4.5+ regional events.

## If/when a feed exists
- Add a third source toggle on map.html ("NEMRC") mirroring the EMSC parser shape
  (id, mag, place, time, lat, lon, depth, source: "NEMRC").
- Magnitudes are local (ML) vs USGS Mw — label the scale, don't mix in stats.
- Update about.html data-credits and the status page checks.
