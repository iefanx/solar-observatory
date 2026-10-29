// Numeric RGBA avoids browser-dependent Canvas2D color/alpha conversion on upload.
export function glowPixels(size = 128) {
  if (!Number.isInteger(size) || size < 2 || size > 1024)
    throw new RangeError("Invalid glow size");
  const pixels = new Uint8Array(size * size * 4);
  const stops = [
    [0, 255],
    [0.06, 255],
    [0.16, 174],
    [0.35, 37],
    [1, 0],
  ];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const radius = Math.min(
        1,
        Math.hypot(
          (x + 0.5 - size / 2) / (size / 2),
          (y + 0.5 - size / 2) / (size / 2),
        ),
      );
      const index = stops.findIndex((stop) => stop[0] >= radius);
      const hi = stops[index],
        lo = stops[Math.max(0, index - 1)];
      const t = hi[0] === lo[0] ? 0 : (radius - lo[0]) / (hi[0] - lo[0]);
      const i = (y * size + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
      pixels[i + 3] = Math.round(lo[1] + (hi[1] - lo[1]) * t);
    }
  return pixels;
}
