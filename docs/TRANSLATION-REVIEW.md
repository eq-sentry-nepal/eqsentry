# नेपाली अनुवाद समीक्षा — Translation Review Checklist

The Nepali copy across EQ Sentry was written carefully by the development process,
but a **native-speaker review is strongly recommended before wide promotion** —
this is a public-safety site and wording carries weight.

## How to review
Open the live site, switch to नेपाली (globe toggle), and walk each page below.
Log corrections as GitHub issues (one per page) or edit the `"ne"` block inside each
page's `<script id="page-i18n">` and the core dictionary in `assets/js/i18n.js`.

## Review priorities (highest first)
1. **Safety instructions** — preparedness, aftermath, building, drill wording:
   must be unambiguous, action-first, commonly-understood terms.
2. **Emergency numbers & directory labels** — resources, offline page.
3. **Family/school plan field labels** — plan.html, school-plan.html.
4. **Alert copy** — alerts.html + SMS templates in `server/lib/alertEngine.js`.
5. Kits (PDF) — regenerate with `python3 scripts/generate-kits.py` after edits.
6. Everything else (about, insights, glossary, status).

## Style questions for the reviewer
- देवनागरी अङ्क सर्वत्र प्रयोग भएको छ — ठीक छ कि अरबी अङ्क राम्रो?
- "भूकम्प सूचना" vs "चेतावनी" — we deliberately avoid "चेतावनी" (warning) because
  the site does not predict; confirm this reads honestly, not weakly.
- Technical loans (म्याग्निच्युड, ड्रिल, किट) vs pure Nepali — current copy mixes
  pragmatically; flag anywhere it feels stiff.
- Honorific level is uniform (तपाईं + नुहोस्); flag any slips.

## Known approximations
- Bikram Sambat years are year-level (Baisakh-1 boundary approximated Apr 13/14);
  dates within a day of नयाँ वर्ष may show ±1 year. A verified BS table would fix this.
- USGS place names: pattern + known names are translated; unknown villages stay Latin.
