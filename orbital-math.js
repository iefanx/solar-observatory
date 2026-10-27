const TAU = 2 * Math.PI;
const RAD = Math.PI / 180;

// Normalize before Newton iteration to avoid poor convergence near parabolic orbits.
export function eccentricAnomaly(mean, eccentricity) {
  const m = (((mean % TAU) + 3 * Math.PI) % TAU) - Math.PI;
  let e = m + 0.85 * eccentricity * (m < 0 ? -1 : 1);
  for (let k = 0; k < 12; k++) {
    e -=
      (e - eccentricity * Math.sin(e) - m) / (1 - eccentricity * Math.cos(e));
  }
  return e;
}

export function keplerPosition(body, julianDay, trueAnomaly) {
  const mean = body.ma * RAD + (TAU * (julianDay - body.epoch)) / body.per;
  const e = eccentricAnomaly(mean, body.e);
  const v =
    trueAnomaly ??
    2 *
      Math.atan2(
        Math.sqrt(1 + body.e) * Math.sin(e / 2),
        Math.sqrt(1 - body.e) * Math.cos(e / 2),
      );
  const r = (body.a * (1 - body.e * body.e)) / (1 + body.e * Math.cos(v));
  const node = body.om * RAD,
    w = body.w * RAD,
    i = body.i * RAD;
  const c = Math.cos(v + w),
    s = Math.sin(v + w);
  return [
    r * (Math.cos(node) * c - Math.sin(node) * s * Math.cos(i)),
    r * (Math.sin(node) * c + Math.cos(node) * s * Math.cos(i)),
    r * s * Math.sin(i),
  ];
}
