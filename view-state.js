const TAU = 2 * Math.PI;

// Interpolate zoom logarithmically: traversing many AU should not end in a snap.
export function cameraOffset(from, to, progress) {
  const t = Math.max(0, Math.min(1, progress));
  if (t === 0) return [...from];
  if (t === 1) return [...to];
  const eased = t * t * (3 - 2 * t);
  const a = Math.max(1e-9, Math.hypot(...from));
  const b = Math.max(1e-9, Math.hypot(...to));
  const azimuthA = Math.atan2(from[1], from[0]);
  const delta =
    ((Math.atan2(to[1], to[0]) - azimuthA + 3 * Math.PI) % TAU) - Math.PI;
  const azimuth = azimuthA + delta * eased;
  const polar =
    Math.acos(Math.max(-1, Math.min(1, from[2] / a))) * (1 - eased) +
    Math.acos(Math.max(-1, Math.min(1, to[2] / b))) * eased;
  const radius = Math.exp(Math.log(a) * (1 - eased) + Math.log(b) * eased);
  return [
    radius * Math.sin(polar) * Math.cos(azimuth),
    radius * Math.sin(polar) * Math.sin(azimuth),
    radius * Math.cos(polar),
  ];
}

export function overlaps(a, b, gap = 4) {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  );
}

// Deterministic priority ordering prevents labels from shuffling at tight zooms.
export function placeLabels(candidates, width, height, blockers = []) {
  const placed = [];
  for (const item of [...candidates].sort(
    (a, b) => b.priority - a.priority || a.order - b.order,
  )) {
    if (
      item.x < 8 ||
      item.y < 8 ||
      item.x + item.width > width - 8 ||
      item.y + item.height > height - 8
    )
      continue;
    if (
      blockers.some((box) => overlaps(item, box)) ||
      placed.some((box) => overlaps(item, box, 7))
    )
      continue;
    placed.push(item);
  }
  return placed;
}
