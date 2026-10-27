import { test } from "node:test";
import assert from "node:assert/strict";
import { cameraOffset, placeLabels } from "../dist/view-state.js";

test("focus camera crosses multiple orders of zoom without overshooting or degenerating", () => {
  for (const from of [
    [0, -7.5, 5.2],
    [0, 1, 0],
    [0, 0, 1],
  ]) {
    const to = [0, -0.00042, 0.000147];
    assert.deepEqual(cameraOffset(from, to, 0), from);
    assert.deepEqual(cameraOffset(from, to, 1), to);
    let previous = Math.hypot(...from);
    for (let step = 1; step <= 120; step++) {
      const offset = cameraOffset(from, to, step / 120),
        distance = Math.hypot(...offset);
      assert.ok(offset.every(Number.isFinite));
      assert.ok(distance <= previous + 1e-12);
      assert.ok(distance >= Math.hypot(...to) - 1e-12);
      previous = distance;
    }
  }
});
test("labels prioritize the selected object and avoid panels and viewport edges", () => {
  const candidates = [
    {
      id: "Mars",
      x: 100,
      y: 100,
      width: 45,
      height: 13,
      priority: 10,
      order: 0,
    },
    {
      id: "Earth",
      x: 102,
      y: 101,
      width: 48,
      height: 13,
      priority: 100,
      order: 1,
    },
    {
      id: "Moon",
      x: 170,
      y: 130,
      width: 44,
      height: 13,
      priority: 50,
      order: 2,
    },
    {
      id: "edge",
      x: 390,
      y: 100,
      width: 40,
      height: 13,
      priority: 10,
      order: 3,
    },
    {
      id: "behind-panel",
      x: 20,
      y: 50,
      width: 60,
      height: 13,
      priority: 10,
      order: 4,
    },
  ];
  const before = structuredClone(candidates);
  const result = placeLabels(candidates, 400, 700, [
    { x: 0, y: 0, width: 90, height: 90 },
  ]);
  assert.deepEqual(
    result.map((x) => x.id),
    ["Earth", "Moon"],
  );
  assert.deepEqual(candidates, before);
  assert.deepEqual(
    placeLabels(candidates, 400, 700, [{ x: 0, y: 0, width: 90, height: 90 }]),
    result,
  );
});
test("equal-priority label placements stay deterministic when the input order changes", () => {
  const candidates = [
    { id: "a", x: 100, y: 100, width: 40, height: 13, priority: 10, order: 0 },
    { id: "b", x: 105, y: 100, width: 40, height: 13, priority: 10, order: 1 },
  ];
  assert.deepEqual(
    placeLabels([...candidates].reverse(), 400, 700).map((x) => x.id),
    ["a"],
  );
});
