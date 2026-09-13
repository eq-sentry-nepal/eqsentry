# Safety illustrations

The six carousels on `preparedness.html`, `aftermath.html`, and `building.html`
use 36 original illustrations across 38 cards. First aid and stairs evacuation
are shared between pages. Every card has a local image in `assets/img/safety/`.

The three Drop, Cover, Hold On cards on both the homepage and preparedness page
also use matching illustrations. The Drop and Cover poses were made from the
existing Hold On illustration to keep the person, clothing, table, and palette
consistent. The shared Hold On image is `dropcover.webp`; the other steps are
`drop.webp` and `cover.webp`. This brings the set to 38 images across 44 placements.

## Design and language

Artwork follows the site's charcoal, slate, and vermilion palette. Text stays in
the existing HTML translations instead of being embedded into an image, so the
same picture works in English and Nepali. The adjacent caption describes the
image; empty image alt text avoids reading that description twice.

Image panels preserve a 16:9 ratio and contain the entire illustration at every
breakpoint. Carousel images retain their original themed pictograms underneath
as a loading and network-failure fallback. Step numbers follow the selected language.

The before-earthquake utility and building-inspection images now match their
captions (previously represented by a clock and a document).

## Files and delivery

- Production images: `assets/img/safety/*.webp`, 768 × 432, WebP quality 84.
- Generation method: built-in image generation, one image per subject.
- Shared direction: `docs/image-art-direction.txt`.
- Exact prompts: `docs/image-prompts-building.json`,
  `docs/image-prompts-response.json`, `docs/image-prompts-preparation.json`.
- Targeted image corrections: `docs/image-prompts-response-edits.json`.
- Drop and Cover pose prompts: `docs/image-prompts-dch.json`.
- Full-resolution local originals: `output/image-sources/` (not deployed).

All safety illustrations are in the service-worker shell, including cards a
visitor has not scrolled to. This makes them available after the site's offline
cache has finished installing. The cache version changes with this release.
The production build copies the optimized images with the rest of `assets/`.

## Content reference

Illustrations support the site's existing safety captions. Protective postures
were checked against [CDC guidance during an earthquake](https://www.cdc.gov/earthquakes/safety/stay-safe-during-an-earthquake.html)
and [CDC guidance after an earthquake](https://www.cdc.gov/earthquakes/safety/stay-safe-after-an-earthquake.html).
Building drawings illustrate concepts and warning signs; they are not measured
construction plans or certifications of safety.

## Validation

`npm test` checks that each carousel has one image per English and Nepali card,
that every image path exists, and that every illustration is in the offline
shell. Run the smoke check against `dist` after building as well.
