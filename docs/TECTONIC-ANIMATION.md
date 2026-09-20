# Gorkha earthquake animation

The homepage and About page share `assets/js/tectonics-model.js`, `assets/js/tectonics.js` and `assets/css/tectonics.css`. Their inline SVG diagrams are identical; update both copies together. No rendering libraries, network requests or image assets are needed. The assets are included in the service-worker shell.

Six stages show convergence, locking, elastic strain, sudden thrust slip, rupture and shaking, and aftermath. A south–north cross-section shows the gently north-dipping Main Himalayan Thrust; a separate north-up plan view shows mainly eastward rupture. The unbroken surface and dashed shallow locked fault distinguish the 2015 buried rupture from a surface break. Upper-crust terrain is static to avoid suggesting uniform uplift of the Himalaya.

A magnified mechanical view animates material grids, rock features and paired contact markers. During loading both sides share one displacement at the locked contact, while displacement changes with distance from the fault. During rupture a tapered finite patch develops a tangential displacement jump: upper rock moves south/up relative to lower rock. Markers outside the slipped patch remain joined. Static fills preserve contact while the material grid deforms inside a fixed viewing frame. Hollow markers retain original positions. Drawing units are exaggerated and have no conversion to real displacement or stress. `scripts/test-tectonics.mjs` checks locking, deformation, slip direction, finite extent and residual strain.

The illustration simplifies geometry, deformation and timing. Map ridges, positions and footprint are approximate. Pale rings represent a seismic wave train rather than calibrated wave arrival times. They begin during rupture and travel faster than the orange rupture front. No point on this illustration predicts a future earthquake.

## Sources

- [USGS / McNamara et al. (2017), source modeling](https://www.usgs.gov/publications/source-modeling-2015-mw-78-nepal-gorkha-earthquake-sequence-implications-geodynamics): 25 April 2015, Mw 7.8, a buried MHT patch approximately 150 × 60 km, with the shallow portion south of Kathmandu unruptured. We use only the rounded along-strike length because estimates differ between models.
- [USGS synthesis](https://www.usgs.gov/programs/earthquake-hazards/science/m78-nepal-earthquake-2015-a-small-push-mt-everest): rupture propagated mainly east toward Kathmandu; mainshock slip did not reach the surface.
- [Hubbard et al. (2016)](https://doi.org/10.1130/G38077.1): ramp-flat fault geometry and structural controls on rupture.
- [Ader et al. (2012)](https://doi.org/10.1029/2011JB009071): roughly 18–20 mm/year of horizontal India–South Tibet convergence. This is not a rate of vertical mountain growth; the homepage prose has been corrected accordingly.
- [NASA deformation observations](https://science.nasa.gov/photojournal/radar-shows-kathmandu-area-uplifted-5-feet-by-gorkha-nepal-earthquake/): spatially variable ground deformation, which must not be illustrated as uniform uplift.

## Interaction and accessibility

The 50.5-second sequence plays once when first visible, then holds. Pause/continue, replay, previous/next, playback speed and a keyboard-accessible scrubber are available. Selecting any numbered stage pauses on an illustrative snapshot. Animation suspends when the figure leaves the viewport or the document is hidden. Years of loading and seconds of rupture deliberately use different presentation time scales.

Reduced-motion mode provides static stages and a Next stage button, honoring the site's saved preference. All labels, descriptions and controls have English and Nepali copies. Manual stage changes are announced in a polite status region; automatic stage changes do not interrupt screen-reader users. Native buttons support keyboard control. On phones the diagrams stack and secondary cross-section labels are suppressed to keep the essential labels readable.
