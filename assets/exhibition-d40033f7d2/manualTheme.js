// Classify composition, independent of frame rate or pointer events.
// Hysteresis keeps the text from flickering near a framing boundary.
export function resolveManualTheme({ radius, targetY, elevation, azimuth }, previousShot) {
  if (radius >= (previousShot === 0 || previousShot === 4 ? 5.9 : 6.3)) return 0;
  if (targetY > (previousShot === 1 ? .72 : .85) || elevation > (previousShot === 1 ? .4 : .48)) return 1;
  if (Math.abs(Math.sin(azimuth)) > (previousShot === 3 ? .46 : .55)) return 3;
  return 2;
}
