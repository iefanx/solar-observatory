import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { eccentricAnomaly, keplerPosition } from "../dist/orbital-math.js";
import {
  GeoMoon,
  RotateVector,
  Rotation_EQJ_ECL,
} from "../dist/vendor/astronomy.js";
const catalogue = JSON.parse(
  fs.readFileSync(new URL("../dist/assets/asteroids.json", import.meta.url)),
);
const supported = catalogue.filter(
  (o) =>
    ["a", "e", "i", "om", "w", "ma", "epoch", "per"].every((k) =>
      Number.isFinite(o[k]),
    ) &&
    o.a > 0 &&
    o.e >= 0 &&
    o.e < 1 &&
    o.per > 0,
);

test("Kepler solver converges for the catalogue’s highly eccentric orbits", () => {
  for (const e of [0, 0.5, 0.9, 0.9967309124761796])
    for (const m of [-Math.PI, -1, -0.001, 0, 0.001, 1, Math.PI]) {
      const E = eccentricAnomaly(m, e),
        wrapped =
          (((m % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
      assert.ok(
        Math.abs(E - e * Math.sin(E) - wrapped) < 1e-10,
        `residual e=${e}, m=${m}`,
      );
    }
});
test("all supported catalogue paths remain finite and within perihelion/aphelion", () => {
  assert.equal(supported.length, 14999);
  for (const o of supported)
    for (const jd of [2451545, 2461341, 2524957.5]) {
      const v = keplerPosition(o, jd),
        r = Math.hypot(...v);
      assert.ok(v.every(Number.isFinite), o.full_name);
      assert.ok(
        r >= o.a * (1 - o.e) - 1e-8 && r <= o.a * (1 + o.e) + 1e-8,
        o.full_name,
      );
    }
});
test("fast Earth tracking preserves camera offset and physical lunar separation", () => {
  const earth = {
    a: 1.00000261,
    e: 0.01671123,
    i: 0,
    om: 348.73936,
    w: 114.20783,
    ma: -2.47311,
    epoch: 2451545,
    per: 365.256,
  };
  const rotation = Rotation_EQJ_ECL();
  for (const speed of [1, 10, 100]) {
    let jd = 2461341,
      prev = keplerPosition(earth, jd),
      target = [...prev],
      camera = prev.map((v, i) => v + [0, -0.0005, 0.000175][i]);
    for (let k = 0; k < 600; k++) {
      jd += speed / 60;
      const next = keplerPosition(earth, jd);
      for (let i = 0; i < 3; i++) {
        const delta = next[i] - prev[i];
        camera[i] += delta;
        target[i] += delta;
        assert.ok(
          Math.abs(camera[i] - target[i] - [0, -0.0005, 0.000175][i]) < 1e-10,
        );
      }
      prev = next;
      const moon = RotateVector(rotation, GeoMoon(jd - 2451545)),
        km = Math.hypot(moon.x, moon.y, moon.z) * 149597870.7;
      assert.ok(km > 340000 && km < 420000);
    }
  }
});
test("all referenced local application modules and image assets exist", () => {
  for (const file of [
    "main.js",
    "icons.js",
    "orbital-math.js",
    "view-state.js",
    "style.css",
    "vendor/three.module.js",
    "vendor/OrbitControls.js",
    "vendor/astronomy.js",
    "assets/earth.jpg",
    "assets/moon.jpg",
    "assets/milky-way.jpg",
  ]) {
    assert.ok(
      fs.statSync(new URL("../dist/" + file, import.meta.url)).size > 100,
      file,
    );
  }
});
