# EQ Sentry — Nepal earthquake data

This folder holds the earthquake datasets used by the website's map.

## Files

### `nepal_earthquakes.geojson`
The main catalog: **811 significant earthquakes (magnitude 4.5+)** recorded in the
Nepal region (latitude 26–31° N, longitude 79–89° E) from **1911 to 2026**, including
the 1934 M8.0 Bihar–Nepal event, the complete 2015 Gorkha–Dolakha sequence and the
2025 M7.1 Dingri event. Early-era (pre-1970s) entries come from USGS's ISC-GEM
integration and are sparser than the modern instrumental record.

- **Source:** USGS Earthquake Hazards Program (FDSN event API).
- **Format:** standard GeoJSON `FeatureCollection`. Each feature has
  `coordinates: [lon, lat, depth_km]` and properties `id, mag, magType, place, time` (epoch ms), `depth`, `url`.
- A flattened `nepal_earthquakes.csv` is included for spreadsheets.

### `notable_earthquakes.geojson`
A curated set of **8 historically major earthquakes affecting Nepal (1934–2025)** with
human-impact details (`name_en/ne`, `date`, `mag`, `deaths`, `summary_en/ne`). These
provide historical context, including events that predate the instrumental catalog above.
Magnitude and casualty figures are widely reported estimates and may vary by source.

### `tectonic_plate_boundaries.geojson`
A generalized trace of the **India–Eurasia / India–Sunda plate boundary** near Nepal —
the Himalayan front plus the eastern (Indo-Burman) and western (Chaman) syntaxes. Used by
the map's "Plate boundaries" layer. Simplified for web use, based on the Bird (2003) PB2002
model; not survey-grade. (The full global PB2002 dataset is too large to bundle here.)

### `summary.json`
Small stats file (`count`, `maxMag`, `since`, …) read by the home page so it can show
record figures without loading the full catalogue.

## How the map uses this data
The live map (`map.html`) plots:
- **Live** earthquakes (fetched in real time from USGS), and
- the **stored catalog** and **notable events** above, selectable from the data-source control.

## Updating the catalog
Run `node scripts/update-catalog.mjs` from the project root — it re-queries USGS
(since 1900, M4.5+, Nepal bounding box), refuses to shrink the catalogue on a bad
response, and regenerates the CSV, `summary.json` and `assets/js/data-layers.js`.
Equivalent raw query:
`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=1900-01-01&minmagnitude=4.5&minlatitude=26&maxlatitude=31&minlongitude=79&maxlongitude=89`
