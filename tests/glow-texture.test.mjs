import { test } from "node:test";
import assert from "node:assert/strict";
import { glowPixels } from "../dist/glow-texture.js";
test("glow has neutral RGB and deterministic, symmetric alpha without Canvas2D", () => {
  const size = 128,
    p = glowPixels(size);
  assert.deepEqual(p, glowPixels(size));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      assert.deepEqual([...p.slice(i, i + 3)], [255, 255, 255]);
      assert.equal(p[i + 3], p[(y * size + (size - 1 - x)) * 4 + 3]);
    }
  assert.equal(p[3], 0);
  assert.equal(p[(64 * size + 64) * 4 + 3], 255);
  let previous = 255;
  for (let x = 64; x < size; x++) {
    const alpha = p[(64 * size + x) * 4 + 3];
    assert.ok(alpha <= previous);
    previous = alpha;
  }
});
test("invalid texture allocations are rejected", () => {
  for (const size of [0, 1, 1.5, 2048])
    assert.throws(() => glowPixels(size), RangeError);
});
