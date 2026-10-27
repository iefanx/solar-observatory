# Solar Observatory

An interactive 3D solar system, built from scratch with Three.js and a custom GPU Kepler solver, inspired by [Asterank](https://www.asterank.com/3d/).

**Live website:** https://iefanx.github.io/solar-observatory/

## Explore

- Eight planets, a textured Earth and Moon, and 14,999 real asteroid orbits.
- Search, object tracking, expandable orbital details, and an Earth–Moon overview.
- Date and playback controls, adjustable asteroid glow, orbit and sky toggles.
- Touch orbit, pinch zoom, pan, compact mobile controls, and local SVG icons.
- Earth selection uses a closer, eased focus and sets playback to one day per second.
- Collision-aware labels, distance-aware particles, logarithmic depth, and physical radii in local Earth–Moon views.

## Run locally

Requirements: Python 3 for the preview server; Node.js 22 or newer for checks/tests. No package installation or build is needed.

```sh
npm run dev
# Open http://localhost:5173

npm run check
npm test
```

The complete static website is in `dist/`. Rendering modules, data, textures, and icons are bundled locally. No API key or live orbital API is required.

## Deployment

GitHub Actions runs syntax checks and regression tests on pushes and pull requests to `main`. Successful pushes to `main` publish `dist/` to GitHub Pages. The workflow can also be run manually. Only `dist/` is published; tests and research notes remain in the repository.

## Data and accuracy

The asteroid catalogue was downloaded from Asterank on 2026-10-27 using `/api/rankings?sort_by=score&limit=15000&orbits_only=true`. One unsupported non-elliptical record is excluded. Planet orbits use approximate fixed J2000 elements. Lunar offsets are computed locally with Astronomy Engine and transformed to the J2000 ecliptic frame before adding the approximate Earth position.

This is an educational visualization, not a precision navigation ephemeris. Two-body propagation omits gravitational perturbations. The historical asteroid snapshot is not a current precision solution. Overview sizes and glow are enlarged/artistic rather than calibrated apparent magnitude. Local Earth–Moon views use physical radii. Earth spin uses an approximate sidereal day; Moon orientation approximates synchronous rotation without a complete libration/pole model. Slow playback is best for viewing surface rotation.

## Attribution

- [Three.js](https://github.com/mrdoob/three.js), including OrbitControls, version 0.170.0, MIT. License: `dist/vendor/LICENSE-three.txt`.
- [Astronomy Engine](https://github.com/cosinekitty/astronomy), Don Cross, version 2.1.19, MIT. License: `dist/vendor/LICENSE-astronomy.txt`.
- [Asterank](https://github.com/typpo/asterank), Ian Webster, MIT. Reference implementation research is in `research/`; notices are retained there and in `dist/assets/LICENSE-asterank.txt`.
- Milky Way panorama and Earth texture: bundled from Asterank's `eso_dark.jpg` and `texture-earth.jpg`; the panorama is identified as ESO imagery by the reference project.
- Moon surface map: [Three.js example texture](https://threejs.org/examples/textures/planets/moon_1024.jpg).
- Original Asterank asteroid sprite retained as a reference asset; the active renderer uses custom Gaussian sprites.

See [REVIEW.md](REVIEW.md) for verification details and remaining cross-device testing limits.
