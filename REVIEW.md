# Interface and runtime review

Completed locally on 2026-10-27.

- Removed automatic object cards and the footer tracking row. Object facts and tracking actions are available only when the view-name button is expanded.
- Replaced symbol/emoji controls with local SVG stroke icons; accessible names, expanded state, category pressed state, focus styles, and keyboard actions are included.
- Consolidated the accumulated responsive CSS into one stylesheet. Mobile bars are compact, and the app follows the visual viewport so page zoom and keyboard resizing keep controls visible.
- Corrected camera button limits, top-view tracking state, multi-touch selection, fullscreen feature detection, panel exclusivity, About focus containment, and hidden-panel keyboard access.
- Retained true-scale local Earth/Moon radii, throttled reusable lunar orbit geometry, distance-aware asteroid sprites, and GPU orbital propagation.
- Added robust anomaly initialization for highly eccentric supported orbits, finite-data validation, date bounds, reduced DOM updates, hidden-page rendering skip, and WebGL interruption handling.
- No external fonts, icon runtime, orbital APIs, or network image dependencies remain at runtime. All assets and engine modules are bundled.

Validation: syntax checks passed for all authored JavaScript modules. All four Node regression tests passed: solver convergence; 14,999 finite bounded asteroid paths across three epochs; fast tracking and lunar-distance bounds at 10/100 days per second; required assets. Mobile browser checks verified selection with details collapsed, details expansion, search/Ryugu tracking, display panels, icon rendering, and visible-viewport containment. Final browser console reported no warnings/errors.

Limits: this is an approximate educational orbital model, not a precision ephemeris. Browser QA was performed in the available in-app mobile viewport; a separate physical iOS/Android and desktop browser matrix has not been run. GitHub backup and public GitHub Pages publication were authorized on 2026-10-28.

## Deeper reliability pass — 2026-10-28

Earth selection now sets one day per second and uses a slightly closer initial offset. Earth/Moon focus uses an eased logarithmic zoom instead of an abrupt camera jump, respects reduced-motion preference, and yields immediately to manual camera input. Camera damping is time-based, avoiding different settling behavior at different frame rates. Local physical sizes and overview markers blend continuously across the zoom threshold to avoid a size pop.

Label placement now prioritizes the tracked body, suppresses overlaps, keeps names inside the viewport, avoids visible UI panels, and offsets labels outside the projected globe. Label widths are measured at initialization; UI obstruction rectangles are cached. Projection uses the updated near plane before labels are placed. Tests cover deterministic placement, panel/edge avoidance, and multi-order camera transitions without overshoot.

Additional fixes: the sky follows the camera to remove background parallax when panning; camera minimum distances account for a tracked body's physical radius; stalled catalogue loading times out; surface texture failures fall back to solid materials; context loss suspends rendering until restoration; returning from a hidden page clears stale pointer state and frame timing.

Seven regression tests pass, including 1, 10, and 100 day/second tracking. Browser checks confirmed Earth selects one day per second, details stay collapsed, the closer framing settles, and no console warnings/errors were observed. The cross-device browser-matrix limit above still applies.

The close-view visual check also exposed distant Sun/sky depth artifacts. The renderer now uses logarithmic depth, including matching chunks in the custom asteroid shaders; the sky renders first without writing/testing depth. Rechecked the artifact-producing 2027-06-22 Earth close view: jagged Sun artifacts were absent and the GPU shader console was clean. This was verified visually rather than inferred from orbital unit tests.

## Safari glow review — 2026-10-29

Replaced the Canvas2D radial-gradient upload with an explicit neutral-RGB RGBA DataTexture. Alpha retains the original radial profile; filtering, mipmap behavior, color space, and alpha premultiplication are explicit. This removes the browser-dependent canvas conversion path implicated by the colored Sun speckles without changing browser privacy/security settings or adding user-agent detection.

Native macOS Safari verification: local catalogue loaded; Sun glow was clean at normal and enlarged zoom; selecting Earth set one day per second; Moon tracking and expandable details displayed the expected orbital values. Nine regression tests pass, including new deterministic/symmetric glow alpha and neutral-RGB checks. These tests do not replace a physical iOS or full GPU/browser matrix. A separate clean local port was used because the usual localhost preview origin had a service worker from an unrelated project.


## Panel and PWA release — 2026-10-29

Restored the original open Explore styling as the common panel language after design feedback. Controls and object details use the same light framing, restrained separators, consistent padding, and compact controls. Phone panels scroll within the visible viewport; the view label and camera toolbar no longer overlap open settings. The time bar is compact.

Immersive fullscreen hides every UI surface except a single exit button, attempts native fullscreen, and retains an in-page fallback where unsupported. Hidden surfaces are inert. Browser verification showed only the scene and exit action exposed in immersive mode; exiting restored normal controls.

Added a relative-scope manifest, safe-zone PNG icons, standalone metadata, explicit install affordance where supported, and a versioned service worker that precaches all 20 application files. Verified the opt-in update/reload flow. With network emulation offline, the app reloaded and the interface displayed all 14,999 asteroid orbits. Networking and viewport overrides were restored after testing. Physical OS installation and real iPhone/Android device tests remain outside this browser QA pass.

Twelve regression checks pass, including icon dimensions, offline navigation/module matching, precache file availability, cache cleanup isolation, and non-GET/cross-origin exclusion. The release check verifies the generated worker matches current source assets.
